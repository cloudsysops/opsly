"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { useCallback, useEffect, useState, useRef } from "react";
import { WikiLinkPicker } from "./WikiLinkPicker";
import { ResizableImage } from "./ResizableImage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  editorRef?: React.MutableRefObject<Editor | null>;
  disableDefaultHeading?: boolean;
  customExtensions?: AnyExtension[];
}

// ---------------------------------------------------------------------------
// Color presets
// ---------------------------------------------------------------------------

const TEXT_COLORS = [
  { name: "Default", color: "" },
  { name: "Navy", color: "#2D2F8E" },
  { name: "Purple", color: "#6A469D" },
  { name: "Red", color: "#DC2626" },
  { name: "Green", color: "#059669" },
  { name: "Orange", color: "#F79A30" },
  { name: "Blue", color: "#2563EB" },
  { name: "Gray", color: "#6B7280" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", color: "" },
  { name: "Yellow", color: "#FEF08A" },
  { name: "Green", color: "#BBF7D0" },
  { name: "Blue", color: "#BFDBFE" },
  { name: "Pink", color: "#FBCFE8" },
  { name: "Orange", color: "#FED7AA" },
];

// ---------------------------------------------------------------------------
// Extended Link mark that preserves wiki link attributes
// ---------------------------------------------------------------------------

const WikiLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-wiki-id": {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-wiki-id"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes["data-wiki-id"]) return {};
          return { "data-wiki-id": attributes["data-wiki-id"] };
        },
      },
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("class"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TipTapEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className = "",
  minHeight = "150px",
  editorRef,
  disableDefaultHeading = false,
  customExtensions = [],
}: TipTapEditorProps) {
  const [openDropdown, setOpenDropdown] = useState<
    "text-color" | "highlight" | "table-menu" | "media" | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);

  // Upload image to S3 and insert into editor
  async function uploadImageFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Upload failed:", data.error || "Unknown error");
        return;
      }
      const { url } = await res.json();
      const ed = editorInstanceRef.current;
      if (ed) {
        ed.chain().focus().setResizableImage({ src: url }).run();
      }
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  const uploadImageFileRef = useRef(uploadImageFile);
  uploadImageFileRef.current = uploadImageFile;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: disableDefaultHeading ? false : { levels: [2, 3] },
      }),
      WikiLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-cyan underline",
        },
      }),
      ResizableImage,
      Youtube.configure({
        HTMLAttributes: {
          class: "rounded-lg overflow-hidden",
        },
        width: 640,
        height: 360,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-slate-300",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-sm",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-slate-300 px-3 py-2 text-sm",
        },
      }),
      ...customExtensions,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${className}`,
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;
        const file = event.dataTransfer.files[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        uploadImageFileRef.current(file);
        return true;
      },
      // Strip leading empty paragraphs from pasted content so paste
      // doesn't leave a blank row above the pasted text.
      transformPastedHTML(html) {
        return html.replace(/^(<p><\/p>\s*)+/i, "");
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) uploadImageFileRef.current(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Expose editor instance to parent and local ref
  useEffect(() => {
    editorInstanceRef.current = editor;
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Update content when prop changes (but not on every keystroke)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = () => setOpenDropdown(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openDropdown]);

  // Wiki link picker
  const [wikiLinkPickerOpen, setWikiLinkPickerOpen] = useState(false);

  // URL modal for links / images / videos
  const [urlModal, setUrlModal] = useState<{
    isOpen: boolean;
    type: "link" | "image" | "video";
    defaultValue: string;
  }>({ isOpen: false, type: "link", defaultValue: "" });
  const [urlInput, setUrlInput] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlModal.isOpen) {
      setUrlInput(urlModal.defaultValue);
      setTimeout(() => urlInputRef.current?.focus(), 0);
    }
  }, [urlModal.isOpen, urlModal.defaultValue]);

  const handleUrlSubmit = useCallback(() => {
    if (!editor) return;
    if (urlModal.type === "link") {
      if (urlInput === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: urlInput })
          .run();
      }
    } else if (urlModal.type === "image") {
      if (urlInput) {
        editor.chain().focus().setResizableImage({ src: urlInput }).run();
      }
    } else if (urlModal.type === "video") {
      if (urlInput) {
        editor.chain().focus().setYoutubeVideo({ src: urlInput }).run();
      }
    }
    setUrlModal({ isOpen: false, type: "link", defaultValue: "" });
    setUrlInput("");
  }, [editor, urlModal.type, urlInput]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    setUrlModal({
      isOpen: true,
      type: "link",
      defaultValue: previousUrl || "",
    });
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    setUrlModal({ isOpen: true, type: "image", defaultValue: "" });
  }, [editor]);

  const addVideo = useCallback(() => {
    if (!editor) return;
    setUrlModal({ isOpen: true, type: "video", defaultValue: "" });
  }, [editor]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadImageFileRef.current(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  if (!editor) {
    return null;
  }

  const isInTable = editor.isActive("table");

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          active={false}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" /></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          active={false}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" /></svg>
        </ToolbarButton>

        <Divider />

        {/* Bold / Italic / Underline */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" /></svg>
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">H3</ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h18" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M3 18h18" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 12h12M3 18h18" /></svg>
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="6" r="1.5" /><circle cx="4" cy="12" r="1.5" /><circle cx="4" cy="18" r="1.5" /><rect x="9" y="5" width="12" height="2" rx="1" /><rect x="9" y="11" width="12" height="2" rx="1" /><rect x="9" y="17" width="12" height="2" rx="1" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><text x="1" y="8" fontSize="7" fontWeight="600" fontFamily="system-ui">1</text><text x="1" y="14.5" fontSize="7" fontWeight="600" fontFamily="system-ui">2</text><text x="1" y="21" fontSize="7" fontWeight="600" fontFamily="system-ui">3</text><rect x="9" y="5" width="12" height="2" rx="1" /><rect x="9" y="11" width="12" height="2" rx="1" /><rect x="9" y="17" width="12" height="2" rx="1" /></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          active={false}
          disabled={!editor.can().sinkListItem("listItem")}
          title="Indent (nest sub-item)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5h8M13 12h8M13 19h8M3 8l4 4-4 4" /></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          active={false}
          disabled={!editor.can().liftListItem("listItem")}
          title="Outdent (un-nest)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5h8M13 12h8M13 19h8M7 8L3 12l4 4" /></svg>
        </ToolbarButton>

        <Divider />

        {/* Link */}
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Add Link">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </ToolbarButton>

        {/* Media dropdown: Image upload, Image URL, Video, Wiki Link */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <ToolbarButton
            onClick={() => setOpenDropdown(openDropdown === "media" ? null : "media")}
            active={false}
            title="Insert Media"
          >
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
          </ToolbarButton>
          {openDropdown === "media" && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[180px]">
              <DropdownItem onClick={() => { fileInputRef.current?.click(); setOpenDropdown(null); }}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Upload Image
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => { addImage(); setOpenDropdown(null); }}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Image from URL
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => { addVideo(); setOpenDropdown(null); }}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Embed Video
                </span>
              </DropdownItem>
              <div className="border-t border-gray-100 my-1" />
              <DropdownItem onClick={() => { setWikiLinkPickerOpen(true); setOpenDropdown(null); }}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Wiki Link
                </span>
              </DropdownItem>
            </div>
          )}
        </div>

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Divider />

        {/* Text Color */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <ToolbarButton
            onClick={() => setOpenDropdown(openDropdown === "text-color" ? null : "text-color")}
            active={!!editor.getAttributes("textStyle").color}
            title="Text Color"
          >
            <span
              className="w-4 h-4 flex items-center justify-center text-xs font-bold"
              style={{ borderBottom: `3px solid ${editor.getAttributes("textStyle").color || "#000"}` }}
            >
              A
            </span>
          </ToolbarButton>
          {openDropdown === "text-color" && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    if (c.color) {
                      editor.chain().focus().setColor(c.color).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                    setOpenDropdown(null);
                  }}
                  className="w-7 h-7 rounded border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c.color || "#fff" }}
                  title={c.name}
                >
                  {!c.color && <span className="text-[10px] text-gray-400">Aa</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <ToolbarButton
            onClick={() => setOpenDropdown(openDropdown === "highlight" ? null : "highlight")}
            active={editor.isActive("highlight")}
            title="Highlight"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </ToolbarButton>
          {openDropdown === "highlight" && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    if (c.color) {
                      editor.chain().focus().toggleHighlight({ color: c.color }).run();
                    } else {
                      editor.chain().focus().unsetHighlight().run();
                    }
                    setOpenDropdown(null);
                  }}
                  className="w-7 h-7 rounded border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c.color || "#fff" }}
                  title={c.name}
                >
                  {!c.color && <span className="text-[10px] text-gray-400">-</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Table */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <ToolbarButton
            onClick={() => {
              if (isInTable) {
                setOpenDropdown(openDropdown === "table-menu" ? null : "table-menu");
              } else {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              }
            }}
            active={isInTable}
            title={isInTable ? "Table Options" : "Insert Table"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" /></svg>
          </ToolbarButton>
          {openDropdown === "table-menu" && isInTable && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[160px]">
              <DropdownItem onClick={() => { editor.chain().focus().addRowBefore().run(); setOpenDropdown(null); }}>Add Row Above</DropdownItem>
              <DropdownItem onClick={() => { editor.chain().focus().addRowAfter().run(); setOpenDropdown(null); }}>Add Row Below</DropdownItem>
              <DropdownItem onClick={() => { editor.chain().focus().deleteRow().run(); setOpenDropdown(null); }}>Delete Row</DropdownItem>
              <div className="border-t border-gray-100 my-1" />
              <DropdownItem onClick={() => { editor.chain().focus().addColumnBefore().run(); setOpenDropdown(null); }}>Add Column Left</DropdownItem>
              <DropdownItem onClick={() => { editor.chain().focus().addColumnAfter().run(); setOpenDropdown(null); }}>Add Column Right</DropdownItem>
              <DropdownItem onClick={() => { editor.chain().focus().deleteColumn().run(); setOpenDropdown(null); }}>Delete Column</DropdownItem>
              <div className="border-t border-gray-100 my-1" />
              <DropdownItem onClick={() => { editor.chain().focus().deleteTable().run(); setOpenDropdown(null); }} className="text-red-600">Delete Table</DropdownItem>
            </div>
          )}
        </div>

        {/* Quote / HR */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal Rule">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" /></svg>
        </ToolbarButton>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <EditorContent editor={editor} className="p-4 bg-white" />
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Uploading image...
            </div>
          </div>
        )}
      </div>

      {/* ── Wiki Link Picker ─────────────────────────────────────────── */}
      <WikiLinkPicker
        isOpen={wikiLinkPickerOpen}
        onClose={() => setWikiLinkPickerOpen(false)}
        onSelect={(article) => {
          if (!editor) return;
          const { selection } = editor.state;
          const hasSelection = !selection.empty;

          if (hasSelection) {
            // Wrap selected text with wiki link
            editor
              .chain()
              .focus()
              .setLink({
                href: `/wiki/${article.slug}`,
                "data-wiki-id": article.id,
                class: "wiki-link",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any)
              .run();
          } else {
            // Insert article title as linked text
            editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: `/wiki/${article.slug}`,
                      "data-wiki-id": article.id,
                      class: "wiki-link",
                    },
                  },
                ],
                text: article.title,
              })
              .run();
          }
          setWikiLinkPickerOpen(false);
        }}
      />

      {/* ── URL Modal ───────────────────────────────────────────────────── */}
      {urlModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-brand-navy">
                  {urlModal.type === "link" ? "Enter URL" : urlModal.type === "video" ? "Enter Video URL" : "Enter Image URL"}
                </h3>
                <button
                  onClick={() => {
                    setUrlModal({ isOpen: false, type: "link", defaultValue: "" });
                    setUrlInput("");
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                ref={urlInputRef}
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlSubmit();
                  if (e.key === "Escape") {
                    setUrlModal({ isOpen: false, type: "link", defaultValue: "" });
                    setUrlInput("");
                  }
                }}
                placeholder={urlModal.type === "link" ? "https://example.com" : urlModal.type === "video" ? "https://youtube.com/watch?v=..." : "https://example.com/image.jpg"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/50 focus:border-brand-navy"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setUrlModal({ isOpen: false, type: "link", defaultValue: "" });
                    setUrlInput("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlSubmit}
                  className="flex-1 px-4 py-2 bg-brand-navy hover:bg-brand-purple text-white rounded-lg transition-colors"
                >
                  {urlModal.type === "link" ? "Set Link" : urlModal.type === "video" ? "Embed Video" : "Add Image"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar helpers
// ---------------------------------------------------------------------------

function Divider() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  disabled = false,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded hover:bg-gray-200 transition-colors ${
        active
          ? "bg-brand-navy text-white hover:bg-brand-navy/80"
          : "text-gray-700"
      } ${disabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""}`}
    >
      {children}
    </button>
  );
}

function DropdownItem({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

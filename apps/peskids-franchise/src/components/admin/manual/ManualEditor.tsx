"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { type Editor } from "@tiptap/react";
import { TipTapEditor } from "@/components/shared/TipTapEditor";
import { HeadingWithId, slugify } from "@/lib/tiptap/heading-with-id";
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  HashtagIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManualEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip the not-prose TOC block from the beginning of content */
function stripTocBlock(html: string): string {
  return html
    .replace(
      /^<div class="not-prose[^"]*">[\s\S]*?<\/nav>\s*<\/div>\s*/,
      ""
    )
    .trim();
}

/** Generate the TOC HTML block (same format as seed output) */
function generateTocHtml(entries: TocEntry[]): string {
  if (entries.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    '<div class="not-prose mb-8">',
    '<nav class="bg-slate-50 border border-slate-200 rounded-lg p-6">',
    '<h2 class="text-lg font-semibold text-slate-800 mb-4">In This Section</h2>',
    '<ul class="space-y-2 list-none p-0 m-0">'
  );

  let lastH2Open = false;

  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const next = entries[i + 1];

    if (item.level === 2) {
      if (lastH2Open) {
        lines.push("</ul>", "</li>");
        lastH2Open = false;
      }

      const hasChildren = next && next.level === 3;

      if (hasChildren) {
        lines.push(
          "<li>",
          `<a href="#${item.id}" class="font-medium text-indigo-700 hover:text-indigo-900 hover:underline">${item.text}</a>`,
          '<ul class="ml-4 mt-1 space-y-0.5 list-none p-0 m-0">'
        );
        lastH2Open = true;
      } else {
        lines.push(
          "<li>",
          `<a href="#${item.id}" class="font-medium text-indigo-700 hover:text-indigo-900 hover:underline">${item.text}</a>`,
          "</li>"
        );
      }
    } else if (item.level === 3) {
      lines.push(
        `<li><a href="#${item.id}" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">${item.text}</a></li>`
      );
    }
  }

  if (lastH2Open) {
    lines.push("</ul>", "</li>");
  }

  lines.push("</ul>", "</nav>", "</div>");
  return lines.join("\n");
}

/** Extract heading entries from the ProseMirror document */
function extractHeadings(editor: Editor): TocEntry[] {
  const headings: TocEntry[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      const text = node.textContent;
      const id = (node.attrs.id as string) || slugify(text);
      if ((level === 2 || level === 3) && text.trim()) {
        headings.push({ id, text, level });
      }
    }
  });
  return headings;
}

/** Ensure all headings in the document have an id attribute */
function ensureHeadingIds(editor: Editor) {
  const { doc, tr } = editor.state;
  let changed = false;
  doc.descendants((node, pos) => {
    if (node.type.name === "heading" && !node.attrs.id && node.textContent.trim()) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        id: slugify(node.textContent),
      });
      changed = true;
    }
  });
  if (changed) {
    editor.view.dispatch(tr);
  }
}

// ---------------------------------------------------------------------------
// ManualEditor component
// ---------------------------------------------------------------------------

export function ManualEditor({
  content,
  onChange,
  placeholder = "Start writing manual page content...",
}: ManualEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Strip TOC from incoming content so the editor only sees body HTML
  const [bodyContent] = useState(() => stripTocBlock(content));

  // Track editor changes: extract headings and call parent onChange with TOC + body
  const handleEditorChange = useCallback(
    (html: string) => {
      const editor = editorRef.current;
      if (!editor) {
        onChange(html);
        return;
      }

      // Ensure all headings have IDs
      ensureHeadingIds(editor);

      // Extract headings for TOC
      const headings = extractHeadings(editor);
      setTocEntries(headings);

      // Get the actual HTML after any ID updates
      const updatedHtml = editor.getHTML();

      // Generate TOC and combine
      const tocHtml = generateTocHtml(headings);
      const fullHtml = tocHtml ? tocHtml + "\n" + updatedHtml : updatedHtml;
      onChange(fullHtml);
    },
    [onChange]
  );

  // Initial heading extraction after editor mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      const editor = editorRef.current;
      if (editor) {
        ensureHeadingIds(editor);
        setTocEntries(extractHeadings(editor));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll editor to a specific heading — positions it at the top of the visible area
  const scrollToHeading = useCallback((id: string) => {
    // Find the heading element in the rendered editor DOM by its id attribute
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Commit an anchor ID edit
  const commitIdEdit = useCallback(
    (oldId: string) => {
      const editor = editorRef.current;
      if (!editor || !editingValue.trim()) {
        setEditingId(null);
        return;
      }
      const newId = editingValue
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!newId || newId === oldId) {
        setEditingId(null);
        return;
      }

      const { doc, tr } = editor.state;
      doc.descendants((node, pos) => {
        if (node.type.name === "heading" && node.attrs.id === oldId) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: newId });
        }
      });
      editor.view.dispatch(tr);
      setEditingId(null);

      // Refresh TOC
      const headings = extractHeadings(editor);
      setTocEntries(headings);

      // Notify parent
      const tocHtml = generateTocHtml(headings);
      const bodyHtml = editor.getHTML();
      onChange(tocHtml ? tocHtml + "\n" + bodyHtml : bodyHtml);
    },
    [editingValue, onChange]
  );

  return (
    <div className="flex gap-4">
      {/* ── Editor (left) ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <TipTapEditor
          content={bodyContent}
          onChange={handleEditorChange}
          placeholder={placeholder}
          minHeight="500px"
          editorRef={editorRef}
          disableDefaultHeading
          customExtensions={[HeadingWithId.configure({ levels: [2, 3] })]}
        />
      </div>

      {/* ── TOC Sidebar (right) ─────────────────────────────────────── */}
      {sidebarOpen ? (
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <HashtagIcon className="h-4 w-4" />
                Table of Contents
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
                title="Collapse TOC"
              >
                <ChevronDoubleRightIcon className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Entries */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
              {tocEntries.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">
                  Add headings (H2, H3) to see the table of contents.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {tocEntries.map((entry, i) => (
                    <li
                      key={`${entry.id}-${i}`}
                      className={`${entry.level === 3 ? "ml-4" : ""}`}
                    >
                      <div className="group rounded px-2 py-1.5 hover:bg-slate-50 transition-colors">
                        {/* Heading text — click to scroll */}
                        <button
                          onClick={() => {
                            scrollToHeading(entry.id);
                            window.history.replaceState(null, "", `#${entry.id}`);
                          }}
                          className="w-full text-left text-sm text-slate-700 group-hover:text-indigo-600 truncate block"
                          title={entry.text}
                        >
                          {entry.text || "Untitled heading"}
                        </button>

                        {/* Anchor ID — click to edit */}
                        {editingId === entry.id ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitIdEdit(entry.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitIdEdit(entry.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="mt-0.5 w-full text-xs font-mono px-1.5 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(entry.id);
                              setEditingValue(entry.id);
                            }}
                            className="mt-0.5 flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-indigo-500 transition-colors truncate"
                            title="Click to edit anchor ID"
                          >
                            <span>#{entry.id}</span>
                            <PencilIcon className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400">
                {tocEntries.length} heading{tocEntries.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-shrink-0 p-2 h-fit sticky top-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          title="Expand TOC"
        >
          <ChevronDoubleLeftIcon className="h-4 w-4 text-slate-400" />
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TipTapEditor } from "@/components/shared/TipTapEditor";
import {
  Bars3Icon,
  TrashIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { ContentBlockData, BlockType, ChecklistItem } from "./types";

const blockTypeConfig: Record<
  BlockType,
  { label: string; color: string; bgColor: string }
> = {
  TEXT: { label: "Rich Text", color: "text-blue-700", bgColor: "bg-blue-50" },
  VIDEO: { label: "Video", color: "text-red-700", bgColor: "bg-red-50" },
  IMAGE: { label: "Image", color: "text-amber-700", bgColor: "bg-amber-50" },
  FILE: { label: "File", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  CALLOUT: { label: "Callout", color: "text-orange-700", bgColor: "bg-orange-50" },
  CHECKPOINT: { label: "Checkpoint", color: "text-green-700", bgColor: "bg-green-50" },
  QUIZ: { label: "Quiz", color: "text-purple-700", bgColor: "bg-purple-50" },
  CHECKLIST: { label: "Checklist", color: "text-indigo-700", bgColor: "bg-indigo-50" },
};

interface BlockEditorProps {
  block: ContentBlockData;
  onChange: (block: ContentBlockData) => void;
  onDelete: () => void;
}

export function BlockEditor({
  block,
  onChange,
  onDelete,
}: BlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = blockTypeConfig[block.type];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 p-2.5 border-b bg-gray-50/80">
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <Bars3Icon className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <ChevronRightIcon
            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </button>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}
        >
          {config.label}
        </span>
        <div className="flex-1" />
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-100 text-red-600 rounded"
          title="Delete"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {block.type === "TEXT" && (
            <TextEditor block={block} onChange={onChange} />
          )}
          {block.type === "VIDEO" && (
            <VideoEditor block={block} onChange={onChange} />
          )}
          {block.type === "IMAGE" && (
            <ImageEditor block={block} onChange={onChange} />
          )}
          {block.type === "FILE" && (
            <FileEditor block={block} onChange={onChange} />
          )}
          {block.type === "CALLOUT" && (
            <CalloutEditor block={block} onChange={onChange} />
          )}
          {block.type === "CHECKPOINT" && (
            <CheckpointEditor block={block} onChange={onChange} />
          )}
          {block.type === "QUIZ" && (
            <QuizEditor block={block} onChange={onChange} />
          )}
          {block.type === "CHECKLIST" && (
            <ChecklistEditor block={block} onChange={onChange} />
          )}
        </div>
      )}
    </div>
  );
}

// --- Individual block type editors ---

function TextEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  return (
    <TipTapEditor
      content={block.content || ""}
      onChange={(html) => onChange({ ...block, content: html })}
      placeholder="Enter rich text content..."
    />
  );
}

function VideoEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  const detectProvider = (url: string): string | null => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("vimeo.com")) return "vimeo";
    return null;
  };

  const getEmbedUrl = (url: string, provider: string | null): string | null => {
    if (!provider) return null;
    if (provider === "youtube") {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    if (provider === "vimeo") {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : null;
    }
    return null;
  };

  const embedUrl = block.videoUrl
    ? getEmbedUrl(block.videoUrl, block.videoProvider || null)
    : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Video URL (YouTube or Vimeo)
        </label>
        <input
          type="url"
          value={block.videoUrl || ""}
          onChange={(e) => {
            const url = e.target.value;
            onChange({ ...block, videoUrl: url, videoProvider: detectProvider(url) });
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan text-sm"
        />
        {block.videoProvider && (
          <p className="mt-1 text-xs text-green-600">
            Detected: {block.videoProvider === "youtube" ? "YouTube" : "Vimeo"}
          </p>
        )}
      </div>
      {embedUrl && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title="Video preview"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function ImageEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/bootcamp/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onChange({ ...block, imageUrl: data.url });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {block.imageUrl ? (
        <div className="relative">
          <img
            src={block.imageUrl}
            alt={block.imageAlt || ""}
            className="max-w-full max-h-48 rounded-lg border"
          />
          <button
            onClick={() => onChange({ ...block, imageUrl: null })}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-cyan transition-colors"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click to upload an image (max 5MB)</p>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        className="hidden"
      />
      <input
        type="url"
        value={block.imageUrl || ""}
        onChange={(e) => onChange({ ...block, imageUrl: e.target.value })}
        placeholder="Or enter image URL"
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={block.imageAlt || ""}
          onChange={(e) => onChange({ ...block, imageAlt: e.target.value })}
          placeholder="Alt text"
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
        <input
          type="text"
          value={block.imageCaption || ""}
          onChange={(e) => onChange({ ...block, imageCaption: e.target.value })}
          placeholder="Caption (optional)"
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
      </div>
    </div>
  );
}

function FileEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          File URL
        </label>
        <input
          type="url"
          value={block.fileUrl || ""}
          onChange={(e) => onChange({ ...block, fileUrl: e.target.value })}
          placeholder="https://... (PDF, DOC, XLS, PPT)"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Title
          </label>
          <input
            type="text"
            value={block.fileTitle || ""}
            onChange={(e) => onChange({ ...block, fileTitle: e.target.value })}
            placeholder="e.g., Franchise Agreement PDF"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={block.fileDescription || ""}
            onChange={(e) =>
              onChange({ ...block, fileDescription: e.target.value })
            }
            placeholder="Optional description"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
          />
        </div>
      </div>
      {block.fileUrl && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div>
            <p className="font-medium text-sm text-emerald-900">
              {block.fileTitle || "Attached File"}
            </p>
            {block.fileDescription && (
              <p className="text-xs text-emerald-700">{block.fileDescription}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalloutEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  const calloutStyles: Record<string, { bg: string; border: string; text: string }> = {
    tip: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-900" },
    warning: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-900" },
    important: { bg: "bg-red-50", border: "border-red-300", text: "text-red-900" },
  };

  const style = calloutStyles[block.calloutType || "tip"] || calloutStyles.tip;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Callout Type
        </label>
        <select
          value={block.calloutType || "tip"}
          onChange={(e) => onChange({ ...block, calloutType: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan bg-white"
        >
          <option value="tip">Tip</option>
          <option value="warning">Warning</option>
          <option value="important">Important</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title (optional)
        </label>
        <input
          type="text"
          value={block.calloutTitle || ""}
          onChange={(e) => onChange({ ...block, calloutTitle: e.target.value })}
          placeholder="Callout title..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content *
        </label>
        <textarea
          value={block.calloutContent || ""}
          onChange={(e) => onChange({ ...block, calloutContent: e.target.value })}
          rows={3}
          placeholder="Callout body text..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
      </div>
      {/* Preview */}
      <div className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
        <p className="text-xs text-gray-500 mb-1">Preview:</p>
        {block.calloutTitle && (
          <p className={`font-semibold text-sm ${style.text}`}>{block.calloutTitle}</p>
        )}
        <p className={`text-sm ${style.text}`}>
          {block.calloutContent || "Callout content..."}
        </p>
      </div>
    </div>
  );
}

function CheckpointEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Checkpoint Text
        </label>
        <textarea
          value={block.checkpointText || ""}
          onChange={(e) => onChange({ ...block, checkpointText: e.target.value })}
          placeholder="Enter the text franchisees must acknowledge..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
          rows={3}
        />
      </div>
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Preview:</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1" disabled />
          <span className="text-sm text-gray-800">
            {block.checkpointText || "Checkpoint text..."}
          </span>
        </label>
      </div>
    </div>
  );
}

function QuizEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  const options = (block.quizOptions as string[]) || ["", ""];

  const addOption = () => {
    if (options.length < 6) {
      onChange({ ...block, quizOptions: [...options, ""] });
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      const newCorrect =
        block.correctAnswer === index
          ? null
          : block.correctAnswer != null && block.correctAnswer > index
          ? block.correctAnswer - 1
          : block.correctAnswer;
      onChange({ ...block, quizOptions: newOptions, correctAnswer: newCorrect });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question
        </label>
        <textarea
          value={block.quizQuestion || ""}
          onChange={(e) => onChange({ ...block, quizQuestion: e.target.value })}
          placeholder="Enter your quiz question..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options (click circle to mark correct)
        </label>
        <div className="space-y-2">
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...block, correctAnswer: i })}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  block.correctAnswer === i
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-green-400"
                }`}
              >
                {block.correctAnswer === i && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  onChange({ ...block, quizOptions: newOpts });
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <button
            onClick={addOption}
            className="mt-2 text-sm text-brand-cyan hover:text-brand-navy"
          >
            + Add option
          </button>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (shown after answering)
        </label>
        <textarea
          value={block.quizExplanation || ""}
          onChange={(e) => onChange({ ...block, quizExplanation: e.target.value })}
          placeholder="Explain the correct answer..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
          rows={2}
        />
      </div>
    </div>
  );
}

function ChecklistEditor({
  block,
  onChange,
}: {
  block: ContentBlockData;
  onChange: (b: ContentBlockData) => void;
}) {
  const items: ChecklistItem[] = (block.checklistItems as ChecklistItem[]) || [];

  const addItem = () => {
    onChange({
      ...block,
      checklistItems: [...items, { title: "" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...block,
      checklistItems: items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ ...block, checklistItems: newItems });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Checklist Title
        </label>
        <input
          type="text"
          value={block.checklistTitle || ""}
          onChange={(e) => onChange({ ...block, checklistTitle: e.target.value })}
          placeholder="e.g., Setup Checklist"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Items
        </label>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono w-5">{i + 1}.</span>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                  placeholder="Item title *"
                  className="flex-1 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-brand-cyan"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={item.description || ""}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-brand-cyan ml-7"
              />
              <div className="flex gap-2 ml-7">
                <input
                  type="url"
                  value={item.helpLink || ""}
                  onChange={(e) => updateItem(i, { helpLink: e.target.value })}
                  placeholder="Help link"
                  className="flex-1 px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-brand-cyan"
                />
                <input
                  type="number"
                  value={item.dueDay || ""}
                  onChange={(e) =>
                    updateItem(i, { dueDay: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="Due day"
                  className="w-20 px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-brand-cyan"
                />
                <input
                  type="number"
                  value={item.points || ""}
                  onChange={(e) =>
                    updateItem(i, { points: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="Points"
                  className="w-20 px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-brand-cyan"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 text-sm text-brand-cyan hover:text-brand-navy"
        >
          + Add checklist item
        </button>
      </div>
    </div>
  );
}

// --- Block Type Picker Grid ---

interface BlockTypePickerProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function BlockTypePicker({ onSelect, onClose }: BlockTypePickerProps) {
  const types: { type: BlockType; label: string; desc: string }[] = [
    { type: "TEXT", label: "Rich Text", desc: "Formatted text with headings, lists, links" },
    { type: "VIDEO", label: "Video", desc: "YouTube or Vimeo embed" },
    { type: "IMAGE", label: "Image", desc: "Upload or URL with caption" },
    { type: "FILE", label: "File", desc: "PDF, DOC, or other download" },
    { type: "CALLOUT", label: "Callout", desc: "Tip, warning, or important note" },
    { type: "CHECKPOINT", label: "Checkpoint", desc: "Acknowledgment checkbox" },
    { type: "QUIZ", label: "Quiz", desc: "Multiple choice question" },
    { type: "CHECKLIST", label: "Checklist", desc: "Multi-item task list" },
  ];

  return (
    <div className="border rounded-lg bg-white shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Add Content Block</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {types.map(({ type, label, desc }) => {
          const config = blockTypeConfig[type];
          return (
            <button
              key={type}
              onClick={() => {
                onSelect(type);
                onClose();
              }}
              className="text-left p-3 rounded-lg border hover:border-brand-cyan hover:bg-brand-cyan/5 transition-colors"
            >
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${config.bgColor} ${config.color}`}
              >
                {label}
              </span>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { SafeHtml } from "@/components/shared/SafeHtml";

export interface UnifiedContentBlock {
  id: string;
  type: "TEXT" | "CHECKPOINT" | "QUIZ" | "IMAGE" | "VIDEO" | "FILE" | "CALLOUT" | "CHECKLIST";
  order: number;
  content?: string | null;
  checkpointText?: string | null;
  quizQuestion?: string | null;
  quizOptions?: string[] | null;
  correctAnswer?: number | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  videoUrl?: string | null;
  videoProvider?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  calloutType?: string | null;
  calloutTitle?: string | null;
  checklistItems?: string[] | null;
}

interface UnifiedBlockRendererProps {
  blocks: UnifiedContentBlock[];
  moduleId: string;
  onBlockComplete?: (blockId: string, data?: { quizAnswer?: number }) => void;
  completedBlocks?: Set<string>;
  blockProgress?: Map<string, { quizAnswer?: number; quizCorrect?: boolean; checklistChecked?: number[] }>;
}

export function UnifiedBlockRenderer({
  blocks,
  moduleId,
  onBlockComplete,
  completedBlocks = new Set(),
  blockProgress = new Map(),
}: UnifiedBlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <BlockItem
          key={block.id}
          block={block}
          isCompleted={completedBlocks.has(block.id)}
          progress={blockProgress.get(block.id)}
          onComplete={(data) => onBlockComplete?.(block.id, data)}
        />
      ))}
    </div>
  );
}

interface BlockItemProps {
  block: UnifiedContentBlock;
  isCompleted: boolean;
  progress?: { quizAnswer?: number; quizCorrect?: boolean; checklistChecked?: number[] };
  onComplete: (data?: { quizAnswer?: number }) => void;
}

function BlockItem({ block, isCompleted, progress, onComplete }: BlockItemProps) {
  switch (block.type) {
    case "TEXT":
      return block.content ? <SafeHtml html={block.content} /> : null;
    case "CHECKPOINT":
      return (
        <CheckpointBlock
          text={block.checkpointText}
          isCompleted={isCompleted}
          onComplete={onComplete}
        />
      );
    case "QUIZ":
      return (
        <QuizBlock
          question={block.quizQuestion}
          options={block.quizOptions}
          correctAnswer={block.correctAnswer}
          isCompleted={isCompleted}
          previousAnswer={progress?.quizAnswer}
          wasCorrect={progress?.quizCorrect}
          onComplete={onComplete}
        />
      );
    case "IMAGE":
      return <ImageBlock url={block.imageUrl} alt={block.imageAlt} caption={block.imageCaption} />;
    case "VIDEO":
      return <VideoBlock url={block.videoUrl} provider={block.videoProvider} />;
    case "FILE":
      return <FileBlock url={block.fileUrl} name={block.fileName} size={block.fileSize} />;
    case "CALLOUT":
      return <CalloutBlock content={block.content} calloutType={block.calloutType} title={block.calloutTitle} />;
    case "CHECKLIST":
      return <ChecklistBlock items={block.checklistItems} isCompleted={isCompleted} checkedItems={progress?.checklistChecked} onComplete={onComplete} />;
    default:
      return null;
  }
}

function CheckpointBlock({ text, isCompleted, onComplete }: { text?: string | null; isCompleted: boolean; onComplete: () => void }) {
  const [checked, setChecked] = useState(isCompleted);
  const handleChange = () => {
    if (!checked) { setChecked(true); onComplete(); }
  };
  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${checked ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={handleChange} disabled={isCompleted} className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
        <div>
          <span className="text-gray-800 font-medium">{text}</span>
          {!checked && <p className="text-xs text-amber-600 mt-1">Check this box to acknowledge</p>}
          {checked && <p className="text-xs text-green-600 mt-1">Acknowledged</p>}
        </div>
      </label>
    </div>
  );
}

function QuizBlock({ question, options, correctAnswer, isCompleted, previousAnswer, wasCorrect, onComplete }: {
  question?: string | null; options?: string[] | null; correctAnswer?: number | null;
  isCompleted: boolean; previousAnswer?: number; wasCorrect?: boolean;
  onComplete: (data: { quizAnswer: number }) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(previousAnswer ?? null);
  const [submitted, setSubmitted] = useState(isCompleted);
  const [showResult, setShowResult] = useState(isCompleted);
  if (!question || !options || options.length === 0) return null;
  const handleSubmit = () => { if (selectedAnswer === null) return; setSubmitted(true); setShowResult(true); onComplete({ quizAnswer: selectedAnswer }); };
  const isCorrect = selectedAnswer === correctAnswer;
  return (
    <div className={`p-4 rounded-lg border-2 ${showResult ? (isCorrect || wasCorrect ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50") : "border-purple-300 bg-purple-50"}`}>
      <h4 className="font-medium text-gray-800 mb-4">{question}</h4>
      <div className="space-y-2">
        {options.map((option, index) => (
          <label key={index} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
            submitted ? (index === correctAnswer ? "border-green-400 bg-green-100" : index === selectedAnswer && index !== correctAnswer ? "border-red-400 bg-red-100" : "border-gray-200 bg-white")
            : selectedAnswer === index ? "border-purple-400 bg-white" : "border-gray-200 bg-white hover:border-purple-300"
          }`}>
            <input type="radio" name={`quiz-${question}`} value={index} checked={selectedAnswer === index} onChange={() => !submitted && setSelectedAnswer(index)} disabled={submitted} className="h-4 w-4 text-purple-600 focus:ring-purple-500" />
            <span className="text-gray-700">{option}</span>
            {submitted && index === correctAnswer && <span className="ml-auto text-green-600 text-sm">Correct</span>}
            {submitted && index === selectedAnswer && index !== correctAnswer && <span className="ml-auto text-red-600 text-sm">Incorrect</span>}
          </label>
        ))}
      </div>
      {!submitted && (
        <button onClick={handleSubmit} disabled={selectedAnswer === null} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Submit Answer
        </button>
      )}
      {showResult && (
        <div className={`mt-4 p-3 rounded-lg ${isCorrect || wasCorrect ? "bg-green-100" : "bg-amber-100"}`}>
          {isCorrect || wasCorrect ? <p className="text-green-700 font-medium">Correct! Great job!</p> : <p className="text-amber-700">Not quite - the correct answer is highlighted above.</p>}
        </div>
      )}
    </div>
  );
}

function ImageBlock({ url, alt, caption }: { url?: string | null; alt?: string | null; caption?: string | null }) {
  if (!url) return null;
  return (
    <figure className="rounded-lg overflow-hidden">
      <img src={url} alt={alt || "Content image"} className="w-full max-h-96 object-contain bg-gray-100" />
      {caption && <figcaption className="text-sm text-gray-500 text-center mt-2 italic">{caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ url, provider }: { url?: string | null; provider?: string | null }) {
  if (!url) return null;
  const getEmbedUrl = (): string | null => {
    if (provider === "youtube") { const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/); if (m) return `https://www.youtube.com/embed/${m[1]}`; }
    if (provider === "vimeo") { const m = url.match(/vimeo\.com\/(\d+)/); if (m) return `https://player.vimeo.com/video/${m[1]}`; }
    return null;
  };
  const embedUrl = getEmbedUrl();
  if (!embedUrl) return (
    <div className="p-4 bg-gray-100 rounded-lg text-center">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">Watch video</a>
    </div>
  );
  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe src={embedUrl} title="Video content" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  );
}

function FileBlock({ url, name, size }: { url?: string | null; name?: string | null; size?: number | null }) {
  if (!url) return null;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
        <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-navy truncate">{name || "Download File"}</p>
          {size && <p className="text-xs text-gray-500">{formatSize(size)}</p>}
        </div>
        <span className="text-xs text-brand-purple font-medium">Download</span>
      </a>
    </div>
  );
}

function CalloutBlock({ content, calloutType, title }: { content?: string | null; calloutType?: string | null; title?: string | null }) {
  if (!content) return null;
  const styles: Record<string, { border: string; bg: string; titleColor: string }> = {
    info: { border: "border-blue-300", bg: "bg-blue-50", titleColor: "text-blue-700" },
    warning: { border: "border-amber-300", bg: "bg-amber-50", titleColor: "text-amber-700" },
    tip: { border: "border-green-300", bg: "bg-green-50", titleColor: "text-green-700" },
    success: { border: "border-emerald-300", bg: "bg-emerald-50", titleColor: "text-emerald-700" },
  };
  const style = styles[calloutType || "info"] || styles.info;
  return (
    <div className={`p-4 rounded-lg border-2 ${style.border} ${style.bg}`}>
      {title && <h4 className={`font-semibold mb-2 ${style.titleColor}`}>{title}</h4>}
      <SafeHtml html={content} className="prose prose-sm max-w-none" />
    </div>
  );
}

function ChecklistBlock({ items, isCompleted, checkedItems, onComplete }: {
  items?: string[] | null; isCompleted: boolean; checkedItems?: number[]; onComplete: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set(checkedItems || []));
  if (!items || items.length === 0) return null;
  const allChecked = checked.size === items.length;
  const toggleItem = (index: number) => {
    if (isCompleted) return;
    const next = new Set(checked);
    if (next.has(index)) next.delete(index); else next.add(index);
    setChecked(next);
    if (next.size === items.length) onComplete();
  };
  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${allChecked || isCompleted ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
      <h4 className="font-medium text-gray-800 mb-3">Checklist</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <label key={index} className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={checked.has(index) || isCompleted} onChange={() => toggleItem(index)} disabled={isCompleted} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span className={`text-sm ${checked.has(index) || isCompleted ? "text-gray-500 line-through" : "text-gray-700"}`}>{item}</span>
          </label>
        ))}
      </div>
      {(allChecked || isCompleted) && <p className="text-xs text-green-600 mt-3">All items completed</p>}
    </div>
  );
}

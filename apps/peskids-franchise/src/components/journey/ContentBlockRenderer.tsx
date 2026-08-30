"use client";

import { useState } from "react";

export interface ContentBlock {
  id: string;
  type: "TEXT" | "CHECKPOINT" | "QUIZ" | "IMAGE" | "VIDEO";
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
}

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  taskId: string;
  onBlockComplete?: (blockId: string, data?: { quizAnswer?: number }) => void;
  completedBlocks?: Set<string>;
  blockProgress?: Map<string, { quizAnswer?: number; quizCorrect?: boolean }>;
}

export function ContentBlockRenderer({
  blocks,
  taskId,
  onBlockComplete,
  completedBlocks = new Set(),
  blockProgress = new Map(),
}: ContentBlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <ContentBlockItem
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

interface ContentBlockItemProps {
  block: ContentBlock;
  isCompleted: boolean;
  progress?: { quizAnswer?: number; quizCorrect?: boolean };
  onComplete: (data?: { quizAnswer?: number }) => void;
}

function ContentBlockItem({ block, isCompleted, progress, onComplete }: ContentBlockItemProps) {
  switch (block.type) {
    case "TEXT":
      return <TextBlock content={block.content} />;
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
      return (
        <ImageBlock
          url={block.imageUrl}
          alt={block.imageAlt}
          caption={block.imageCaption}
        />
      );
    case "VIDEO":
      return (
        <VideoBlock url={block.videoUrl} provider={block.videoProvider} />
      );
    default:
      return null;
  }
}

// Text Block - Renders HTML content (from trusted admin CMS only)
function TextBlock({ content }: { content?: string | null }) {
  if (!content) return null;

  // Note: Content comes from admin CMS, which is trusted. For additional
  // security in production, consider adding DOMPurify sanitization.
  return (
    <div
      className="prose prose-sm max-w-none prose-headings:text-brand-navy prose-a:text-brand-cyan"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// Checkpoint Block - Acknowledgment checkbox
function CheckpointBlock({
  text,
  isCompleted,
  onComplete,
}: {
  text?: string | null;
  isCompleted: boolean;
  onComplete: () => void;
}) {
  const [checked, setChecked] = useState(isCompleted);

  const handleChange = () => {
    if (!checked) {
      setChecked(true);
      onComplete();
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${
      checked
        ? "border-green-300 bg-green-50"
        : "border-amber-300 bg-amber-50"
    }`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={isCompleted}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <div>
          <span className="text-gray-800 font-medium">{text}</span>
          {!checked && (
            <p className="text-xs text-amber-600 mt-1">
              Check this box to acknowledge
            </p>
          )}
          {checked && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Acknowledged
            </p>
          )}
        </div>
      </label>
    </div>
  );
}

// Quiz Block - Multiple choice question
function QuizBlock({
  question,
  options,
  correctAnswer,
  isCompleted,
  previousAnswer,
  wasCorrect,
  onComplete,
}: {
  question?: string | null;
  options?: string[] | null;
  correctAnswer?: number | null;
  isCompleted: boolean;
  previousAnswer?: number;
  wasCorrect?: boolean;
  onComplete: (data: { quizAnswer: number }) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(
    previousAnswer ?? null
  );
  const [submitted, setSubmitted] = useState(isCompleted);
  const [showResult, setShowResult] = useState(isCompleted);

  if (!question || !options || options.length === 0) return null;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setSubmitted(true);
    setShowResult(true);
    onComplete({ quizAnswer: selectedAnswer });
  };

  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div className={`p-4 rounded-lg border-2 ${
      showResult
        ? isCorrect || wasCorrect
          ? "border-green-300 bg-green-50"
          : "border-red-300 bg-red-50"
        : "border-purple-300 bg-purple-50"
    }`}>
      <div className="flex items-start gap-2 mb-4">
        <span className="text-xl">❓</span>
        <h4 className="font-medium text-gray-800">{question}</h4>
      </div>

      <div className="space-y-2 ml-7">
        {options.map((option, index) => (
          <label
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              submitted
                ? index === correctAnswer
                  ? "border-green-400 bg-green-100"
                  : index === selectedAnswer && index !== correctAnswer
                  ? "border-red-400 bg-red-100"
                  : "border-gray-200 bg-white"
                : selectedAnswer === index
                ? "border-purple-400 bg-white"
                : "border-gray-200 bg-white hover:border-purple-300"
            }`}
          >
            <input
              type="radio"
              name={`quiz-${question}`}
              value={index}
              checked={selectedAnswer === index}
              onChange={() => !submitted && setSelectedAnswer(index)}
              disabled={submitted}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-700">{option}</span>
            {submitted && index === correctAnswer && (
              <span className="ml-auto text-green-600">✓ Correct</span>
            )}
            {submitted && index === selectedAnswer && index !== correctAnswer && (
              <span className="ml-auto text-red-600">✗</span>
            )}
          </label>
        ))}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedAnswer === null}
          className="mt-4 ml-7 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit Answer
        </button>
      )}

      {showResult && (
        <div className={`mt-4 ml-7 p-3 rounded-lg ${
          isCorrect || wasCorrect ? "bg-green-100" : "bg-amber-100"
        }`}>
          {isCorrect || wasCorrect ? (
            <p className="text-green-700 font-medium">
              🎉 Correct! Great job!
            </p>
          ) : (
            <p className="text-amber-700">
              Not quite - the correct answer is highlighted above. Review and continue!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Image Block
function ImageBlock({
  url,
  alt,
  caption,
}: {
  url?: string | null;
  alt?: string | null;
  caption?: string | null;
}) {
  if (!url) return null;

  return (
    <figure className="rounded-lg overflow-hidden">
      <img
        src={url}
        alt={alt || "Content image"}
        className="w-full max-h-96 object-contain bg-gray-100"
      />
      {caption && (
        <figcaption className="text-sm text-gray-500 text-center mt-2 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Video Block
function VideoBlock({
  url,
  provider,
}: {
  url?: string | null;
  provider?: string | null;
}) {
  if (!url) return null;

  const getEmbedUrl = (): string | null => {
    if (provider === "youtube") {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    if (provider === "vimeo") {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
          Watch video →
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title="Video content"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

"use client";

import { useState, ReactNode } from "react";
import { trackFAQOpen, trackFAQClose, trackAccordionToggle } from "@/lib/tracking/eventTracking";

interface TrackedAccordionItemProps {
  id?: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isFAQ?: boolean; // Use FAQ-specific tracking events
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

/**
 * An accordion item that tracks opens and closes
 *
 * Usage:
 * <TrackedAccordionItem
 *   title="What is the franchise fee?"
 *   id="faq-franchise-fee"
 *   isFAQ
 * >
 *   The franchise fee is $45,000...
 * </TrackedAccordionItem>
 */
export function TrackedAccordionItem({
  id,
  title,
  children,
  defaultOpen = false,
  isFAQ = false,
  className = "",
  titleClassName = "",
  contentClassName = "",
}: TrackedAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);

    if (isFAQ) {
      if (newState) {
        trackFAQOpen(title, id);
      } else {
        trackFAQClose(title, id);
      }
    } else {
      trackAccordionToggle(title, newState, id);
    }
  };

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <button
        type="button"
        className={`w-full flex justify-between items-center py-4 text-left font-medium ${titleClassName}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={id ? `${id}-content` : undefined}
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={id ? `${id}-content` : undefined}
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[1000px] pb-4" : "max-h-0"} ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

interface TrackedFAQListProps {
  items: Array<{
    id?: string;
    question: string;
    answer: ReactNode;
  }>;
  className?: string;
}

/**
 * A complete FAQ list with tracking
 *
 * Usage:
 * <TrackedFAQList
 *   items={[
 *     { question: "What is the franchise fee?", answer: "The franchise fee is..." },
 *     { question: "How long is training?", answer: "Training takes..." },
 *   ]}
 * />
 */
export function TrackedFAQList({ items, className = "" }: TrackedFAQListProps) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <TrackedAccordionItem
          key={item.id || index}
          id={item.id || `faq-${index}`}
          title={item.question}
          isFAQ
        >
          {item.answer}
        </TrackedAccordionItem>
      ))}
    </div>
  );
}

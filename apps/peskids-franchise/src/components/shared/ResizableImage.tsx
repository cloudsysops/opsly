"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";

// ─── Node View Component ─────────────────────────────────────────────────────

function ResizableImageView(props: ReactNodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const { src, alt, title, width } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);

      const startX = e.clientX;
      const startWidth = containerRef.current?.offsetWidth || 300;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(100, startWidth + diff);
        updateAttributes({ width: newWidth });
      };

      const onMouseUp = () => {
        setResizing(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper className="inline-block relative" data-drag-handle>
      <div
        ref={containerRef}
        className={`relative inline-block group ${selected ? "ring-2 ring-brand-navy ring-offset-2 rounded-lg" : ""}`}
        style={{ width: width ? `${width}px` : "auto", maxWidth: "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || ""}
          title={title || ""}
          className="block rounded-lg max-w-full h-auto"
          style={{ width: "100%" }}
          draggable={false}
        />
        {/* Resize handle */}
        {(selected || resizing) && (
          <div
            onMouseDown={onMouseDown}
            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100"
            style={{ opacity: resizing ? 1 : undefined }}
          >
            <div className="w-1.5 h-10 bg-brand-navy/60 rounded-full" />
          </div>
        )}
        {/* Size indicator while resizing */}
        {resizing && width && (
          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {Math.round(width)}px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ─── TipTap Extension ────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
      }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create({
  name: "resizableImage",

  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          const widthAttr = element.getAttribute("width") || element.style.width;
          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt"),
            title: element.getAttribute("title"),
            width: widthAttr ? parseInt(widthAttr, 10) || null : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    if (attrs.width) {
      attrs.style = `width: ${attrs.width}px`;
    }
    return ["img", mergeAttributes({ class: "rounded-lg max-w-full" }, attrs)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setResizableImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

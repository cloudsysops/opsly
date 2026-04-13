import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageLead(props: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  const { children, className } = props;
  return (
    <p className={cn("animate-fade-in max-w-2xl text-sm leading-relaxed text-neutral-400", className)}>
      {children}
    </p>
  );
}

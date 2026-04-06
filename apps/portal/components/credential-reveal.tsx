"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const REVEAL_SECONDS = 30;

type CredentialRevealProps = {
  password: string | null;
};

export function CredentialReveal({ password }: CredentialRevealProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!visible || secondsLeft <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setVisible(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [visible, secondsLeft]);

  const reveal = useCallback(() => {
    if (!password || password.length === 0) {
      return;
    }
    setVisible(true);
    setSecondsLeft(REVEAL_SECONDS);
  }, [password]);

  if (!password) {
    return <span className="font-mono text-sm text-ops-gray">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm">
        {visible ? password : "••••••••"}
      </span>
      {visible && secondsLeft > 0 ? (
        <span className="text-xs text-ops-gray">({secondsLeft}s)</span>
      ) : null}
      <Button type="button" variant="ghost" size="sm" onClick={reveal}>
        Revelar
      </Button>
    </div>
  );
}

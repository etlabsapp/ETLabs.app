"use client";

import { useState, useEffect, useRef } from "react";
import "@/styles/splitflap.css";
import { playFlipClick } from "@/lib/flipSound";

const FLIP_DURATION = 150;
const FLIP_SETTLE = 300;

type Props = {
  char: string;
  className?: string;
  /** When this value changes, force one flip animation (and sound) without changing the character */
  triggerFlip?: number;
};

export function SplitFlapCell({ char, className = "", triggerFlip }: Props) {
  const [displayChar, setDisplayChar] = useState(char);
  const [flipFromChar, setFlipFromChar] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevCharRef = useRef(char);
  const prevTriggerRef = useRef(triggerFlip ?? 0);

  useEffect(() => {
    const nextChar = char;
    if (nextChar === prevCharRef.current) return;
    playFlipClick();
    setFlipFromChar(prevCharRef.current);
    prevCharRef.current = nextChar;
    setIsFlipping(true);

    const t1 = setTimeout(() => {
      setDisplayChar(nextChar);
      setFlipFromChar(null);
    }, FLIP_DURATION);

    const t2 = setTimeout(() => {
      setIsFlipping(false);
    }, FLIP_SETTLE);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [char]);

  useEffect(() => {
    if (triggerFlip == null || triggerFlip === prevTriggerRef.current) return;
    prevTriggerRef.current = triggerFlip;
    playFlipClick();
    setFlipFromChar(displayChar);
    setIsFlipping(true);
    const t1 = setTimeout(() => setFlipFromChar(null), FLIP_DURATION);
    const t2 = setTimeout(() => setIsFlipping(false), FLIP_SETTLE);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [triggerFlip, displayChar]);

  const topChar = isFlipping && flipFromChar !== null ? flipFromChar : displayChar;
  const bottomChar = displayChar;

  return (
    <div
      className={`splitflap-cell flip-cell font-mono ${isFlipping ? "flipping" : ""} ${className}`}
      role="img"
      aria-label={displayChar === " " ? "space" : displayChar}
    >
      <div className="flip-cell-inner">
        <div className="flip-cell-half flip-cell-half-top">
          <span>{topChar}</span>
        </div>
        <div className="flip-cell-half flip-cell-half-bottom">
          <span>{bottomChar}</span>
        </div>
      </div>
    </div>
  );
}

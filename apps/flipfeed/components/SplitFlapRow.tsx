"use client";

import { useMemo } from "react";
import { SplitFlapCell } from "./SplitFlapCell";
import { TOTAL_ROW_LENGTH } from "@/lib/normalize";
import { isValidChar } from "@/lib/constants";

type Props = {
  displayString: string;
  cellSize?: "sm" | "md" | "lg";
  /** When this value changes, every cell in the row does one flip animation (and sound) */
  triggerFlip?: number;
};

export function SplitFlapRow({ displayString, cellSize = "md", triggerFlip }: Props) {
  const chars = useMemo(() => {
    const padded = displayString.padEnd(TOTAL_ROW_LENGTH, " ").slice(0, TOTAL_ROW_LENGTH);
    return padded.split("").map((c) => (isValidChar(c) ? c : " "));
  }, [displayString]);

  const sizeClass =
    cellSize === "lg"
      ? "w-6 h-8 text-lg min-w-[24px]"
      : cellSize === "sm"
        ? "w-4 h-5 text-xs min-w-[16px]"
        : "w-5 h-7 text-sm min-w-[20px]";

  return (
    <div className="flex gap-[var(--flipfeed-gap)] items-stretch">
      {chars.map((char, i) => (
        <SplitFlapCell key={i} char={char} className={sizeClass} triggerFlip={triggerFlip} />
      ))}
    </div>
  );
}

"use client";

import { COLUMN_WIDTHS } from "@/lib/constants";
import { useMemo } from "react";

type Props = {
  cellSize?: "sm" | "md" | "lg";
};

function pad(str: string, len: number): string {
  return str.padEnd(len, " ");
}

export function BoardHeader({ cellSize = "md" }: Props) {
  const headerString = useMemo(
    () =>
      pad("RANK", COLUMN_WIDTHS.RANK) +
      pad("APP NAME", COLUMN_WIDTHS.NAME) +
      pad("COUNTRY", COLUMN_WIDTHS.COUNTRY) +
      pad("CATEGORY", COLUMN_WIDTHS.CATEGORY),
    []
  );

  const sizeClass =
    cellSize === "lg"
      ? "w-6 h-8 text-lg min-w-[24px]"
      : cellSize === "sm"
        ? "w-4 h-5 text-xs min-w-[16px]"
        : "w-5 h-7 text-sm min-w-[20px]";

  return (
    <div className="flex gap-[var(--flipfeed-gap)] items-stretch text-[var(--flipfeed-muted)] font-mono">
      {headerString.split("").map((char, i) => (
        <div
          key={i}
          className={`splitflap-cell flex items-center justify-center ${sizeClass}`}
        >
          {char}
        </div>
      ))}
    </div>
  );
}

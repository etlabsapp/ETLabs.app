"use client";

import { useEffect } from "react";

export default function RemoveRootLoading() {
  useEffect(() => {
    const el = document.getElementById("root-loading");
    if (el) el.remove();
  }, []);
  return null;
}

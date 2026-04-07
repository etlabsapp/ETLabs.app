/** Short messages only — real fix is env vars in Vercel + redeploy. */
export function describeAuthFailure(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err);

  if (msg === "missing_supabase_env") {
    return "Supabase keys aren’t on the server. Vercel → Environment Variables → add both NEXT_PUBLIC_* values → Redeploy.";
  }
  if (msg === "Failed to fetch" || msg === "Load failed") {
    return "Can’t reach Supabase. Check those env vars in Vercel, redeploy, and that the Supabase project isn’t paused.";
  }

  return msg;
}

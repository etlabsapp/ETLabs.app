import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Returns the current user's tracked apps (same data as dashboard). Used by FlipFeed board for ET Labs app widget. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tracked_apps")
    .select("id, app_name, app_store_id, download_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserConfig } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("user_config")
    .select("config")
    .eq("user_id", user.id)
    .single();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const config: UserConfig = data?.config ?? { widgets: [] };
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const config: UserConfig = {
    widgets: Array.isArray(body.widgets) ? body.widgets : [],
  };
  const { error } = await supabase
    .from("user_config")
    .upsert(
      { user_id: user.id, config, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(config);
}

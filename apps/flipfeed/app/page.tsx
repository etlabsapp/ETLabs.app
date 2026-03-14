import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Landing from "./Landing";
import BoardWrapper from "./BoardWrapper";
import { BoardErrorBoundary } from "./BoardErrorBoundary";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <Landing />;
  }
  return (
    <BoardErrorBoundary>
      <BoardWrapper />
    </BoardErrorBoundary>
  );
}

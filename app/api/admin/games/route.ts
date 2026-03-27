import { getCurrentUserAccess } from "@/lib/permissions-server";
import { getAllGamesForAdmin } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const games = await getAllGamesForAdmin();
    return NextResponse.json(games, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/games]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

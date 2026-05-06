import { getAllReviewsForAdmin } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

import { requireFounderDiscordLive } from "@/lib/require-founder-live";
export async function GET() {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const reviews = await getAllReviewsForAdmin();
    return NextResponse.json(reviews, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/reviews]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

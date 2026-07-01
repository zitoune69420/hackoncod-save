import { NextRequest, NextResponse } from "next/server";
import { buildAdminStatsModel } from "@/lib/analytics/build-admin-stats-model";
import { requireFounderDiscordLive } from "@/lib/require-founder-live";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireFounderDiscordLive();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status },
    );
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(
    90,
    Math.max(1, Number.parseInt(daysParam ?? "7", 10) || 7),
  );

  const payload = await buildAdminStatsModel(days);
  return NextResponse.json(payload);
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { buildAdminStatsModel } from "@/lib/analytics/build-admin-stats-model";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated || access.role !== "founder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(
    90,
    Math.max(1, Number.parseInt(daysParam ?? "7", 10) || 7),
  );

  const payload = await buildAdminStatsModel(days);
  return NextResponse.json(payload);
}

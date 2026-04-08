import { deleteBannedIpById } from "@/lib/banned/site-ban-db";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    await deleteBannedIpById(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/banned-ips DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

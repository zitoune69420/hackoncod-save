import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  pathMatchesModsScope,
  type AdminModsScope,
} from "@/lib/mods-orphan-files";
import { isModsObjectPath } from "@/lib/mods-storage";
import { isUuid } from "@/lib/security/is-uuid";
import { updateCheat } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function parseBody(raw: unknown): {
  cheatId: string;
  objectPath: string;
  scope: AdminModsScope;
} | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const cheatId = typeof o.cheatId === "string" ? o.cheatId.trim() : "";
  const objectPath = typeof o.objectPath === "string" ? o.objectPath.trim() : "";
  const scopeRaw = o.scope;
  const scope =
    scopeRaw === "server" || scopeRaw === "shop" ? scopeRaw : null;
  if (!cheatId || !objectPath || !scope) return null;
  if (!isUuid(cheatId)) return null;
  return { cheatId, objectPath, scope };
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseBody(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid body (cheatId, objectPath, scope)" },
        { status: 400 },
      );
    }

    if (!isModsObjectPath(parsed.objectPath)) {
      return NextResponse.json({ error: "Invalid object path" }, { status: 400 });
    }

    if (!pathMatchesModsScope(parsed.objectPath, parsed.scope)) {
      return NextResponse.json(
        { error: "Path does not match scope (server vs shop-cheats)" },
        { status: 400 },
      );
    }

    await updateCheat(parsed.cheatId, { link: parsed.objectPath });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/mods/attach]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

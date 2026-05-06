import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import {
  getAllGamesForAdmin,
  insertGame,
  type GameUpsertRow,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const games = await getAllGamesForAdmin();
    return NextResponse.json(games, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/games]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

function nullIfEmpty(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizeGameBody(raw: unknown): GameUpsertRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) return null;

  return {
    title,
    description: nullIfEmpty(o.description),
    image: nullIfEmpty(o.image),
    steam: nullIfEmpty(o.steam),
    link: nullIfEmpty(o.link),
    client: nullIfEmpty(o.client),
    displayed: Boolean(o.displayed),
  };
}

export async function POST(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const body = await req.json().catch(() => null);
    const row = normalizeGameBody(body);
    if (!row) {
      return NextResponse.json(
        { error: "Invalid body (title required)" },
        { status: 400 },
      );
    }

    const { id } = await insertGame(row);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/games POST]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

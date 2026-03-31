import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  getAllVideosForAdmin,
  insertVideo,
  type VideoUpsertRow,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const videos = await getAllVideosForAdmin();
    return NextResponse.json(videos, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/videos]", message);
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

function normalizeVideoBody(raw: unknown): VideoUpsertRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) return null;

  return {
    title,
    description: nullIfEmpty(o.description),
    image: nullIfEmpty(o.image),
    link: nullIfEmpty(o.link),
  };
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizeVideoBody(body);
    if (!row) {
      return NextResponse.json(
        { error: "Invalid body (title required)" },
        { status: 400 },
      );
    }

    const { id } = await insertVideo(row);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/videos POST]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

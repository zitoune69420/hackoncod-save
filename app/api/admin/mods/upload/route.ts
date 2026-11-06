import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import {
  MODS_STORAGE_BUCKET,
  normalizeModsUploadPrefix,
} from "@/lib/mods-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const MAX_BYTES = 120 * 1024 * 1024;

function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^\w.\-()+]/g, "_");
  return cleaned.slice(0, 180) || "file";
}

/**
 * Renvoie une URL d'upload signée : le navigateur envoie le fichier directement
 * à Supabase Storage (le corps d'une Vercel Function est limité à 4,5 Mo).
 */
export async function POST(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      fileName?: unknown;
      size?: unknown;
      folder?: unknown;
    } | null;
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    const size = typeof body?.size === "number" ? body.size : 0;
    const prefix = normalizeModsUploadPrefix(
      typeof body?.folder === "string" ? body.folder : undefined,
    );

    if (!fileName || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)` },
        { status: 413 },
      );
    }

    const filePart = `${crypto.randomUUID()}_${safeFileName(fileName)}`;
    const objectPath =
      prefix === "root" ? filePart : `${prefix}/${filePart}`;
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(MODS_STORAGE_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error("[api/admin/mods/upload]", error);
      const safeMessage =
        process.env.NODE_ENV === "production"
          ? "Upload failed"
          : (error?.message ?? "Upload failed");
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }

    return NextResponse.json({
      path: objectPath,
      signedUrl: data.signedUrl,
      folder: prefix,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/mods/upload]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Upload failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

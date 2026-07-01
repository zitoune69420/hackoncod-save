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

export async function POST(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const prefix = normalizeModsUploadPrefix(
      typeof formData.get("folder") === "string"
        ? (formData.get("folder") as string)
        : undefined,
    );

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)` },
        { status: 413 },
      );
    }

    const filePart = `${crypto.randomUUID()}_${safeFileName(file.name)}`;
    const objectPath =
      prefix === "root" ? filePart : `${prefix}/${filePart}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(MODS_STORAGE_BUCKET)
      .upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      console.error("[api/admin/mods/upload]", error);
      const safeMessage =
        process.env.NODE_ENV === "production"
          ? "Upload failed"
          : error.message;
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }

    const { data: pub } = supabase.storage
      .from(MODS_STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      url: pub.publicUrl,
      path: objectPath,
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

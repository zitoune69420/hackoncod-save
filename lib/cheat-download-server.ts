import "server-only";

import {
  parseCheatFileLink,
  storageBucketsToTry,
} from "@/lib/cheat-file-link";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveCheatDownloadUrl(
  link: string,
  ttlSeconds: number,
): Promise<
  { url: string; external?: boolean } | { error: string; status?: number }
> {
  const trimmed = link.trim();
  if (!trimmed) {
    return { error: "No file", status: 404 };
  }

  const parsed = parseCheatFileLink(trimmed);
  if (!parsed) {
    return { error: "Invalid file link", status: 400 };
  }

  if (parsed.kind === "http") {
    return { url: parsed.url, external: true };
  }

  const supabase = createAdminClient();
  const buckets = storageBucketsToTry(parsed);
  let lastMsg = "";

  for (const bucket of buckets) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(parsed.objectPath, ttlSeconds);

    if (!error && data?.signedUrl) {
      return { url: data.signedUrl };
    }
    lastMsg = error?.message ?? "unknown";
  }

  console.error(
    "[resolveCheatDownloadUrl]",
    parsed.objectPath,
    "buckets:",
    buckets.join(","),
    lastMsg,
  );
  return { error: "Could not create download URL", status: 500 };
}

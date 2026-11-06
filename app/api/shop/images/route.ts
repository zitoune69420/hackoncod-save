import { isModsObjectPath } from "@/lib/mods-storage";
import { getShopSignedImageUrl } from "@/lib/supabase/shop-queries";
import { NextRequest, NextResponse } from "next/server";

// Route publique sur le bucket `mods` : sans ce filtre, elle signait aussi les fichiers des cheats VIP.
const IMAGE_PATH_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path")?.trim() ?? "";
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  if (!isModsObjectPath(path) || !IMAGE_PATH_RE.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const url = await getShopSignedImageUrl(path);
  return NextResponse.json({ url });
}

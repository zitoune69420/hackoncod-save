import { getShopSignedImageUrl } from "@/lib/supabase/shop-queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const url = await getShopSignedImageUrl(path);
  return NextResponse.json({ url });
}

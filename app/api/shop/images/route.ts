import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";
import { getShopSignedImageUrl } from "@/lib/supabase/shop-queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await getHeadersForBetterAuth(),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const url = await getShopSignedImageUrl(path);
  return NextResponse.json({ url });
}

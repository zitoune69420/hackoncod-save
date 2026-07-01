import { getPublicShopCheatsForApi } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const cheats = await getPublicShopCheatsForApi();
  return NextResponse.json(cheats);
}

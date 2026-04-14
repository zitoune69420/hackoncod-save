import { getActiveShopCheats } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const cheats = await getActiveShopCheats();
  return NextResponse.json(cheats);
}

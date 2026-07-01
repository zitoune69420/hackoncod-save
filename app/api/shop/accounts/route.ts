import { getPublicShopAccountsForApi } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const accounts = await getPublicShopAccountsForApi();
  return NextResponse.json(accounts);
}

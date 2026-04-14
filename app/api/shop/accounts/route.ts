import { getActiveShopAccounts } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const accounts = await getActiveShopAccounts();
  return NextResponse.json(accounts);
}

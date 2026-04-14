import { getActiveShopServices } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const services = await getActiveShopServices();
  return NextResponse.json(services);
}

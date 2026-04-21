import { getPublicShopServicesForApi } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const services = await getPublicShopServicesForApi();
  return NextResponse.json(services);
}

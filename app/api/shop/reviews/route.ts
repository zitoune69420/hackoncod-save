import { getVisibleShopReviews } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const reviews = await getVisibleShopReviews();
  return NextResponse.json(reviews);
}

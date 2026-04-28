import { getEnrichedVisibleShopReviews } from "@/lib/reviews/enriched-shop-reviews";
import { NextResponse } from "next/server";

export async function GET() {
  const reviews = await getEnrichedVisibleShopReviews();
  return NextResponse.json(reviews);
}

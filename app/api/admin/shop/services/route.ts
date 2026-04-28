import { requireAdminShopApiAccess } from "@/lib/admin-shop-access";
import { getShopServicesForAdmin } from "@/lib/supabase/shop-queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const gate = await requireAdminShopApiAccess();
    if (!gate.ok) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: gate.status },
      );
    }
    const rows = await getShopServicesForAdmin(gate.scope);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/shop/services]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

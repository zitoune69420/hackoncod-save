import { gameExistsByTitle } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

const MAX_TITLE_LEN = 256;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim() ?? "";
  if (!title || title.length > MAX_TITLE_LEN) {
    return NextResponse.json(
      { error: "Invalid title", exists: false },
      { status: 400 },
    );
  }

  const exists = await gameExistsByTitle(title);
  return NextResponse.json({ exists });
}

import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";
import {
  CHEAT_REPORT_REASON_WEBHOOK_LABEL_FR,
  isCheatReportReasonKey,
} from "@/lib/cheat-report-reasons";
import {
  executeDiscordWebhook,
  type DiscordApiEmbed,
} from "@/lib/discord/webhook";
import { getDiscordSuggestionWebhookUrl } from "@/lib/env";
import { isUuid } from "@/lib/security/is-uuid";
import { getPublicDashboardCheatForReport } from "@/lib/supabase/queries";
import { NextRequest, NextResponse } from "next/server";

const COMMENT_MAX = 2000;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await getHeadersForBetterAuth(),
    });
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = getDiscordSuggestionWebhookUrl();
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Suggestions webhook not configured" },
        { status: 503 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const o = body as Record<string, unknown>;
    const cheatId = typeof o.cheatId === "string" ? o.cheatId.trim() : "";
    const reasonKeyRaw = typeof o.reasonKey === "string" ? o.reasonKey.trim() : "";
    const comment =
      typeof o.comment === "string" ? o.comment.trim().slice(0, COMMENT_MAX) : "";

    if (!isUuid(cheatId)) {
      return NextResponse.json({ error: "Invalid cheat" }, { status: 400 });
    }
    if (!isCheatReportReasonKey(reasonKeyRaw)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    const canonical = await getPublicDashboardCheatForReport(cheatId);
    if (!canonical) {
      return NextResponse.json({ error: "Cheat not found" }, { status: 404 });
    }

    const authorName = user.name?.trim() || "Unknown";
    const authorId = user.id.trim();
    const footerText = truncate(`${authorName} · ${authorId}`, 2040);
    const reasonLabel = CHEAT_REPORT_REASON_WEBHOOK_LABEL_FR[reasonKeyRaw];

    const fields: NonNullable<DiscordApiEmbed["fields"]> = [
      { name: "Cheat", value: truncate(canonical.name, 1020), inline: false },
      { name: "Jeu (COD)", value: truncate(canonical.gameTitle, 1020), inline: true },
      { name: "ID cheat", value: canonical.id, inline: true },
      { name: "Motif", value: truncate(reasonLabel, 1020), inline: false },
    ];
    if (comment) {
      fields.push({
        name: "Détails",
        value: truncate(comment, 1020),
        inline: false,
      });
    }

    const embed: DiscordApiEmbed = {
      title: "Signalement de cheat",
      color: 0xed4245,
      fields,
      footer: { text: footerText },
    };

    try {
      await executeDiscordWebhook(webhookUrl, { embeds: [embed] });
    } catch (e) {
      console.error("[api/cheats/report] webhook", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      const safeMessage =
        process.env.NODE_ENV === "production"
          ? "Webhook request failed"
          : message;
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/cheats/report]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

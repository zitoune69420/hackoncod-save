import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  executeDiscordWebhook,
  type DiscordApiEmbed,
} from "@/lib/discord/webhook";
import { getDiscordSuggestionWebhookUrl } from "@/lib/env";
import { NextResponse } from "next/server";

const MAX_DETAILS = 3900;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function POST(req: Request) {
  const access = await getCurrentUserAccess({ source: "db" });
  if (!access.isAuthenticated || !access.session?.user) {
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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const u = access.session.user;
  const authorName = u.name?.trim() || "Unknown";
  const authorId = u.id?.trim() || "—";
  const footerText = truncate(`${authorName} · ${authorId}`, 2040);

  const kind = (body as { kind?: unknown }).kind;
  if (kind === "cheat") {
    const b = body as {
      kind: string;
      gameTitle?: unknown;
      requestGameAddition?: unknown;
      details?: unknown;
    };
    const gameTitle =
      typeof b.gameTitle === "string" ? b.gameTitle.trim() : "";
    const details = typeof b.details === "string" ? b.details.trim() : "";
    if (!gameTitle) {
      return NextResponse.json({ error: "gameTitle required" }, { status: 400 });
    }
    if (!details) {
      return NextResponse.json({ error: "details required" }, { status: 400 });
    }
    if (details.length > MAX_DETAILS) {
      return NextResponse.json({ error: "details too long" }, { status: 400 });
    }
    const requestGameAddition = Boolean(b.requestGameAddition);

    const embed: DiscordApiEmbed = {
      title: "Suggestion de cheat",
      description: truncate(details, 4090),
      color: 0x5865f2,
      fields: [
        {
          name: "Jeu (COD)",
          value: truncate(gameTitle, 1020),
          inline: false,
        },
        {
          name: "Demande d’ajout du jeu",
          value: requestGameAddition ? "Oui" : "Non",
          inline: true,
        },
      ],
      footer: { text: footerText },
    };

    try {
      await executeDiscordWebhook(webhookUrl, { embeds: [embed] });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[suggestions/discord] cheat", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      const safeMessage =
        process.env.NODE_ENV === "production"
          ? "Webhook request failed"
          : message;
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }
  }

  if (kind === "game") {
    const b = body as { kind: string; details?: unknown };
    const details = typeof b.details === "string" ? b.details.trim() : "";
    if (!details) {
      return NextResponse.json({ error: "details required" }, { status: 400 });
    }
    if (details.length > MAX_DETAILS) {
      return NextResponse.json({ error: "details too long" }, { status: 400 });
    }

    const embed: DiscordApiEmbed = {
      title: "Suggestion de jeu",
      description: truncate(details, 4090),
      color: 0x57f287,
      footer: { text: footerText },
    };

    try {
      await executeDiscordWebhook(webhookUrl, { embeds: [embed] });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[suggestions/discord] game", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      const safeMessage =
        process.env.NODE_ENV === "production"
          ? "Webhook request failed"
          : message;
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
}

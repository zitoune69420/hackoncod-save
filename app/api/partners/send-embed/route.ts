import { canAccessPartnerTools } from "@/lib/permissions";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { NextResponse } from "next/server";
import {
  executeDiscordWebhook,
  type DiscordApiEmbed,
} from "@/lib/discord/webhook";

const PARTNER_WEBHOOKS: Record<string, string | undefined> = {
  infarcted: process.env.DISCORD_WEBHOOK_PARTNER_INFARCTED,
  amibot: process.env.DISCORD_WEBHOOK_PARTNER_AMIBOT,
  guysmodz: process.env.DISCORD_WEBHOOK_PARTNER_GUYSMODZ,
  nolove: process.env.DISCORD_WEBHOOK_PARTNER_NOLOVE,
};

type SendEmbedBody = {
  partner?: string;
  mentionEveryone?: boolean;
  embed: {
    title?: string;
    description?: string;
    color?: string; // hex e.g. "#5865F2"
    footer?: string;
    thumbnail?: string;
    image?: string;
    author?: {
      name?: string;
      icon_url?: string;
    };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  };
};

export async function POST(req: Request) {
  const access = await getCurrentUserAccess({ source: "live" });
  if (!access.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessPartnerTools(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let body: SendEmbedBody;
  try {
    body = (await req.json()) as SendEmbedBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve webhook URL
  const partnerKey = body.partner ?? "infarcted";
  const webhookUrl = PARTNER_WEBHOOKS[partnerKey];
  if (!webhookUrl?.trim()) {
    return NextResponse.json(
      {
        error: `No webhook configured for partner "${partnerKey}". Set DISCORD_WEBHOOK_PARTNER_${partnerKey.toUpperCase()} in your env.`,
      },
      { status: 503 },
    );
  }

  // Build Discord embed
  const raw = body.embed;
  const colorInt = raw.color
    ? parseInt(raw.color.replace("#", ""), 16)
    : 0x5865f2;

  const embed: DiscordApiEmbed = {
    title: raw.title || undefined,
    description: raw.description || undefined,
    color: colorInt,
    thumbnail: raw.thumbnail?.trim()
      ? { url: raw.thumbnail.trim() }
      : undefined,
    image: raw.image?.trim() ? { url: raw.image.trim() } : undefined,
    footer: raw.footer?.trim() ? { text: raw.footer.trim() } : undefined,
    fields: raw.fields?.filter((f) => f.name && f.value) ?? undefined,
  };

  if (raw.author?.name?.trim()) {
    (embed as Record<string, unknown>)["author"] = {
      name: raw.author.name.trim(),
      icon_url: raw.author.icon_url?.trim() || undefined,
    };
  }

  // Send
  try {
    await executeDiscordWebhook(webhookUrl, {
      content: body.mentionEveryone ? "@everyone" : undefined,
      embeds: [embed],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[partners/send-embed]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

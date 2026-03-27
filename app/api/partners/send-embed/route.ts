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

const PARTNER_KEYS = Object.keys(PARTNER_WEBHOOKS);

const DISCORD_MAX_FIELDS = 25;
const DISCORD_FIELD_NAME_LEN = 256;
const DISCORD_FIELD_VALUE_LEN = 1024;

function parseEmbedColor(hex: string | undefined): number {
  if (!hex || typeof hex !== "string") return 0x5865f2;
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{1,6}$/.test(cleaned)) return 0x5865f2;
  const n = parseInt(cleaned, 16);
  if (!Number.isFinite(n) || n < 0 || n > 0xffffff) return 0x5865f2;
  return n;
}

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

  if (!body.embed || typeof body.embed !== "object") {
    return NextResponse.json({ error: "embed required" }, { status: 400 });
  }

  // Resolve webhook URL (clé strictement allowlistée)
  const partnerKey =
    typeof body.partner === "string" && body.partner.trim()
      ? body.partner.trim()
      : "infarcted";
  if (!PARTNER_KEYS.includes(partnerKey)) {
    return NextResponse.json({ error: "Invalid partner" }, { status: 400 });
  }
  const webhookUrl = PARTNER_WEBHOOKS[partnerKey];
  if (!webhookUrl?.trim()) {
    return NextResponse.json(
      { error: "Partner webhook not configured" },
      { status: 503 },
    );
  }

  // @everyone : fondateurs uniquement (évite l’abus par un compte partenaire)
  const mentionEveryone =
    Boolean(body.mentionEveryone) && access.role === "founder";

  // Build Discord embed
  const raw = body.embed;
  const colorInt = parseEmbedColor(
    typeof raw.color === "string" ? raw.color : undefined,
  );

  const fieldsRaw = Array.isArray(raw.fields)
    ? raw.fields.slice(0, DISCORD_MAX_FIELDS)
    : undefined;
  const fields =
    fieldsRaw
      ?.map((f) => {
        if (!f || typeof f.name !== "string" || typeof f.value !== "string") {
          return null;
        }
        const name = f.name.slice(0, DISCORD_FIELD_NAME_LEN).trim();
        const value = f.value.slice(0, DISCORD_FIELD_VALUE_LEN).trim();
        if (!name || !value) return null;
        return { name, value, inline: Boolean(f.inline) };
      })
      .filter((f): f is NonNullable<typeof f> => f != null) ?? undefined;

  const embed: DiscordApiEmbed = {
    title: raw.title || undefined,
    description: raw.description || undefined,
    color: colorInt,
    thumbnail: raw.thumbnail?.trim()
      ? { url: raw.thumbnail.trim() }
      : undefined,
    image: raw.image?.trim() ? { url: raw.image.trim() } : undefined,
    footer: raw.footer?.trim() ? { text: raw.footer.trim() } : undefined,
    fields: fields?.length ? fields : undefined,
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
      content: mentionEveryone ? "@everyone" : undefined,
      embeds: [embed],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[partners/send-embed]", e);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Webhook request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

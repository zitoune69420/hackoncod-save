import type { DiscordApiEmbed } from "./webhook"

export type LoginEmbedDiscordExtras = {
  /** ID Discord (snowflake) si connu */
  discordUserId?: string | null
  locale?: string | null
  verified?: boolean | null
  mfaEnabled?: boolean | null
  twoFactor?: boolean | null
  emailVerified?: boolean | null
  premiumType?: number | null
  premiumSince?: string | null
  guildPremiumSince?: string | null
  flags?: number | null
  globalName?: string | null
  displayName?: string | null
  pronouns?: string | null
  theme?: string | null
  phone?: string | null
  nsfwAllowed?: boolean | null
  contentFilter?: string | null
  hasBanner?: boolean | null
  guildCount?: number | null
  ownedGuildCount?: number | null
}

export type LoginEmbedUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export type LoginEmbedRequestMeta = {
  ip: string
  userAgent: string
  connectedAt: Date
}

const NA = "N/A"

function boolEmoji(v: boolean | null | undefined): string {
  if (v === true) return "✅"
  if (v === false) return "❌"
  return NA
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/**
 * Embed riche « nouvelle connexion » (modèle type screenshot sécurité).
 */
export function buildLoginConnectionEmbed(
  user: LoginEmbedUser,
  request: LoginEmbedRequestMeta,
  discord: LoginEmbedDiscordExtras = {},
  options?: { bannerImageUrl?: string | null },
): DiscordApiEmbed {
  const tag =
    discord.globalName && user.name
      ? `${discord.globalName} (${user.name})`
      : user.name?.trim() || NA

  const descLines = [`**${tag}**`, "", "*Compte Discord connecté avec succès*"]

  const idLine = discord.discordUserId ?? user.id

  const fmtFr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const fmtShort = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const connectedAt = request.connectedAt
  const tsIso = connectedAt.toISOString()

  const baseInfo = [
    `**ID:** \`${idLine}\``,
    `**Email:** ${user.email ? `\`${user.email}\`` : NA}`,
    `**Locale:** ${discord.locale ?? NA}`,
    `**Timezone:** ${NA}`,
  ].join("\n")

  const securityBlock = [
    `**Vérifié:** ${boolEmoji(discord.verified === true)}`,
    `**MFA:** ${boolEmoji(discord.mfaEnabled === true)}`,
    `**2FA:** ${boolEmoji(discord.twoFactor === true)}`,
    `**Email vérifié:** ${boolEmoji(discord.emailVerified === true)}`,
  ].join("\n")

  const premiumBlock = [
    `**Premium:** ${discord.premiumType != null ? `Type ${discord.premiumType}` : NA}`,
    `**Depuis:** ${discord.premiumSince ?? NA}`,
    `**Guild Premium:** ${discord.guildPremiumSince ?? NA}`,
    `**Flags:** ${discord.flags != null ? String(discord.flags) : NA}`,
  ].join("\n")

  const persoBlock = [
    `**Global Name:** ${discord.globalName ?? user.name ?? NA}`,
    `**Display Name:** ${discord.displayName ?? NA}`,
    `**Pronouns:** ${discord.pronouns ?? NA}`,
    `**Theme:** ${discord.theme ?? NA}`,
  ].join("\n")

  const networkBlock = [
    `**IP:** \`${request.ip}\``,
    `**User Agent:**\n\`\`\`${truncate(request.userAgent, 900)}\`\`\``,
    `**Timestamp:** ${fmtFr.format(connectedAt)}`,
    `**Heure locale:** ${fmtShort.format(connectedAt)}`,
  ].join("\n")

  const guildBlock = [
    `**Nombre:** ${discord.guildCount != null ? `${discord.guildCount} serveurs` : NA}`,
    `**Propriétaire de:** ${discord.ownedGuildCount != null ? `${discord.ownedGuildCount} serveurs` : NA}`,
  ].join("\n")

  const contactBlock = [
    `**Téléphone:** ${discord.phone ?? NA}`,
    `**NSFW autorisé:** ${boolEmoji(discord.nsfwAllowed === true)}`,
    `**Filtre contenu:** ${discord.contentFilter ?? NA}`,
    `**Banner:** ${boolEmoji(discord.hasBanner === true)}`,
  ].join("\n")

  const footerText = `HackOnCod Security System • ${tsIso} • ${fmtShort.format(connectedAt)}`

  const embed: DiscordApiEmbed = {
    title: "🔐 Nouvelle connexion Discord détectée",
    description: descLines.join("\n"),
    color: 0x5865f2,
    thumbnail: user.image ? { url: user.image } : undefined,
    image: options?.bannerImageUrl ? { url: options.bannerImageUrl } : undefined,
    fields: [
      { name: "📋 Informations de base", value: baseInfo, inline: false },
      { name: "🔐 Sécurité", value: securityBlock, inline: true },
      { name: "💎 Premium & Compte", value: premiumBlock, inline: true },
      { name: "🎨 Personnalisation", value: persoBlock, inline: true },
      { name: "🌐 Réseau & Connexion", value: networkBlock, inline: false },
      { name: "🏠 Serveurs Discord", value: guildBlock, inline: true },
      { name: "📘 Contact & Contenu", value: contactBlock, inline: true },
    ],
    footer: { text: truncate(footerText, 2040) },
    timestamp: tsIso,
  }

  return embed
}

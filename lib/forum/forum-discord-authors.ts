import "server-only";

import { getDiscordUserPresentationsForUserIds } from "@/lib/discord/guild-member-display";
import { getAppUserForumDisplayByIds } from "@/lib/supabase/app-users";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

function isDiscordSnowflake(id: string): boolean {
  return DISCORD_SNOWFLAKE_RE.test(id);
}

export type ForumAuthorView = {
  discordId: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Résout pseudo + avatar pour des `user_id` forum : snowflake Discord et/ou ID Better Auth.
 */
export async function resolveForumAuthors(
  rawIds: readonly (string | null | undefined)[],
): Promise<Map<string, ForumAuthorView>> {
  const ids = [
    ...new Set(
      rawIds
        .map((x) => String(x ?? "").trim())
        .filter((s) => s.length > 0),
    ),
  ];
  const snowflakeIds = ids.filter(isDiscordSnowflake);
  const appIds = ids.filter((id) => !isDiscordSnowflake(id));

  const [pres, appDisplays] = await Promise.all([
    getDiscordUserPresentationsForUserIds(snowflakeIds),
    getAppUserForumDisplayByIds(appIds),
  ]);

  const out = new Map<string, ForumAuthorView>();
  for (const id of ids) {
    if (isDiscordSnowflake(id)) {
      const p = pres.get(id);
      out.set(id, {
        discordId: id,
        displayName:
          p?.displayName?.trim() || `Membre ${id.slice(-4)}`,
        avatarUrl: p?.avatarUrl ?? null,
      });
    } else {
      const app = appDisplays.get(id);
      const display =
        app?.name?.trim() ||
        app?.email?.trim() ||
        `Membre ${id.slice(-4)}`;
      out.set(id, {
        discordId: id,
        displayName: display,
        avatarUrl: null,
      });
    }
  }
  return out;
}

export function forumDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

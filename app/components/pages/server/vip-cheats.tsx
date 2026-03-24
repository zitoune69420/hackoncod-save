import { headers } from "next/headers";
import { auth } from "@/app/auth";
import {
  VipCheatsPage as VipCheatsClientPage,
  type VipCheatRow,
} from "@/app/components/pages/client/vip-cheats";
import { hasPermissions } from "@/lib/permissions";
import { resolveUserRoleForUserId } from "@/lib/permissions-server";
import { getVipCheats } from "@/lib/supabase/queries";

async function getInitialVipCheats(): Promise<VipCheatRow[]> {
  const cheats = await getVipCheats();

  return cheats.map((cheat) => ({
    id: cheat.id,
    name: cheat.name,
    game: Array.isArray(cheat.game)
      ? (cheat.game[0]?.title ?? "")
      : (cheat.game?.title ?? ""),
    mode: cheat.mode,
    extension: cheat.extension,
    crack: cheat.crack,
    client: cheat.client,
    link: cheat.link,
  }));
}

export async function VipCheatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = Boolean(session?.user);
  const userRole = await resolveUserRoleForUserId(
    session?.user?.id,
    session?.user,
  );
  const canAccess = hasPermissions(userRole, ["vip"]);
  const initialData = canAccess ? await getInitialVipCheats() : [];

  return (
    <VipCheatsClientPage
      initialData={initialData}
      initialDataLoaded={canAccess}
      isAuthenticated={isAuthenticated}
      userRole={userRole}
    />
  );
}

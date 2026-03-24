import { headers } from "next/headers";
import { auth } from "@/app/auth";
import {
  SemiVipCheatsPage as SemiVipCheatsClientPage,
  type SemiVipCheatRow,
} from "@/app/components/pages/client/semivip-cheats";
import { hasPermissions } from "@/lib/permissions";
import { resolveUserRoleForUserId } from "@/lib/permissions-server";
import { getSemiVipCheats } from "@/lib/supabase/queries";

async function getInitialSemiVipCheats(): Promise<SemiVipCheatRow[]> {
  const cheats = await getSemiVipCheats();

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

export async function SemiVipCheatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = Boolean(session?.user);
  const userRole = await resolveUserRoleForUserId(
    session?.user?.id,
    session?.user,
  );
  const canAccess = hasPermissions(userRole, ["semivip"]);
  const initialData = canAccess ? await getInitialSemiVipCheats() : [];

  return (
    <SemiVipCheatsClientPage
      initialData={initialData}
      initialDataLoaded={canAccess}
      isAuthenticated={isAuthenticated}
      userRole={userRole}
    />
  );
}

import { VipCheatsPage as VipCheatsClientPage } from "@/app/components/pages/client/vip-cheats/vip-cheats";
import { getCurrentUserAccess } from "@/lib/permissions-server";

export async function VipCheatsPage() {
  const access = await getCurrentUserAccess();
  /** Pas de données VIP dans le HTML : chargement uniquement côté client après 403 API. */
  return (
    <VipCheatsClientPage
      initialData={[]}
      initialDataLoaded={false}
      isAuthenticated={access.isAuthenticated}
    />
  );
}

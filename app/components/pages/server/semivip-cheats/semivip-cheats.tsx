import { SemiVipCheatsPage as SemiVipCheatsClientPage } from "@/app/components/pages/client/semivip-cheats";
import { getCurrentUserAccess } from "@/lib/permissions-server";

export async function SemiVipCheatsPage() {
  const access = await getCurrentUserAccess();

  return (
    <SemiVipCheatsClientPage
      initialData={[]}
      initialDataLoaded={false}
      isAuthenticated={access.isAuthenticated}
    />
  );
}

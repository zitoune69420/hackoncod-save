import { Suspense } from "react";
import { UserRoleProvider } from "@/hooks/use-user-role";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { DashboardMainContent } from "@/app/dashboard/dashboard-main-content";
import { DashboardMainAreaSkeleton } from "@/app/dashboard/dashboard-main-area-skeleton";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  return (
    <UserRoleProvider>
      <DashboardShell>
        <Suspense fallback={<DashboardMainAreaSkeleton />}>
          <DashboardMainContent searchParams={sp} />
        </Suspense>
      </DashboardShell>
    </UserRoleProvider>
  );
}

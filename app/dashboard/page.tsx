import { Suspense } from "react";
import { UserRoleProvider } from "@/hooks/use-user-role";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { DashboardMainContent } from "@/app/dashboard/dashboard-main-content";

function DashboardFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
      <span className="text-sm">Loading…</span>
    </div>
  );
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  return (
    <Suspense fallback={<DashboardFallback />}>
      <UserRoleProvider>
        <DashboardShell>
          <DashboardMainContent searchParams={sp} />
        </DashboardShell>
      </UserRoleProvider>
    </Suspense>
  );
}

import { Suspense } from "react";
import { UserRoleProvider } from "@/hooks/use-user-role";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { DashboardMainContent } from "@/app/dashboard/dashboard-main-content";
import { DashboardMainAreaSkeleton } from "@/app/dashboard/dashboard-main-area-skeleton";
import { ErrorHandler } from "@/components/commons/error-handler";
import { getDashboardErrorHandlerResetKey } from "@/lib/dashboard-url";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const errorHandlerKey = getDashboardErrorHandlerResetKey(sp);
  return (
    <UserRoleProvider>
      <DashboardShell>
        <Suspense fallback={<DashboardMainAreaSkeleton />}>
          <ErrorHandler key={errorHandlerKey}>
            <DashboardMainContent searchParams={sp} />
          </ErrorHandler>
        </Suspense>
      </DashboardShell>
    </UserRoleProvider>
  );
}

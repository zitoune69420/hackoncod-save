import {
  getDashboardContentPageFromRaw,
  getDashboardPerfDays,
  getDashboardPerfDevice,
  getDashboardPerfEnv,
  getDashboardSecurityRange,
  getDashboardStatsDays,
} from "@/lib/dashboard-url";
import { AdminStatsUsersServer } from "@/app/components/pages/server/admin-stats-users";
import { AdminStatsPerformanceServer } from "@/app/components/pages/server/admin-stats-performance";
import { AdminStatsSecurityServer } from "@/app/components/pages/server/admin-stats-security";
import { DashboardPagesClient } from "@/app/dashboard/dashboard-pages-client";

export async function DashboardMainContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const contentPage = getDashboardContentPageFromRaw(searchParams);
  if (contentPage === "admin-stats-users") {
    const days = getDashboardStatsDays(searchParams);
    return <AdminStatsUsersServer days={days} />;
  }
  if (contentPage === "admin-stats-performance") {
    return (
      <AdminStatsPerformanceServer
        device={getDashboardPerfDevice(searchParams)}
        env={getDashboardPerfEnv(searchParams)}
        days={getDashboardPerfDays(searchParams)}
      />
    );
  }
  if (contentPage === "admin-stats-security") {
    return (
      <AdminStatsSecurityServer range={getDashboardSecurityRange(searchParams)} />
    );
  }
  return <DashboardPagesClient contentPage={contentPage} />;
}

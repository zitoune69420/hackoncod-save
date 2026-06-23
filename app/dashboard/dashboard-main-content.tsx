import {
  getDashboardContentPageFromRaw,
  getDashboardDownloadDays,
  getDashboardPerfDays,
  getDashboardPerfDevice,
  getDashboardPerfEnv,
  getDashboardSecurityRange,
  getDashboardStatsDays,
} from "@/lib/dashboard-url";
import { enforceDashboardPageAccess } from "@/lib/dashboard-access-guard";
import { AdminStatsUsersServer } from "@/app/components/pages/server/admin/stats-users/admin-stats-users";
import { AdminStatsDownloadsServer } from "@/app/components/pages/server/admin/stats-downloads/admin-stats-downloads";
import { AdminStatsPerformanceServer } from "@/app/components/pages/server/admin/stats-performance/admin-stats-performance";
import { AdminStatsSecurityServer } from "@/app/components/pages/server/admin/stats-security/admin-stats-security";
import { DashboardPagesClient } from "@/app/dashboard/dashboard-pages-client";
import { ForumPageServer } from "@/app/components/pages/server/forum/forum-page-server";

export async function DashboardMainContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const contentPage = getDashboardContentPageFromRaw(searchParams);
  await enforceDashboardPageAccess(contentPage);
  if (contentPage === "admin-stats-users") {
    const days = getDashboardStatsDays(searchParams);
    return <AdminStatsUsersServer days={days} />;
  }
  if (contentPage === "admin-stats-downloads") {
    return (
      <AdminStatsDownloadsServer days={getDashboardDownloadDays(searchParams)} />
    );
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
  if (contentPage === "forum") {
    return <ForumPageServer searchParams={searchParams} />;
  }
  return <DashboardPagesClient contentPage={contentPage} />;
}

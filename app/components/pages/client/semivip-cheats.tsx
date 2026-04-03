"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CommonTable } from "@/components/commons/table/table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Diamond02Icon,
  Refresh01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { ExclusiveCheatDownloadButton } from "@/app/components/commons/exclusive-cheat-download-button";
import { hasMinimumRole, type UserRole } from "@/lib/permissions";
import { useUserRole } from "@/hooks/use-user-role";

export type SemiVipCheatRow = {
  id: string;
  name: string;
  game: string;
  mode: string;
  extension: string;
  crack: boolean;
  client: string;
  link: string;
  action?: React.ReactNode;
};

function getSemiVipCheatsColumns(t: (key: string) => string) {
  return [
    { key: "name" as const, label: t("semivip.tableHeaders.name") },
    { key: "game" as const, label: t("semivip.tableHeaders.game") },
    { key: "mode" as const, label: t("semivip.tableHeaders.mode") },
    { key: "extension" as const, label: t("semivip.tableHeaders.extension") },
    {
      key: "crack" as const,
      label: t("semivip.tableHeaders.crack"),
      render: (row: SemiVipCheatRow) =>
        row.crack ? (
          <HugeiconsIcon
            icon={Tick01Icon}
            strokeWidth={2}
            className="size-5 text-green-600"
          />
        ) : (
          <HugeiconsIcon
            icon={Cancel01Icon}
            strokeWidth={2}
            className="size-5 text-red-600"
          />
        ),
    },
    {
      key: "client" as const,
      label: t("semivip.tableHeaders.client"),
      render: (row: SemiVipCheatRow) =>
        row.client ? (
          <HugeiconsIcon
            icon={Tick01Icon}
            strokeWidth={2}
            className="size-5 text-green-600"
          />
        ) : (
          <HugeiconsIcon
            icon={Cancel01Icon}
            strokeWidth={2}
            className="size-5 text-red-600"
          />
        ),
    },
    {
      key: "action" as const,
      label: t("semivip.tableHeaders.download"),
      render: (row: SemiVipCheatRow) => (
        <div className="flex gap-2">
          <ExclusiveCheatDownloadButton
            cheatId={row.id}
            link={row.link}
            kind="semivip"
            label={t("semivip.download")}
            reviewToastText={t("common.leaveReviewAfterDownload")}
          />
        </div>
      ),
    },
  ];
}

export function SemiVipCheatsTable({
  data = [],
}: {
  data?: SemiVipCheatRow[];
}) {
  const { t } = useTranslations();
  return (
    <CommonTable
      columns={getSemiVipCheatsColumns(t)}
      data={data}
      pageSize={10}
      rowEntranceAnimation
    />
  );
}

async function fetchSemiVipCheats(): Promise<SemiVipCheatRow[]> {
  const res = await fetch("/api/semivip-cheats");

  if (!res.ok) {
    throw new Error(`SemiVIP API ${res.status}`);
  }

  return (await res.json()) as SemiVipCheatRow[];
}

type SemiVipCheatsPageProps = {
  initialData?: SemiVipCheatRow[];
  initialDataLoaded?: boolean;
  isAuthenticated?: boolean;
};

export function SemiVipCheatsPage({
  initialData = [],
  initialDataLoaded = false,
  isAuthenticated = false,
}: SemiVipCheatsPageProps) {
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();

  const blockIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.18, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  };

  const sectionStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.08,
      },
    },
  };

  const {
    role: resolvedRole,
    isAuthenticated: resolvedIsAuthenticated,
    isLoading: roleLoading,
  } = useUserRole();
  const effectiveIsAuthenticated = isAuthenticated || resolvedIsAuthenticated;
  /** Même logique que VIP : source de vérité = client après résolution Discord. */
  const effectiveRole: UserRole = roleLoading ? "user" : resolvedRole;
  const canAccess = hasMinimumRole(effectiveRole, "semivip");
  const [data, setData] = useState<SemiVipCheatRow[]>(initialData);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const skipInitialFetchRef = useRef(initialDataLoaded);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.game.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  useEffect(() => {
    if (!canAccess || !initialDataLoaded) return;
    setCached(cacheKey("semivip-cheats"), initialData);
  }, [canAccess, initialData, initialDataLoaded]);

  useEffect(() => {
    if (!canAccess) return;
    if (skipInitialFetchRef.current && refreshTick === 0) {
      skipInitialFetchRef.current = false;
      return;
    }

    let cancelled = false;
    const key = cacheKey("semivip-cheats");

    (async () => {
      if (refreshTick === 0) {
        const cached = getCached<SemiVipCheatRow[]>(key);
        if (cached) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }
      } else {
        invalidateCache(key);
      }

      if (!cancelled) {
        setLoading(true);
        setProgress(0);
      }

      try {
        const json = await fetchSemiVipCheats();
        if (!cancelled) {
          setCached(key, json);
          setData(json);
          setProgress(100);
        }
      } catch {
        if (!cancelled) {
          setProgress(0);
          showToast({
            text: t("semivip.toasts.errorLoading"),
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canAccess, refreshTick, t]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
    showToast({ text: t("semivip.toasts.cacheCleared"), variant: "success" });
  }, [t]);

  if (effectiveIsAuthenticated && roleLoading) {
    return (
      <div className="flex min-h-16 items-center justify-center">
        <Progress value={progress} className="h-1 w-48" />
      </div>
    );
  }

  if (!effectiveIsAuthenticated || !canAccess) {
    return (
      <div className="space-y-6">
        <motion.div variants={blockIn} initial="hidden" animate="show">
          <h1 className="text-2xl font-semibold">{t("semivip.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("semivip.description")}
          </p>
        </motion.div>
        <motion.div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center space-y-4"
          variants={sectionStagger}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={blockIn}
            className="flex size-16 items-center justify-center rounded-full bg-primary/10"
          >
            <HugeiconsIcon
              icon={Diamond02Icon}
              className="size-8 text-primary"
              strokeWidth={2}
            />
          </motion.div>
          <motion.div variants={blockIn} className="space-y-2">
            <h2 className="text-lg font-semibold">
              {t("semivip.accessRequired")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("semivip.accessRequiredDescription")}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {t("semivip.accessRequiredNote")}
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div variants={blockIn} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold">{t("semivip.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("semivip.description")}
        </p>
      </motion.div>
      <motion.div
        className="flex justify-between"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={blockIn} className="min-w-0 flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSearch={() => setSearchQuery(search)}
            placeholder={t("semivip.searchPlaceholder")}
          />
        </motion.div>
        <motion.div variants={blockIn} className="ml-2 shrink-0">
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="px-3 gap-2"
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("semivip.refresh")}
          </Button>
        </motion.div>
      </motion.div>
      {loading ? (
        <div className="flex min-h-16 items-center justify-center">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <SemiVipCheatsTable data={filteredData} />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import type { AdminModsScope } from "@/lib/mods-orphan-files";
import { Progress } from "@/components/ui/progress";

type OrphanSuggestion = {
  cheatId: string;
  name: string;
  game: string;
  score: number;
  missingLink: boolean;
};

type OrphanApiRow = { path: string; suggestions: OrphanSuggestion[] };

type OrphansResponse = {
  orphanCount: number;
  totalObjects: number;
  linkedPaths: number;
  orphans: OrphanApiRow[];
};

type CheatOption = { id: string; name: string; game: string };

export function AdminOrphanModsDialog({
  open,
  onOpenChange,
  scope,
  onAttached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: AdminModsScope;
  onAttached?: () => void;
}) {
  const { t } = useTranslations();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<OrphansResponse | null>(null);
  const [cheatOptions, setCheatOptions] = React.useState<CheatOption[]>([]);
  const [selectedByPath, setSelectedByPath] = React.useState<
    Record<string, string>
  >({});
  const [attaching, setAttaching] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setData(null);
      setSelectedByPath({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [orphRes, cheatsRes] = await Promise.all([
          fetch(`/api/admin/mods/orphans?scope=${encodeURIComponent(scope)}`),
          fetch("/api/admin/cheats"),
        ]);
        const orphanJson = await orphRes.json().catch(() => null);
        if (!orphRes.ok || cancelled) {
          if (!cancelled) {
            showToast({
              text:
                typeof orphanJson?.error === "string"
                  ? orphanJson.error
                  : t("dashboard.admin.allCheats.orphans.loadError"),
              variant: "error",
            });
          }
          return;
        }

        const cheatsJson: unknown = await cheatsRes.json().catch(() => null);
        const opts: CheatOption[] = Array.isArray(cheatsJson)
          ? (cheatsJson as { id?: string; name?: string; game?: string }[])
              .filter((r) => r?.id != null)
              .map((r) => ({
                id: String(r.id),
                name: String(r.name ?? ""),
                game: String(r.game ?? ""),
              }))
          : [];

        if (cancelled) return;
        setData(orphanJson as OrphansResponse);
        setCheatOptions(opts);

        const orch = (orphanJson as OrphansResponse).orphans ?? [];
        const nextSel: Record<string, string> = {};
        for (const row of orch) {
          const best = row.suggestions[0];
          if (best && best.score >= 50) nextSel[row.path] = best.cheatId;
        }
        setSelectedByPath(nextSel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, scope, t]);

  const attach = async (objectPath: string) => {
    const cheatId = selectedByPath[objectPath]?.trim();
    if (!cheatId) {
      showToast({
        text: t("dashboard.admin.allCheats.orphans.pickCheat"),
        variant: "warning",
      });
      return;
    }

    setAttaching(objectPath);
    try {
      const res = await fetch("/api/admin/mods/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cheatId, objectPath, scope }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({
          text:
            typeof json?.error === "string"
              ? json.error
              : t("dashboard.admin.allCheats.orphans.attachError"),
          variant: "error",
        });
        return;
      }
      showToast({
        text: t("dashboard.admin.allCheats.orphans.attachSuccess"),
        variant: "success",
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              orphans: prev.orphans.filter((o) => o.path !== objectPath),
              orphanCount: Math.max(0, prev.orphanCount - 1),
            }
          : prev,
      );
      setSelectedByPath((prev) => {
        const n = { ...prev };
        delete n[objectPath];
        return n;
      });
      onAttached?.();
    } finally {
      setAttaching(null);
    }
  };

  const selectOptionsForRow = React.useCallback(
    (row: OrphanApiRow) => {
      const sugIds = new Set(row.suggestions.map((s) => s.cheatId));
      const rest = cheatOptions.filter((c) => !sugIds.has(c.id));
      return { suggestions: row.suggestions, rest };
    },
    [cheatOptions],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dashboard.admin.allCheats.orphans.title")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.admin.allCheats.orphans.description")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8">
            <Progress value={55} className="h-1" />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("dashboard.admin.allCheats.orphans.scanning")}
            </p>
          </div>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("dashboard.admin.allCheats.orphans.summary", {
                total: data.totalObjects,
                linked: data.linkedPaths,
                orphan: data.orphanCount,
              })}
            </p>
            {data.orphanCount === 0 ? (
              <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-muted-foreground">
                {t("dashboard.admin.allCheats.orphans.none")}
              </p>
            ) : (
              <ul className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                {data.orphans.map((row) => {
                  const { suggestions, rest } = selectOptionsForRow(row);
                  return (
                    <li
                      key={row.path}
                      className="space-y-2 rounded-lg border border-input bg-muted/20 p-3"
                    >
                      <code className="block text-xs break-all text-foreground">
                        {row.path}
                      </code>
                      {suggestions.length === 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          {t("dashboard.admin.allCheats.orphans.noNameMatch")}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select
                          value={selectedByPath[row.path] ?? ""}
                          onValueChange={(v) =>
                            setSelectedByPath((prev) => ({
                              ...prev,
                              [row.path]: v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full min-w-0 sm:flex-1">
                            <SelectValue
                              placeholder={t(
                                "dashboard.admin.allCheats.orphans.selectPlaceholder",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent className="z-200 max-h-64">
                            {suggestions.map((s) => (
                              <SelectItem key={s.cheatId} value={s.cheatId}>
                                ★ {s.name} — {s.game} ({s.score}
                                {s.missingLink
                                  ? ` · ${t("dashboard.admin.allCheats.orphans.noLink")}`
                                  : ""}
                                )
                              </SelectItem>
                            ))}
                            {rest.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}{" "}
                                <span className="text-muted-foreground">
                                  — {c.game}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0"
                          disabled={!selectedByPath[row.path] || attaching === row.path}
                          onClick={() => void attach(row.path)}
                        >
                          {attaching === row.path
                            ? t("dashboard.admin.allCheats.orphans.linking")
                            : t("dashboard.admin.allCheats.orphans.link")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

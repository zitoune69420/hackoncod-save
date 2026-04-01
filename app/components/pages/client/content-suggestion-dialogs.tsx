"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/app/components/i18n-provider";
import { showToast } from "@/components/commons/toasts";
import { COD_GAME_TITLES_FOR_SUGGESTIONS } from "@/lib/cod-games";
import { HugeiconsIcon } from "@hugeicons/react";
import { Idea01Icon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function resetCheatForm() {
  return {
    selectedCodLabel: "",
    existsInDb: null as boolean | null,
    requestGameAdd: false,
    details: "",
  };
}

export function SuggestCheatDialogTrigger() {
  const { t } = useTranslations();
  const idPrefix = useId();
  const checkId = `${idPrefix}-request-game`;
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [checkingDb, setCheckingDb] = useState(false);
  const [{ selectedCodLabel, existsInDb, requestGameAdd, details }, setForm] =
    useState(resetCheatForm);

  const setPartial = useCallback(
    (patch: Partial<ReturnType<typeof resetCheatForm>>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  useEffect(() => {
    if (!selectedCodLabel.trim()) {
      setPartial({ existsInDb: null });
      return;
    }
    const ac = new AbortController();
    setCheckingDb(true);
    fetch(
      `/api/games/exists?title=${encodeURIComponent(selectedCodLabel.trim())}`,
      { signal: ac.signal },
    )
      .then(async (res) => {
        const json = (await res.json()) as { exists?: boolean };
        if (!res.ok) throw new Error("check failed");
        return Boolean(json.exists);
      })
      .then((exists) => {
        if (!ac.signal.aborted) setPartial({ existsInDb: exists });
      })
      .catch(() => {
        if (!ac.signal.aborted) setPartial({ existsInDb: null });
      })
      .finally(() => {
        if (!ac.signal.aborted) setCheckingDb(false);
      });
    return () => ac.abort();
  }, [selectedCodLabel, setPartial]);

  useEffect(() => {
    if (existsInDb === true) {
      setPartial({ requestGameAdd: false });
    }
  }, [existsInDb, setPartial]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setForm(resetCheatForm());
    }
  };

  const submit = async () => {
    const gameTitle = selectedCodLabel.trim();
    const text = details.trim();
    if (!gameTitle) {
      showToast({
        text: t("cheats.suggestDialog.errorSelectGame"),
        variant: "error",
      });
      return;
    }
    if (!text) {
      showToast({
        text: t("cheats.suggestDialog.errorEnterSuggestion"),
        variant: "error",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/suggestions/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cheat",
          gameTitle,
          requestGameAddition: existsInDb === false ? requestGameAdd : false,
          details: text,
        }),
      });
      if (res.status === 401) {
        showToast({ text: t("common.loginRequired"), variant: "error" });
        return;
      }
      if (!res.ok) {
        showToast({ text: t("cheats.suggestDialog.error"), variant: "error" });
        return;
      }
      showToast({ text: t("cheats.suggestDialog.success") });
      setOpen(false);
      setForm(resetCheatForm());
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon-lg" variant="outline" className="shrink-0">
              <HugeiconsIcon
                icon={Idea01Icon}
                strokeWidth={2}
                className="size-5"
              />
              <span className="sr-only">{t("cheats.suggestCheat")}</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {t("cheats.suggestCheat")}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("cheats.suggestDialog.titleCheat")}</DialogTitle>
          <DialogDescription>
            {t("cheats.suggestDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("cheats.suggestDialog.gameLabel")}
            </span>
            <Select
              value={selectedCodLabel || undefined}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  selectedCodLabel: v,
                  requestGameAdd: false,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("cheats.suggestDialog.gamePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent className="max-h-56 p-2">
                {COD_GAME_TITLES_FOR_SUGGESTIONS.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCodLabel ? (
              <p className="text-xs text-muted-foreground">
                {checkingDb
                  ? t("cheats.suggestDialog.checkingGame")
                  : existsInDb === true
                    ? t("cheats.suggestDialog.gameInDatabase")
                    : existsInDb === false
                      ? t("cheats.suggestDialog.gameNotInDatabase")
                      : null}
              </p>
            ) : null}
          </div>
          {existsInDb === false ? (
            <div className="gap-3 py-2">
              <div className="flex items-start gap-2 mb-2">
                <Checkbox
                  id={checkId}
                  checked={requestGameAdd}
                  onCheckedChange={(c) =>
                    setPartial({ requestGameAdd: c === true })
                  }
                  className="mt-0.5"
                />
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Label
                    htmlFor={checkId}
                    className="cursor-pointer text-sm leading-snug font-medium"
                  >
                    {t("cheats.suggestDialog.requestGameAddition")}
                  </Label>
                </div>
              </div>
              <p className="text-sm leading-snug text-muted-foreground">
                  {t("cheats.suggestDialog.requestGameAdditionDescription")}
              </p>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("cheats.suggestDialog.suggestionLabelCheat")}
            </span>
            <Textarea
              value={details}
              onChange={(e) => setPartial({ details: e.target.value })}
              placeholder={t("cheats.suggestDialog.cheatPlaceholderText")}
              className="min-h-28"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            {t("cheats.suggestDialog.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={sending || checkingDb}>
            {sending
              ? t("cheats.suggestDialog.sending")
              : t("cheats.suggestDialog.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SuggestGameDialogTrigger() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setDetails("");
  };

  const submit = async () => {
    const text = details.trim();
    if (!text) {
      showToast({
        text: t("games.suggestDialog.errorEnterSuggestion"),
        variant: "error",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/suggestions/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "game", details: text }),
      });
      if (res.status === 401) {
        showToast({ text: t("common.loginRequired"), variant: "error" });
        return;
      }
      if (!res.ok) {
        showToast({ text: t("games.suggestDialog.error"), variant: "error" });
        return;
      }
      showToast({ text: t("games.suggestDialog.success") });
      setOpen(false);
      setDetails("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon-lg" variant="outline" className="shrink-0">
              <HugeiconsIcon
                icon={Idea01Icon}
                strokeWidth={2}
                className="size-5"
              />
              <span className="sr-only">{t("games.suggestGame")}</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("games.suggestGame")}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("games.suggestDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("games.suggestDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("games.suggestDialog.detailsLabel")}
          </span>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("games.suggestDialog.detailsPlaceholder")}
            className="min-h-32"
          />
        </div>
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            {t("games.suggestDialog.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={sending}>
            {sending
              ? t("games.suggestDialog.sending")
              : t("games.suggestDialog.send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  PaintBrush01Icon,
  TranslateIcon,
  SaveIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  getStoredTheme,
  setStoredTheme,
  getStoredBackground,
  setStoredBackground,
  getStoredToast,
  setStoredToast,
  applyAllStyles,
  type ThemeColor,
  type BackgroundColor,
} from "@/lib/theme";
import { useTranslations } from "@/app/components/i18n-provider";
import { getStoredLanguage, setStoredLanguage, type Locale } from "@/lib/i18n";
import { showToast } from "@/components/commons/toasts";

const COLOR_THEMES = [
  {
    value: "purple",
    labelKey: "settings.colorThemes.purple",
    color: "bg-[#8B5CF6]",
  },
  {
    value: "green",
    labelKey: "settings.colorThemes.green",
    color: "bg-emerald-500",
  },
  {
    value: "blue",
    labelKey: "settings.colorThemes.blue",
    color: "bg-blue-500",
  },
  { value: "red", labelKey: "settings.colorThemes.red", color: "bg-red-500" },
  {
    value: "orange",
    labelKey: "settings.colorThemes.orange",
    color: "bg-orange-500",
  },
  {
    value: "pink",
    labelKey: "settings.colorThemes.pink",
    color: "bg-pink-500",
  },
  {
    value: "cyan",
    labelKey: "settings.colorThemes.cyan",
    color: "bg-cyan-500",
  },
];

const BACKGROUND_OPTIONS = [
  {
    value: "default",
    labelKey: "settings.backgroundOptions.default",
    descKey: "settings.backgroundOptions.defaultDesc",
  },
  {
    value: "dark",
    labelKey: "settings.backgroundOptions.dark",
    descKey: "settings.backgroundOptions.darkDesc",
  },
  {
    value: "darker",
    labelKey: "settings.backgroundOptions.darker",
    descKey: "settings.backgroundOptions.darkerDesc",
  },
  {
    value: "darkest",
    labelKey: "settings.backgroundOptions.darkest",
    descKey: "settings.backgroundOptions.darkestDesc",
  },
  {
    value: "amoled",
    labelKey: "settings.backgroundOptions.amoled",
    descKey: "settings.backgroundOptions.amoledDesc",
  },
  {
    value: "light",
    labelKey: "settings.backgroundOptions.light",
    descKey: "settings.backgroundOptions.lightDesc",
  },
  {
    value: "lighter",
    labelKey: "settings.backgroundOptions.lighter",
    descKey: "settings.backgroundOptions.lighterDesc",
  },
];

const LANGUAGES: { value: Locale; labelKey: string; flag: string }[] = [
  {
    value: "fr",
    labelKey: "settings.language.french",
    flag: "/flags/france.png",
  },
  {
    value: "en",
    labelKey: "settings.language.english",
    flag: "/flags/united-kingdom.png",
  },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_UPDATED_EVENT = "settings-updated";

type InitialConfig = {
  colorTheme: ThemeColor;
  backgroundColor: BackgroundColor;
  language: Locale;
  toastEnabled: boolean;
};

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t, setLocale, setLocalePreview } = useTranslations();
  const [colorTheme, setColorTheme] = React.useState<ThemeColor>("purple");
  const [backgroundColor, setBackgroundColor] =
    React.useState<BackgroundColor>("darker");
  const [language, setLanguage] = React.useState<Locale>("fr");
  const [toastEnabled, setToastEnabled] = React.useState(false);
  const initialConfig = React.useRef<InitialConfig | null>(null);

  React.useEffect(() => {
    if (open) {
      const theme = getStoredTheme();
      const bg = getStoredBackground();
      const lang = getStoredLanguage();
      const toast = getStoredToast();
      initialConfig.current = {
        colorTheme: theme,
        backgroundColor: bg,
        language: lang,
        toastEnabled: toast,
      };
      setColorTheme(theme);
      setBackgroundColor(bg);
      setLanguage(lang);
      setToastEnabled(toast);
    }
  }, [open]);

  const currentTheme = COLOR_THEMES.find((theme) => theme.value === colorTheme);

  const handleColorThemeChange = (v: ThemeColor) => {
    setColorTheme(v);
    applyAllStyles(v, backgroundColor);
  };

  const handleBackgroundChange = (v: BackgroundColor) => {
    setBackgroundColor(v);
    applyAllStyles(colorTheme, v);
  };

  const handleLanguageChange = (newLang: Locale) => {
    setLanguage(newLang);
    React.startTransition(() => setLocalePreview(newLang));
  };

  const handleToastChange = (checked: boolean) => {
    setToastEnabled(checked);
  };

  const handleSave = () => {
    setStoredTheme(colorTheme);
    setStoredBackground(backgroundColor);
    setStoredLanguage(language);
    setStoredToast(toastEnabled);
    setLocale(language);
    applyAllStyles(colorTheme, backgroundColor);
    window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT));
    showToast({
      text: t("settings.language.saved"),
      variant: "success",
      force: true,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    const init = initialConfig.current;
    if (init) {
      setColorTheme(init.colorTheme);
      setBackgroundColor(init.backgroundColor);
      setLanguage(init.language);
      setToastEnabled(init.toastEnabled);
      setStoredTheme(init.colorTheme);
      setStoredBackground(init.backgroundColor);
      setStoredLanguage(init.language);
      setStoredToast(init.toastEnabled);
      setLocale(init.language);
      applyAllStyles(init.colorTheme, init.backgroundColor);
      window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader className="hidden">
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={PaintBrush01Icon}
              className="size-5"
              strokeWidth={2}
            />
            <h3 className="text-base font-semibold leading-none">
              {t("settings.appearance.title")}
            </h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("settings.appearance.description")}
          </p>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="color-theme">
              {t("settings.appearance.colorTheme")}
            </Label>
            <Select
              value={colorTheme}
              onValueChange={(v) => handleColorThemeChange(v as ThemeColor)}
            >
              <SelectTrigger id="color-theme" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {currentTheme && (
                      <span
                        className={cn(
                          "size-3 shrink-0 rounded-full",
                          currentTheme.color,
                        )}
                      />
                    )}
                    {currentTheme
                      ? t(currentTheme.labelKey)
                      : t("settings.colorThemes.purple")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="`min-w-(--radix-select-trigger-width) p-1">
                {COLOR_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-3 shrink-0 rounded-full",
                          theme.color,
                        )}
                      />
                      {t(theme.labelKey)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="background">
              {t("settings.appearance.backgroundColor")}
            </Label>
            <Select
              value={backgroundColor}
              onValueChange={(v) =>
                handleBackgroundChange(v as BackgroundColor)
              }
            >
              <SelectTrigger id="background" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={PaintBrush01Icon}
                      className="size-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                    {BACKGROUND_OPTIONS.find((b) => b.value === backgroundColor)
                      ? t(
                          BACKGROUND_OPTIONS.find(
                            (b) => b.value === backgroundColor,
                          )!.labelKey,
                        )
                      : t("settings.backgroundOptions.darker")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="`max-h-(--radix-select-content-available-height p-1">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="items-start py-2.5"
                  >
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{t(opt.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(opt.descKey)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">{t("settings.language.title")}</Label>
            <Select
              value={language}
              onValueChange={(v) => handleLanguageChange(v as Locale)}
            >
              <SelectTrigger id="language" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={TranslateIcon}
                      className="size-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                    {t(
                      LANGUAGES.find((l) => l.value === language)?.labelKey ??
                        "settings.language.french",
                    )}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="p-1">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <Image
                        src={lang.flag}
                        alt={t(lang.labelKey)}
                        width={20}
                        height={20}
                      />
                      {t(lang.labelKey)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Notifications section */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Notification01Icon}
                className="size-5"
                strokeWidth={2}
              />
              <h3 className="text-base font-semibold leading-none">
                {t("settings.notifications.title")}
              </h3>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("settings.notifications.description")}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">
                {t("settings.notifications.toastNotifications")}
              </h4>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-input bg-muted/30 p-3">
                <Label
                  htmlFor="toast-notifications"
                  className="flex-1 cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  {t("settings.notifications.toastNotificationsDescription")}
                </Label>
                <Switch
                  id="toast-notifications"
                  checked={toastEnabled}
                  onCheckedChange={handleToastChange}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>
              <HugeiconsIcon
                icon={SaveIcon}
                className="size-4"
                strokeWidth={2}
              />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

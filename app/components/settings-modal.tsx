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

const COLOR_THEMES = [
  { value: "purple", label: "Purple", color: "bg-[#8B5CF6]" },
  { value: "green", label: "Green", color: "bg-emerald-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "pink", label: "Pink", color: "bg-pink-500" },
  { value: "cyan", label: "Cyan", color: "bg-cyan-500" },
];

const BACKGROUND_OPTIONS = [
  {
    value: "default",
    label: "Default",
    description: "Standard background color",
  },
  { value: "dark", label: "Dark", description: "Dark background color" },
  { value: "darker", label: "Darker", description: "Darker background color" },
  {
    value: "darkest",
    label: "Darkest",
    description: "Darkest background color",
  },
  {
    value: "amoled",
    label: "AMOLED",
    description: "Black background color for AMOLED screens",
  },
  { value: "light", label: "Light", description: "Light background color" },
  {
    value: "lighter",
    label: "Lighter",
    description: "Lighter background color",
  },
];

const LANGUAGES = [
  { value: "fr", label: "French", flag: "/flags/france.png" },
  { value: "en", label: "English", flag: "/flags/united-kingdom.png" },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [colorTheme, setColorTheme] = React.useState("purple");
  const [backgroundColor, setBackgroundColor] = React.useState("darker");
  const [language, setLanguage] = React.useState("fr");
  const [toastEnabled, setToastEnabled] = React.useState(false);

  const currentTheme = COLOR_THEMES.find((t) => t.value === colorTheme);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader className="hidden">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={PaintBrush01Icon}
              className="size-5"
              strokeWidth={2}
            />
            <h3 className="text-base font-semibold leading-none">Appearance</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Customize the appearance of the application
          </p>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="color-theme">Color theme</Label>
            <Select value={colorTheme} onValueChange={setColorTheme}>
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
                    {currentTheme?.label ?? "Purple"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)] p-1">
                {COLOR_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-3 shrink-0 rounded-full",
                          theme.color,
                        )}
                      />
                      {theme.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="background">Background color</Label>
            <Select value={backgroundColor} onValueChange={setBackgroundColor}>
              <SelectTrigger id="background" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={PaintBrush01Icon}
                      className="size-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                    {BACKGROUND_OPTIONS.find((b) => b.value === backgroundColor)
                      ?.label ?? "Darker"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[var(--radix-select-content-available-height)] p-1">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="items-start py-2.5"
                  >
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={TranslateIcon}
                      className="size-4 text-muted-foreground"
                      strokeWidth={2}
                    />
                    {LANGUAGES.find((l) => l.value === language)?.label ??
                      "French"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="p-1">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <Image
                        src={lang.flag}
                        alt={lang.label}
                        width={20}
                        height={20}
                      />
                      {lang.label}
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
                Notifications
              </h3>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Control how you receive notifications
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Toast notifications</h4>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-input bg-muted/30 p-3">
                <Label
                  htmlFor="toast-notifications"
                  className="flex-1 cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Show toast notifications for actions
                </Label>
                <Switch
                  id="toast-notifications"
                  checked={toastEnabled}
                  onCheckedChange={setToastEnabled}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              <HugeiconsIcon
                icon={SaveIcon}
                className="size-4"
                strokeWidth={2}
              />
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useTranslations } from "@/app/components/i18n-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UnfoldMoreIcon,
  CheckmarkBadgeIcon,
  LogoutIcon,
  DiscordIcon,
  Setting07Icon,
  CrownIcon,
} from "@hugeicons/core-free-icons";
import { SettingsModal } from "@/app/components/dialogs/settings";
import { HowToVipDialog } from "@/app/components/dialogs/how-to-vip";
import { AccountInfoDialog } from "@/app/components/dialogs/account-info-dialog";
import { DASHBOARD_DEFAULT_PAGE } from "@/lib/dashboard-url";
import { hasMinimumRole } from "@/lib/permissions";
import { useUserRole } from "@/hooks/use-user-role";
import Link from "next/link";

function initialsFromUser(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

type NavUserProps = {
  /** Contrôlé par le parent (URL `?page=settings`) */
  settingsOpen?: boolean;
  onSettingsOpenChangeAction?: (open: boolean) => void;
};

export function NavUser({
  settingsOpen: settingsOpenControlled,
  onSettingsOpenChangeAction,
}: NavUserProps) {
  const { t } = useTranslations();
  const { isMobile } = useSidebar();
  const [settingsOpenUncontrolled, setSettingsOpenUncontrolled] =
    React.useState(false);
  const [howToVipOpen, setHowToVipOpen] = React.useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = React.useState(false);
  const settingsOpen = settingsOpenControlled ?? settingsOpenUncontrolled;
  const setSettingsOpen = (open: boolean) => {
    onSettingsOpenChangeAction?.(open);
    if (settingsOpenControlled === undefined) {
      setSettingsOpenUncontrolled(open);
    }
  };
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user;
  const { role } = useUserRole();
  const showHowToVip = Boolean(user) && !hasMinimumRole(role, "vip");

  const signInWithDiscord = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: `/dashboard?page=${DASHBOARD_DEFAULT_PAGE}`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const displayName = user?.name?.trim() || user?.email || "User";
  const displayEmail = user?.email ?? "";
  const avatarUrl = user?.image ?? undefined;
  const fallback = initialsFromUser(user?.name, user?.email);

  return (
    <SidebarMenu>
      <Link href="https://discord.gg/cod-fr">
        <SidebarMenuItem>
          <SidebarMenuButton className="pl-4">
            <HugeiconsIcon icon={DiscordIcon} strokeWidth={2} />
            <span>{t("sidebar.discord")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </Link>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="pl-4"
          onClick={() => setSettingsOpen(true)}
        >
          <HugeiconsIcon icon={Setting07Icon} strokeWidth={2} />
          <span>{t("sidebar.settings")}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {showHowToVip ? (
        <HowToVipDialog
          open={howToVipOpen}
          onOpenChangeAction={setHowToVipOpen}
        />
      ) : null}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      {user ? (
        <AccountInfoDialog
          open={accountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          }}
        />
      ) : null}

      {sessionPending ? (
        <SidebarMenuItem>
          <div
            className="flex h-12 w-full items-center gap-2 rounded-md px-2 pl-4"
            aria-hidden
          >
            <div className="size-8 shrink-0 animate-pulse rounded-lg bg-sidebar-accent" />
            <div className="grid flex-1 gap-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-sidebar-accent" />
              <div className="h-3 w-32 animate-pulse rounded bg-sidebar-accent/70" />
            </div>
          </div>
        </SidebarMenuItem>
      ) : user ? (
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg text-xs">
                    {fallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {displayEmail ? (
                    <span className="truncate text-xs">{displayEmail}</span>
                  ) : null}
                </div>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  className="ml-auto size-4"
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="rounded-lg text-xs">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    {displayEmail ? (
                      <span className="truncate text-xs">{displayEmail}</span>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {showHowToVip ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setHowToVipOpen(true)}>
                      <HugeiconsIcon icon={CrownIcon} strokeWidth={2} />
                      {t("vip.howTo.menuLabel")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setAccountDialogOpen(true)}
                >
                  <HugeiconsIcon icon={CheckmarkBadgeIcon} strokeWidth={2} />
                  {t("navUser.account")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <HugeiconsIcon icon={Setting07Icon} strokeWidth={2} />
                  {t("sidebar.settings")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
                {t("navUser.logOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem>
          <Button
            type="button"
            variant="ghost"
            disabled={isSigningIn}
            className="h-10 w-full justify-start gap-2 pl-4 font-normal"
            onClick={() => void signInWithDiscord()}
          >
            <HugeiconsIcon
              icon={DiscordIcon}
              strokeWidth={2}
              className="size-4 shrink-0"
            />
            <span className="truncate">
              {isSigningIn ? t("navUser.signingIn") : t("navUser.signIn")}
            </span>
          </Button>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}

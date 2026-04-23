"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";
import type { ShopOrder } from "@/lib/supabase/shop-types";

interface TicketInfoPanelProps {
  order: ShopOrder;
  imageUrl?: string | null;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="shrink-0 font-semibold text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function TicketInfoPanel({ order, imageUrl }: TicketInfoPanelProps) {
  const { t } = useTranslations();
  const product = order.product;
  const productDisplayName =
    order.product_type === "support"
      ? t("tickets.supportTicketProductName")
      : (product?.name ?? "—");
  const preOrder = order.pre_order_data as Record<string, unknown> | null;
  const payment = (preOrder?.payment ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("tickets.orderInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="ID" value={order.id.slice(0, 8) + "…"} />
          <InfoRow
            label={t("tickets.statusLabel")}
            value={
              <Badge variant="secondary" className="text-xs">
                {t(`tickets.status.${order.status}`)}
              </Badge>
            }
          />
          <InfoRow label={t("tickets.price")} value={`${order.price} €`} />
          <InfoRow
            label={t("tickets.orderDate")}
            value={new Date(order.created_at).toLocaleDateString()}
          />
          {order.paid_at && (
            <InfoRow
              label={t("tickets.paymentDate")}
              value={new Date(order.paid_at).toLocaleDateString()}
            />
          )}
        </CardContent>
      </Card>

      {product && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("tickets.productInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {imageUrl ? (
              <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={imageUrl}
                  alt={productDisplayName}
                  className="size-full object-cover"
                  width={400}
                  height={200}
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-md bg-muted">
                <HugeiconsIcon icon={Image01Icon} className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
            )}
            <InfoRow label={t("tickets.name")} value={productDisplayName} />
            <InfoRow label={t("tickets.type")} value={order.product_type} />
            {"platform" in product && product.platform && (
              <InfoRow label={t("tickets.platform")} value={product.platform as string} />
            )}
            {"game" in product && product.game && (
              <InfoRow label={t("tickets.game")} value={product.game as string} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("tickets.userInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label={t("tickets.userId")} value={order.user_id} />
          {order.user_email && (
            <InfoRow label={t("tickets.email")} value={order.user_email} />
          )}
          {(order.user_first_name || order.user_last_name) && (
            <InfoRow
              label={t("tickets.name")}
              value={`${order.user_first_name ?? ""} ${order.user_last_name ?? ""}`.trim()}
            />
          )}
          {payment.method != null && payment.method !== "" ? (
            <InfoRow
              label={t("tickets.paymentMethod")}
              value={String(payment.method)}
            />
          ) : null}
          {payment.account != null && payment.account !== "" ? (
            <InfoRow
              label={t("tickets.paymentAccount")}
              value={String(payment.account)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

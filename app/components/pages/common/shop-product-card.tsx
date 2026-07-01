"use client";

import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingCart01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { useTranslations } from "@/app/components/i18n-provider";

export interface ShopCardProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
  /** Resolved signed URL (null while loading). */
  imageUrl?: string | null;
  /** Minimum display price (already formatted by parent). */
  displayPrice?: string | null;
}

interface ShopProductCardProps {
  product: ShopCardProduct;
  onClick: () => void;
}

export function ShopProductCard({ product, onClick }: ShopProductCardProps) {
  const { t } = useTranslations();

  return (
    <Card className="cursor-pointer pt-0 transition-shadow hover:shadow-lg" onClick={onClick}>
      <div className="relative h-48 w-full overflow-hidden rounded-t-xl bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            className="size-full object-cover transition-transform group-hover/card:scale-105"
            width={600}
            height={300}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <HugeiconsIcon
              icon={Image01Icon}
              className="size-16 text-muted-foreground/40"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="line-clamp-1">{product.name}</CardTitle>
        </div>
        {product.description && (
          <CardDescription className="line-clamp-2">
            {product.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {product.displayPrice ? (
          <p className="text-lg font-bold text-green-500">
            {t("shop.common.fromPrice")} {product.displayPrice}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("shop.common.priceUnavailable")}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full gap-2" onClick={onClick}>
          <HugeiconsIcon icon={ShoppingCart01Icon} strokeWidth={2} />
          {t("shop.common.order")}
        </Button>
      </CardFooter>
    </Card>
  );
}

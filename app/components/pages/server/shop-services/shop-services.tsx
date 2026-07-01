"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/app/components/i18n-provider";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/commons/search-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { cacheKey, getCached, invalidateCache, setCached } from "@/lib/cache";
import { showToast } from "@/components/commons/toasts";
import { authClient } from "@/lib/auth-client";
import { getShopImageUrl, cleanExpiredImageCache } from "@/lib/shop-utils";
import { ShopProductCard } from "@/app/components/pages/common/shop-product-card";
import { ShopProductDialog } from "@/app/components/pages/common/shop-product-dialog";
import type { ShopServicePublic, InfoBlock } from "@/lib/supabase/shop-types";

async function fetchShopServices(): Promise<ShopServicePublic[]> {
  const res = await fetch("/api/shop/services");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export function ShopServicesPage() {
  const { t } = useTranslations();
  const { data: session } = authClient.useSession();
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
  const cardIn = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.16, ease: "easeOut" as const }
        : { type: "spring" as const, stiffness: 380, damping: 28 },
    },
  };
  const sectionStagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0.04 : 0.08 } },
  };
  const gridStagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.06,
        delayChildren: reduceMotion ? 0 : 0.03,
      },
    },
  };

  const [data, setData] = useState<ShopServicePublic[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopServicePublic | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.game ?? "").toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const loadData = useCallback(
    (skipCache = false) => {
      const key = cacheKey("shop-services");
      if (!skipCache) {
        const cached = getCached<ShopServicePublic[]>(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setProgress(0);
      fetchShopServices()
        .then((json) => {
          setCached(key, json);
          setData(json);
          setProgress(100);
        })
        .catch(() => {
          showToast({ text: t("shop.services.toastError"), variant: "error" });
        })
        .finally(() => setLoading(false));
    },
    [t],
  );

  useEffect(() => {
    cleanExpiredImageCache();
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setProgress((p) => (p >= 90 ? 90 : p + 10)), 200);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls: Record<string, string | null> = {};
      await Promise.all(
        data.map(async (p) => {
          urls[p.id] = await getShopImageUrl(p.image);
        }),
      );
      if (!cancelled) setImageUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleRefresh = useCallback(() => {
    invalidateCache(cacheKey("shop-services"));
    loadData(true);
  }, [loadData]);

  function openDialog(product: ShopServicePublic) {
    if (!session?.user) {
      showToast({
        text: t("shop.common.discordLoginRequired"),
        variant: "info",
      });
      return;
    }
    setSelectedProduct(product);
    setDialogOpen(true);
  }

  function getMinPrice(product: ShopServicePublic): string | null {
    if (!product.prices || product.prices.length === 0) return null;
    const min = Math.min(...product.prices.map((p) => p.price));
    return `${min} €`;
  }

  const infoBlocks: InfoBlock[] = selectedProduct
    ? [
        { key: "platform", label: t("shop.dialog.platform"), value: selectedProduct.platform },
        { key: "game", label: t("shop.dialog.game"), value: selectedProduct.game },
        { key: "deliveryType", label: t("shop.dialog.deliveryType"), value: selectedProduct.delivery_type },
        {
          key: "estimatedDelivery",
          label: t("shop.dialog.estimatedDelivery"),
          value: selectedProduct.estimated_delivery_minutes
            ? `${selectedProduct.estimated_delivery_minutes} min`
            : null,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <ShopProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        productType="service"
        infoBlocks={infoBlocks}
        prices={selectedProduct?.prices}
      />

      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={blockIn} className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("shop.services.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("shop.services.description")}
          </p>
        </motion.div>
        <motion.div variants={blockIn} className="flex shrink-0 gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onSearch={() => setSearchQuery(search)}
            placeholder={t("shop.services.searchPlaceholder")}
          />
          <Button
            size="lg"
            variant="outline"
            onClick={handleRefresh}
            className="gap-2 px-3"
          >
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            {t("shop.services.refresh")}
          </Button>
        </motion.div>
      </motion.div>

      {loading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2">
          <Progress value={progress} className="h-1 w-48" />
        </div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={gridStagger}
          initial="hidden"
          animate="show"
        >
          {filteredData.map((product) => (
            <motion.div key={product.id} variants={cardIn} className="min-w-0">
              <ShopProductCard
                product={{
                  ...product,
                  imageUrl: imageUrls[product.id],
                  displayPrice: getMinPrice(product),
                }}
                onClick={() => openDialog(product)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

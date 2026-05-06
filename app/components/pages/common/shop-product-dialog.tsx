"use client";

import { useState, useCallback, useMemo, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  DiscordIcon,
  InformationCircleIcon,
  Loading03Icon,
  Message01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { PaypalIcon } from "@/components/commons/paypal-icon";
import { useTranslations } from "@/app/components/i18n-provider";
import type {
  Product,
  ProductType,
  InfoBlock,
  CheatPrice,
  ServicePrice,
} from "@/lib/supabase/shop-types";
import { createOrderAction } from "@/app/actions/shop-order";
import { cacheKey, invalidateCache } from "@/lib/cache";
import { authClient } from "@/lib/auth-client";

type Step = "preorder" | "payment" | "confirmation" | "chat";

const PAYMENT_METHODS = [
  {
    id: "PayPal",
    name: "PayPal",
    selectedStyle: {
      background: "#0070BA",
      color: "#fff",
      border: "2px solid #0070BA",
    } as React.CSSProperties,
    icon: "paypal" as const,
  },
  {
    id: "Revolut",
    name: "Revolut",
    selectedStyle: {
      background: "#fff",
      color: "#111827",
      border: "2px solid #d1d5db",
    } as React.CSSProperties,
    icon: "revolut" as const,
  },
];

type PriceItem = CheatPrice | ServicePrice;

interface ShopProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  productType: ProductType;
  infoBlocks: InfoBlock[];
  /** Prices for cheat / service. Accounts use product.price directly. */
  prices?: PriceItem[];
}

export function ShopProductDialog({
  open,
  onOpenChange,
  product,
  productType,
  infoBlocks,
  prices,
}: ShopProductDialogProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [currentStep, setCurrentStep] = useState<Step>("preorder");
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Pre-order form
  const [formNotes, setFormNotes] = useState("");
  const [selectedPriceId, setSelectedPriceId] = useState("");

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState("");
  const [senderFirstName, setSenderFirstName] = useState("");
  const [senderLastName, setSenderLastName] = useState("");
  const [senderAccount, setSenderAccount] = useState("");

  // Confirmation
  const [confirmPaymentSent, setConfirmPaymentSent] = useState(false);
  const [confirmPriceVariation, setConfirmPriceVariation] = useState(false);

  // Order result
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setCurrentStep("preorder");
    setShowProductInfo(false);
    setIsSubmitting(false);
    setFormNotes("");
    setSelectedPriceId("");
    setPaymentMethod("");
    setSenderFirstName("");
    setSenderLastName("");
    setSenderAccount("");
    setConfirmPaymentSent(false);
    setConfirmPriceVariation(false);
    setOrderError(null);
    setCreatedOrderId(null);
    setIsSigningIn(false);
  }, []);

  const signInCallbackUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const signInWithDiscord = useCallback(async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: signInCallbackUrl,
      });
    } catch (err) {
      console.error("[signIn.discord]", err);
    } finally {
      setIsSigningIn(false);
    }
  }, [signInCallbackUrl]);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) resetState();
      onOpenChange(o);
    },
    [onOpenChange, resetState],
  );

  /** Animations ressort / stagger partagées entre toutes les étapes du dialogue. */
  const stepPanelMotion = useMemo(() => {
    const reduced = !!reduceMotion;
    const spring = (stiffness: number, damping: number, delay = 0) =>
      reduced
        ? { duration: 0.22 }
        : ({
            type: "spring" as const,
            stiffness,
            damping,
            delay,
            mass: 0.72,
          });
    return {
      container: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduced ? 0 : 0.1,
            delayChildren: reduced ? 0 : 0.04,
          },
        },
      },
      section: {
        hidden: { opacity: 0, y: reduced ? 0 : 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: spring(400, 26),
        },
      },
      actions: {
        hidden: { opacity: 0, y: reduced ? 0 : 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: spring(340, 28, 0.08),
        },
      },
      iconRing: {
        hidden: reduced
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.32, rotate: -12 },
        show: {
          opacity: 1,
          scale: 1,
          rotate: 0,
          transition: spring(400, 15),
        },
      },
      iconGlyph: {
        hidden: reduced ? { opacity: 0 } : { opacity: 0, scale: 0.15 },
        show: {
          opacity: 1,
          scale: 1,
          transition: spring(560, 17, 0.06),
        },
      },
      text: {
        hidden: { opacity: 0, y: reduced ? 0 : 18 },
        show: {
          opacity: 1,
          y: 0,
          transition: spring(380, 26),
        },
      },
    };
  }, [reduceMotion]);

  if (!product) return null;

  const hasPrices = prices && prices.length > 0;
  const selectedPrice = hasPrices
    ? prices.find((p) => p.id === selectedPriceId)
    : null;

  const filteredBlocks = infoBlocks.filter(
    (b) => b.value !== null && b.value !== undefined && b.value !== "",
  );

  const steps: { key: Step; label: string }[] = [
    { key: "preorder", label: t("shop.dialog.stepPreorder") },
    { key: "payment", label: t("shop.dialog.stepPayment") },
    { key: "confirmation", label: t("shop.dialog.stepConfirmation") },
    { key: "chat", label: "Chat" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  // ── Handlers ──────────────────────────────────────────────────────

  function handlePreorderSubmit(e: FormEvent) {
    e.preventDefault();
    if (sessionPending || !session?.user) return;
    if (hasPrices && !selectedPriceId) return;
    setShowProductInfo(false);
    setCurrentStep("payment");
  }

  function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!paymentMethod || !senderFirstName || !senderLastName || !senderAccount)
      return;
    setCurrentStep("confirmation");
  }

  async function handleConfirmationSubmit(e: FormEvent) {
    e.preventDefault();
    if (!confirmPaymentSent || (productType === "account" && !confirmPriceVariation)) return;
    if (!product) return;
    setIsSubmitting(true);
    setOrderError(null);

    try {
      const result = await createOrderAction({
        productId: product.id,
        productType,
        priceId: selectedPriceId || null,
        notes: formNotes || null,
        paymentMethod,
        senderFirstName,
        senderLastName,
        senderAccount,
      });

      if (!result.ok) {
        setOrderError(result.error);
        setIsSubmitting(false);
        return;
      }

      setCreatedOrderId(result.orderId);
      setIsSubmitting(false);
      setCurrentStep("chat");
    } catch {
      setOrderError("server");
      setIsSubmitting(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────

  function renderInfoBlock(block: InfoBlock) {
    let display: React.ReactNode;
    if (block.type === "boolean") {
      display = block.value ? t("shop.dialog.yes") : t("shop.dialog.no");
    } else if (block.type === "badge") {
      display = <Badge variant="secondary">{String(block.value)}</Badge>;
    } else {
      display = <span className="text-sm pt-1">{String(block.value)}</span>;
    }
    return (
      <div
        key={block.key}
        className="rounded-md border bg-muted/30 p-4"
      >
        <Label className="text-sm font-medium text-muted-foreground">
          {block.label}
        </Label>
        <div className="pt-1">{display}</div>
      </div>
    );
  }

  // ── Stepper ───────────────────────────────────────────────────────

  function renderStepper() {
    const items: React.ReactNode[] = [];
    steps.forEach((step, i) => {
      const isDone = i < stepIndex;
      const isCurrent = i === stepIndex;
      items.push(
        <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ width: 80 }}>
          <div
            className={`flex size-10 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${
              isCurrent
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110"
                : isDone
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border-2 border-border"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-center text-xs font-medium leading-tight transition-colors duration-300 ${
              isCurrent ? "" : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
        </div>,
      );
      if (i < steps.length - 1) {
        items.push(
          <div
            key={`line-${i}`}
            className={`mt-5 h-[2px] w-10 shrink-0 rounded-full transition-colors duration-300 ${
              isDone ? "bg-primary" : "bg-muted-foreground/25"
            }`}
          />,
        );
      }
    });
    return (
      <div className="flex items-start justify-center">{items}</div>
    );
  }

  // ── Price display helper ──────────────────────────────────────────

  function renderPriceBlock() {
    if (!hasPrices && productType !== "account") return null;

    const priceDisplay =
      productType === "account" && product && "price" in product
        ? `${(product as { price: number }).price} ${(product as { currency?: string | null }).currency === "EUR" ? "€" : ((product as { currency?: string | null }).currency ?? "")}`
        : selectedPrice
          ? `${selectedPrice.price} ${selectedPrice.currency === "EUR" ? "€" : selectedPrice.currency}`
          : null;

    return (
      <div className="items-center rounded-md border bg-muted/30 p-4">
        <Label className="text-sm font-medium text-muted-foreground">
          {t("shop.dialog.price")}
        </Label>
        {priceDisplay ? (
          <p className="text-2xl font-bold text-green-500">{priceDisplay}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("shop.dialog.selectPrice")}
          </p>
        )}
      </div>
    );
  }

  // ── Main dialog ───────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto transition-[max-width] duration-300 ease-in-out [&::-webkit-scrollbar]:hidden"
        style={{ maxWidth: "min(32rem, calc(100vw - 2rem))" }}
      >
        {currentStep !== "chat" && (
          <motion.div
            key={`dialog-head-${currentStep}`}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.18 }
                : { type: "spring", stiffness: 460, damping: 34 }
            }
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {product.name}
              </DialogTitle>
              {product.description && currentStep === "preorder" && (
                <DialogDescription className="line-clamp-2">{product.description}</DialogDescription>
              )}
            </DialogHeader>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Toggle product info + product info + stepper */}
          {currentStep !== "chat" && (
          <motion.div
            key={`dialog-meta-${currentStep}`}
            className={currentStep === "preorder" ? "space-y-6" : "space-y-2"}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.18 }
                : { type: "spring", stiffness: 400, damping: 30, delay: 0.02 }
            }
          >
            {currentStep !== "preorder" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductInfo(!showProductInfo)}
                className="flex items-center transition-all duration-200"
              >
                <HugeiconsIcon
                  icon={showProductInfo ? ViewOffIcon : ViewIcon}
                  strokeWidth={2}
                  className="mr-1 size-3"
                />
                <span className="text-xs">
                  {showProductInfo
                    ? t("shop.dialog.hideInfo")
                    : t("shop.dialog.showInfo")}
                </span>
              </Button>
            )}

            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{
                gridTemplateRows: currentStep === "preorder" || showProductInfo ? "1fr" : "0fr",
                opacity: currentStep === "preorder" || showProductInfo ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {renderPriceBlock()}
                    {filteredBlocks.map(renderInfoBlock)}
                  </div>
                </div>
              </div>
            </div>

            {currentStep === "preorder" && !sessionPending && !session?.user && (
              <div
                className="flex flex-col gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 dark:border-sky-400/25 dark:bg-sky-500/10"
                role="status"
              >
                <div className="flex gap-3">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    strokeWidth={2}
                    className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("shop.common.discordLoginRequired")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2 sm:w-auto sm:self-start"
                  disabled={isSigningIn}
                  onClick={() => void signInWithDiscord()}
                >
                  <HugeiconsIcon icon={DiscordIcon} strokeWidth={2} className="size-4" />
                  {isSigningIn ? t("common.signingIn") : t("common.signIn")}
                </Button>
              </div>
            )}

            <motion.div
              key={currentStep}
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : { type: "spring", stiffness: 420, damping: 32 }
              }
            >
              {renderStepper()}
            </motion.div>
          </motion.div>
          )}

          {/* ── Step 1: Preorder ─────────────────────────────────── */}
          {currentStep === "preorder" && (
            <motion.div
              key="step-preorder"
              className="space-y-4"
              variants={stepPanelMotion.container}
              initial="hidden"
              animate="show"
            >
              <form onSubmit={handlePreorderSubmit} className="space-y-4">
                {hasPrices && (
                  <motion.div variants={stepPanelMotion.section}>
                    <Label htmlFor="price_id" className="block pb-2">
                      {t("shop.dialog.selectPriceRequired")}
                    </Label>
                    <Select
                      value={selectedPriceId}
                      onValueChange={setSelectedPriceId}
                    >
                      <SelectTrigger id="price_id" className="w-full">
                        <SelectValue
                          placeholder={t("shop.dialog.selectPricePlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {prices.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {"label" in p ? p.label : ""} - {p.price}{" "}
                            {p.currency === "EUR" ? "€" : p.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                <motion.div variants={stepPanelMotion.section}>
                  <Label htmlFor="notes" className="block pb-2">
                    {t("shop.dialog.notes")}
                  </Label>
                  <Textarea
                    id="notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    placeholder={t("shop.dialog.notesPlaceholder")}
                    className="resize-none"
                  />
                </motion.div>

                <motion.div variants={stepPanelMotion.actions}>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      sessionPending ||
                      !session?.user ||
                      (hasPrices && !selectedPriceId)
                    }
                    className="w-full gap-2"
                    size="lg"
                  >
                    {t("shop.dialog.goToPayment")}
                    <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Payment ──────────────────────────────────── */}
          {currentStep === "payment" && (
            <motion.div
              key="step-payment"
              className="space-y-4"
              variants={stepPanelMotion.container}
              initial="hidden"
              animate="show"
            >
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <motion.div variants={stepPanelMotion.section}>
                  <Label className="block pb-2">
                    {t("shop.dialog.paymentMethodRequired")}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethod === method.id;
                      return (
                        <Button
                          key={method.id}
                          type="button"
                          variant="outline"
                          onClick={() => setPaymentMethod(method.id)}
                          className="flex h-auto flex-col items-center px-4 py-4 transition-all"
                          style={isSelected ? method.selectedStyle : undefined}
                        >
                          <span className="flex items-center justify-center">
                            {method.icon === "paypal" ? (
                              <PaypalIcon className="size-4" />
                            ) : (
                              <Image
                                src="/revolut.svg"
                                alt="Revolut"
                                width={16}
                                height={16}
                                style={isSelected ? undefined : { filter: "invert(1)" }}
                              />
                            )}
                          </span>
                          <span className="font-medium">{method.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>

                {paymentMethod && (
                  <motion.div
                    key={paymentMethod}
                    variants={stepPanelMotion.section}
                    initial="hidden"
                    animate="show"
                    className="rounded-md border bg-muted/50 p-4"
                  >
                    <div className="space-y-2">
                      <div className="mb-2 flex items-center gap-2">
                        {paymentMethod === "PayPal" ? (
                          <PaypalIcon className="size-4" />
                        ) : (
                          <Image
                            src="/revolut.svg"
                            alt="Revolut"
                            width={16}
                            height={16}
                            style={{ filter: "invert(1)" }}
                          />
                        )}
                        <Label className="text-sm font-medium">
                          {t("shop.dialog.paymentInstructions")}
                        </Label>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {paymentMethod === "PayPal"
                          ? (product as { paypal?: string | null }).paypal
                          : (product as { revolut?: string | null }).revolut}
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div variants={stepPanelMotion.section}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sender_first_name" className="block pb-2">
                        {t("shop.dialog.senderFirstName")}
                      </Label>
                      <Input
                        id="sender_first_name"
                        value={senderFirstName}
                        onChange={(e) => setSenderFirstName(e.target.value)}
                        placeholder={t("shop.dialog.firstNamePlaceholder")}
                        className="h-9"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sender_last_name" className="block pb-2">
                        {t("shop.dialog.senderLastName")}
                      </Label>
                      <Input
                        id="sender_last_name"
                        value={senderLastName}
                        onChange={(e) => setSenderLastName(e.target.value)}
                        placeholder={t("shop.dialog.lastNamePlaceholder")}
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={stepPanelMotion.section}>
                  <Label htmlFor="sender_account" className="block pb-2">
                    {t("shop.dialog.senderAccount")}
                  </Label>
                  <Input
                    id="sender_account"
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    className="h-9"
                    placeholder={
                      paymentMethod === "PayPal"
                        ? "exemple@email.com"
                        : "@username"
                    }
                    required
                  />
                </motion.div>

                <motion.div variants={stepPanelMotion.actions}>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep("preorder")}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
                      {t("shop.dialog.back")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !paymentMethod ||
                        !senderFirstName ||
                        !senderLastName ||
                        !senderAccount
                      }
                      className="flex-1"
                      size="lg"
                    >
                      {t("shop.dialog.confirmPayment")}
                    </Button>
                  </div>
                </motion.div>
              </form>
            </motion.div>
          )}

          {/* ── Step 3: Confirmation ─────────────────────────────── */}
          {currentStep === "confirmation" && (
            <motion.div
              key="step-confirmation"
              className="space-y-4"
              variants={stepPanelMotion.container}
              initial="hidden"
              animate="show"
            >
              <form
                onSubmit={handleConfirmationSubmit}
                className="space-y-4"
              >
                <motion.div
                  variants={stepPanelMotion.section}
                  className="rounded-md border bg-muted/30 p-4"
                >
                  <h4 className="mb-3 text-sm font-medium">
                    {t("shop.dialog.summaryTitle")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("shop.dialog.summaryProduct")}</span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    {(() => {
                      const price =
                        productType === "account" && "price" in product
                          ? `${(product as { price: number }).price} ${(product as { currency?: string | null }).currency === "EUR" ? "€" : ((product as { currency?: string | null }).currency ?? "")}`
                          : selectedPrice
                            ? `${selectedPrice.price} ${selectedPrice.currency === "EUR" ? "€" : selectedPrice.currency}`
                            : null;
                      return price ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("shop.dialog.summaryPrice")}</span>
                          <span className="font-medium text-green-500">{price}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("shop.dialog.summaryPaymentMethod")}</span>
                      <span className="flex items-center gap-1.5 font-medium">
                        {paymentMethod === "PayPal" ? (
                          <PaypalIcon className="size-3.5" />
                        ) : (
                          <Image
                            src="/revolut.svg"
                            alt="Revolut"
                            width={14}
                            height={14}
                            style={{ filter: "invert(1)" }}
                          />
                        )}
                        {paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("shop.dialog.summarySender")}</span>
                      <span className="font-medium">{senderFirstName} {senderLastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("shop.dialog.summaryAccount")}</span>
                      <span className="font-medium">{senderAccount}</span>
                    </div>
                    {formNotes && (
                      <div className="flex justify-between gap-4">
                        <span className="shrink-0 text-muted-foreground">{t("shop.dialog.summaryNotes")}</span>
                        <span className="truncate font-medium">{formNotes}</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  variants={stepPanelMotion.section}
                  className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="confirm-payment-sent"
                      checked={confirmPaymentSent}
                      onCheckedChange={(checked) =>
                        setConfirmPaymentSent(!!checked)
                      }
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="confirm-payment-sent"
                      className="ml-2 cursor-pointer text-sm leading-relaxed"
                    >
                      {t("shop.dialog.paymentConfirmation")}
                    </Label>
                  </div>
                </motion.div>

                {productType === "account" && (
                  <motion.div
                    variants={stepPanelMotion.section}
                    className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="confirm-price-variation"
                        checked={confirmPriceVariation}
                        onCheckedChange={(checked) =>
                          setConfirmPriceVariation(!!checked)
                        }
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="confirm-price-variation"
                        className="ml-2 cursor-pointer text-sm leading-relaxed"
                      >
                        {t("shop.dialog.priceVariationConfirmation")}
                      </Label>
                    </div>
                  </motion.div>
                )}

                {orderError && (
                  <motion.div
                    variants={stepPanelMotion.section}
                    className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                  >
                    {orderError === "unauthorized"
                      ? t("shop.dialog.errorUnauthorized")
                      : orderError === "product_not_found"
                        ? t("shop.dialog.errorProductNotFound")
                        : t("shop.dialog.errorServer")}
                  </motion.div>
                )}

                <motion.div variants={stepPanelMotion.actions}>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep("payment")}
                      className="flex-1 gap-2"
                    >
                      <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
                      {t("shop.dialog.back")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !confirmPaymentSent || (productType === "account" && !confirmPriceVariation)}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <HugeiconsIcon
                            icon={Loading03Icon}
                            className="mr-2 size-4 animate-spin"
                            strokeWidth={2}
                          />
                          {t("shop.dialog.processing")}
                        </>
                      ) : (
                        t("shop.dialog.confirm")
                      )}
                    </Button>
                  </div>
                </motion.div>
              </form>
            </motion.div>
          )}

          {/* ── Step 4: Order placed ───────────────────────────────── */}
          {currentStep === "chat" && (
            <motion.div
              key="step-chat"
              className="flex flex-col items-center gap-5 overflow-hidden px-0.5 pt-1"
              variants={stepPanelMotion.container}
              initial="hidden"
              animate="show"
            >
              <motion.div
                variants={stepPanelMotion.iconRing}
                className="relative flex size-24 items-center justify-center"
              >
                {!reduceMotion ? (
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-full bg-green-500/25"
                    initial={{ scale: 0.85, opacity: 0.9 }}
                    animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
                    transition={{
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.35,
                    }}
                  />
                ) : null}
                <div className="relative flex size-24 items-center justify-center rounded-full bg-green-500/15">
                  <motion.div
                    variants={stepPanelMotion.iconGlyph}
                    className="flex items-center justify-center"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={1.5}
                      className="size-14 shrink-0 drop-shadow-sm"
                      color="#22c55e"
                    />
                  </motion.div>
                </div>
              </motion.div>
              <motion.div
                variants={stepPanelMotion.text}
                className="text-center"
              >
                <motion.h3
                  className="text-lg font-semibold"
                  animate={
                    reduceMotion
                      ? undefined
                      : { y: [0, -3, 0] }
                  }
                  transition={
                    reduceMotion
                      ? undefined
                      : {
                          delay: 0.45,
                          duration: 0.55,
                          times: [0, 0.45, 1],
                          ease: [0.34, 1.56, 0.64, 1],
                        }
                  }
                >
                  {t("shop.dialog.orderPlacedTitle")}
                </motion.h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("shop.dialog.orderPlacedDescription")}
                </p>
              </motion.div>
              <motion.div
                variants={stepPanelMotion.actions}
                className="flex w-full gap-2"
              >
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                >
                  {t("shop.dialog.close")}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    handleOpenChange(false);
                    if (createdOrderId) {
                      invalidateCache(cacheKey("tickets"));
                      const qs = new URLSearchParams({
                        page: "tickets",
                        orderId: createdOrderId,
                      });
                      router.replace(`${pathname}?${qs.toString()}`);
                    }
                  }}
                >
                  <HugeiconsIcon icon={Message01Icon} strokeWidth={2} />
                  {t("shop.dialog.openChat")}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

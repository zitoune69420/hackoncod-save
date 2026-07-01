"use client";

import React, { useLayoutEffect, useRef, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import Lenis from "lenis";
import { cn } from "@/lib/utils";

export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({
  children,
  itemClassName = "",
}) => (
  <div
    className={cn(
      "scroll-stack-card relative box-border w-full origin-top rounded-[32px] will-change-transform sm:rounded-[40px]",
      "my-6 min-h-[20rem] shadow-[0_0_30px_rgba(0,0,0,0.1)] sm:min-h-[22rem] md:my-8",
      itemClassName
    )}
    style={{
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
    }}
  >
    {children}
  </div>
);

interface ScrollStackProps {
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  /** Décalage fixe (px) sous le haut du viewport — ex. hauteur navbar fixe. */
  stackInsetTop?: number;
  scaleEndPosition?: string;
  baseScale?: number;
  /** Scroll lissé Lenis (window). Désactiver pour un scroll natif type démo React Bits. */
  smoothScroll?: boolean;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = "",
  innerClassName = "",
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = "32%",
  stackInsetTop = 0,
  scaleEndPosition = "10%",
  baseScale = 0.85,
  smoothScroll = false,
  scaleDuration: _scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  /** Tops document (px) mesurées sans transform — scroll window uniquement. */
  const layoutTopsRef = useRef<number[]>([]);
  const lastTransformsRef = useRef(new Map<number, any>());
  const isUpdatingRef = useRef(false);

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === "string" && value.includes("%")) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    if (typeof value === "string" && value.includes("vh")) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value as string);
  }, []);

  const remeasureCardLayoutTops = useCallback(() => {
    const cards = cardsRef.current;
    if (!useWindowScroll || !cards.length) {
      if (!useWindowScroll) layoutTopsRef.current = [];
      return;
    }
    cards.forEach((c) => {
      c.style.transform = "none";
      c.style.filter = "none";
    });
    void cards[0].offsetHeight;
    layoutTopsRef.current = cards.map(
      (c) => c.getBoundingClientRect().top + window.scrollY
    );
    lastTransformsRef.current.clear();
  }, [useWindowScroll]);

  const getScrollTop = useCallback(() => {
    if (useWindowScroll) {
      const l = lenisRef.current;
      if (l && smoothScroll) return l.scroll;
      return window.scrollY || document.documentElement.scrollTop;
    }
    const scroller = containerRef.current;
    return scroller ? scroller.scrollTop : 0;
  }, [useWindowScroll, smoothScroll]);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: getScrollTop(),
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement,
      };
    }
    const scroller = containerRef.current;
    return {
      scrollTop: scroller ? scroller.scrollTop : 0,
      containerHeight: scroller ? scroller.clientHeight : 0,
      scrollContainer: scroller,
    };
  }, [useWindowScroll, getScrollTop]);

  const getElementOffset = useCallback(
    (element: HTMLElement) => {
      if (!element) return 0;
      if (useWindowScroll) {
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY;
      }
      return element.offsetTop;
    },
    [useWindowScroll]
  );

  const updateCardTransforms = useCallback(() => {
    const root = containerRef.current;
    if (!root || !cardsRef.current.length || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx =
      parsePercentage(stackPosition, containerHeight) + stackInsetTop;
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);

    const endElement = root.querySelector(".scroll-stack-end") as HTMLElement | null;
    const endElementTop = endElement ? getElementOffset(endElement) : 0;

    if (useWindowScroll) {
      const tops = layoutTopsRef.current;
      if (tops.length !== cardsRef.current.length) {
        isUpdatingRef.current = false;
        return;
      }
    }

    cardsRef.current.forEach((card, i) => {
      if (!card) return;

      const cardTop = useWindowScroll
        ? layoutTopsRef.current[i]!
        : getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      let blur = 0;
      if (blurAmount > 0) {
        let topCardIndex = 0;
        for (let j = 0; j < cardsRef.current.length; j++) {
          const jCardTop = getElementOffset(cardsRef.current[j]);
          const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }

        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * blurAmount);
        }
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100,
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        card.style.transform = transform;
        card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : "none";

        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData,
    getElementOffset,
    stackInsetTop,
  ]);

  const handleScroll = useCallback(() => {
    updateCardTransforms();
  }, [updateCardTransforms]);

  const setupLenis = useCallback(() => {
    if (useWindowScroll && smoothScroll) {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        wheelMultiplier: 1,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.075,
      });

      lenis.on("scroll", handleScroll);

      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = lenis;
      return lenis;
    }

    if (!useWindowScroll) {
      const scroller = containerRef.current;
      if (!scroller) return;

      const lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector(".scroll-stack-inner") as HTMLElement,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        gestureOrientation: "vertical",
        wheelMultiplier: 1,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.075,
      });

      lenis.on("scroll", handleScroll);

      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);

      lenisRef.current = lenis;
      return lenis;
    }

    return null;
  }, [handleScroll, useWindowScroll, smoothScroll]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll(".scroll-stack-card")) as HTMLElement[];
    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = "transform, filter";
      card.style.transformOrigin = "top center";
      card.style.backfaceVisibility = "hidden";
      card.style.transform = "translateZ(0)";
      card.style.webkitTransform = "translateZ(0)";
    });

    remeasureCardLayoutTops();
    setupLenis();
    updateCardTransforms();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      stackCompletedRef.current = false;
      cardsRef.current = [];
      layoutTopsRef.current = [];
      transformsCache.clear();
      isUpdatingRef.current = false;
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    stackInsetTop,
    scaleEndPosition,
    baseScale,
    _scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    smoothScroll,
    onStackComplete,
    setupLenis,
    remeasureCardLayoutTops,
    updateCardTransforms,
  ]);

  useEffect(() => {
    if (!useWindowScroll || smoothScroll) return;

    const onNativeScroll = () => updateCardTransforms();
    const onResize = () => {
      remeasureCardLayoutTops();
      updateCardTransforms();
    };

    window.addEventListener("scroll", onNativeScroll, { passive: true });
    window.addEventListener("resize", onResize);
    updateCardTransforms();

    return () => {
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [useWindowScroll, smoothScroll, remeasureCardLayoutTops, updateCardTransforms]);

  return (
    <div
      ref={containerRef}
      className={cn(
        useWindowScroll
          ? "relative w-full overflow-x-visible overflow-y-visible"
          : "relative h-full w-full overflow-x-visible overflow-y-auto",
        className
      )}
      data-scroll-stack-root
      style={{
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        scrollBehavior: "auto",
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      <div
        className={cn(
          "scroll-stack-inner mx-auto w-full max-w-full pb-[min(55rem,120vh)] pt-[12vh] sm:pt-[18vh] md:px-10 md:pt-[22vh]",
          innerClassName
        )}
      >
        {children}
        <div className="scroll-stack-end h-px w-full shrink-0" aria-hidden />
      </div>
    </div>
  );
};

export default ScrollStack;

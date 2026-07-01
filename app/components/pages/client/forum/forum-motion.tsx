"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function useForumMotion() {
  const reduceMotion = useReducedMotion();
  return React.useMemo(
    () => ({
      blockIn: {
        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduceMotion
            ? { duration: 0.18, ease: "easeOut" as const }
            : { type: "spring" as const, stiffness: 400, damping: 30 },
        },
      },
      cardIn: {
        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduceMotion
            ? { duration: 0.16, ease: "easeOut" as const }
            : { type: "spring" as const, stiffness: 380, damping: 28 },
        },
      },
      sectionStagger: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0.04 : 0.08,
          },
        },
      },
      gridStagger: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduceMotion ? 0.04 : 0.06,
            delayChildren: reduceMotion ? 0 : 0.03,
          },
        },
      },
    }),
    [reduceMotion],
  );
}

export function ForumMotionListHeader({
  header,
  action,
}: {
  header: React.ReactNode;
  action: React.ReactNode;
}) {
  const { blockIn, sectionStagger } = useForumMotion();
  return (
    <motion.div
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
      variants={sectionStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={blockIn} className="min-w-0 flex-1">
        {header}
      </motion.div>
      <motion.div variants={blockIn} className="shrink-0 self-start">
        {action}
      </motion.div>
    </motion.div>
  );
}

export function ForumMotionStaggerChildren({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { cardIn, gridStagger } = useForumMotion();
  return (
    <motion.div
      className={className}
      variants={gridStagger}
      initial="hidden"
      animate="show"
    >
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div
            key={child.key ?? `forum-item-${i}`}
            variants={cardIn}
            className="min-w-0"
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function ForumMotionFadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { blockIn } = useForumMotion();
  return (
    <motion.div
      variants={blockIn}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

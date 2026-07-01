"use client";

import type { ImgHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { normalizeForumMarkdownSource } from "@/lib/forum/normalize-forum-markdown-source";
import { cn } from "@/lib/utils";

export { normalizeForumMarkdownSource } from "@/lib/forum/normalize-forum-markdown-source";

type Props = {
  source: string;
  className?: string;
  /** Commentaires : marges serrées, sans wrapper typography. */
  compact?: boolean;
  /** Texte clair sur fond primary (bulles chat, etc.). */
  inverted?: boolean;
  /** Texte atténué (messages système sur fond muted, etc.). Incompatible avec inverted. */
  muted?: boolean;
};

type ComponentOpts = {
  compact: boolean;
  inverted: boolean;
  muted: boolean;
};

function createComponents(opts: ComponentOpts) {
  const { compact, inverted, muted } = opts;
  const pMb = compact ? "mb-2 last:mb-0" : "mb-3 last:mb-0";
  const blockMb = compact ? "mb-2 last:mb-0" : "mb-3 last:mb-0";
  const imgMy = compact ? "my-2 max-h-96 first:mt-0" : "my-4 max-h-96";
  const mutedBody = muted && !inverted;
  const text = inverted
    ? "text-primary-foreground"
    : mutedBody
      ? "text-muted-foreground"
      : "text-foreground";

  return {
    p: ({ ...props }: React.ComponentProps<"p">) => (
      <p
        className={cn(
          pMb,
          "leading-relaxed",
          text,
          compact && "mt-0",
        )}
        {...props}
      />
    ),
    strong: ({ ...props }: React.ComponentProps<"strong">) => (
      <strong className={cn("font-semibold", text)} {...props} />
    ),
    a: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        href={href}
        className={cn(
          "underline underline-offset-2 hover:opacity-90",
          inverted
            ? "text-primary-foreground"
            : "text-primary",
        )}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ ...props }: React.ComponentProps<"ul">) => (
      <ul
        className={cn(blockMb, "list-disc space-y-1 pl-6", text)}
        {...props}
      />
    ),
    ol: ({ ...props }: React.ComponentProps<"ol">) => (
      <ol
        className={cn(blockMb, "list-decimal space-y-1 pl-6", text)}
        {...props}
      />
    ),
    code: ({ className, children, ...props }: React.ComponentProps<"code">) =>
      !className ? (
        <code
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[0.9em]",
            inverted
              ? "bg-primary-foreground/20 text-primary-foreground"
              : mutedBody
                ? "bg-muted/80 text-muted-foreground"
                : "bg-muted text-foreground",
          )}
          {...props}
        >
          {children}
        </code>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      ),
    pre: ({ ...props }: React.ComponentProps<"pre">) => (
      <pre
        className={cn(
          blockMb,
          "overflow-x-auto rounded-lg border p-3 text-sm",
          inverted
            ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground"
            : mutedBody
              ? "border-border bg-muted/50 text-muted-foreground"
              : "border-border bg-muted/50 text-foreground",
        )}
        {...props}
      />
    ),
    img: ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src ?? ""}
        alt={alt ?? ""}
        className={cn(
          "w-full max-w-full rounded-lg object-fit shadow-sm ring-1 ring-border/60",
          imgMy,
        )}
        {...props}
      />
    ),
    h2: ({ ...props }: React.ComponentProps<"h2">) => (
      <h2
        className={cn(
          blockMb,
          "text-base font-semibold leading-snug",
          text,
        )}
        {...props}
      />
    ),
    h3: ({ ...props }: React.ComponentProps<"h3">) => (
      <h3
        className={cn(
          blockMb,
          "text-sm font-semibold leading-snug",
          text,
        )}
        {...props}
      />
    ),
    hr: ({ ...props }: React.ComponentProps<"hr">) => (
      <hr
        className={cn(
          "mb-1 mt-3 border-border/50 first:mt-0",
          mutedBody && "border-border/40",
        )}
        {...props}
      />
    ),
  };
}

const componentsDefault = createComponents({
  compact: false,
  inverted: false,
  muted: false,
});
const componentsDefaultInverted = createComponents({
  compact: false,
  inverted: true,
  muted: false,
});
const componentsDefaultMuted = createComponents({
  compact: false,
  inverted: false,
  muted: true,
});
const componentsCompact = createComponents({
  compact: true,
  inverted: false,
  muted: false,
});
const componentsCompactInverted = createComponents({
  compact: true,
  inverted: true,
  muted: false,
});
const componentsCompactMuted = createComponents({
  compact: true,
  inverted: false,
  muted: true,
});

export function ForumMarkdown({
  source,
  className,
  compact = false,
  inverted = false,
  muted = false,
}: Props) {
  const normalized = normalizeForumMarkdownSource(source);
  const components = inverted
    ? compact
      ? componentsCompactInverted
      : componentsDefaultInverted
    : muted
      ? compact
        ? componentsCompactMuted
        : componentsDefaultMuted
      : compact
        ? componentsCompact
        : componentsDefault;
  return (
    <div
      className={cn(
        compact && [
          "[&>p:first-child]:!mt-0",
          "[&>ul:first-child]:!mt-0",
          "[&>ol:first-child]:!mt-0",
          "[&>pre:first-child]:!mt-0",
          "[&>img:first-child]:!mt-0",
        ],
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

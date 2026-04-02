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
};

function createComponents(compact: boolean) {
  const pMb = compact ? "mb-2 last:mb-0" : "mb-3 last:mb-0";
  const blockMb = compact ? "mb-2 last:mb-0" : "mb-3 last:mb-0";
  const imgMy = compact ? "my-2 max-h-96 first:mt-0" : "my-4 max-h-96";

  return {
    p: ({ ...props }: React.ComponentProps<"p">) => (
      <p
        className={cn(
          pMb,
          "leading-relaxed text-foreground",
          compact && "mt-0",
        )}
        {...props}
      />
    ),
    strong: ({ ...props }: React.ComponentProps<"strong">) => (
      <strong className="font-semibold text-foreground" {...props} />
    ),
    a: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        href={href}
        className="text-primary underline underline-offset-2 hover:opacity-90"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ ...props }: React.ComponentProps<"ul">) => (
      <ul
        className={cn(blockMb, "list-disc space-y-1 pl-6 text-foreground")}
        {...props}
      />
    ),
    ol: ({ ...props }: React.ComponentProps<"ol">) => (
      <ol
        className={cn(blockMb, "list-decimal space-y-1 pl-6 text-foreground")}
        {...props}
      />
    ),
    code: ({ className, children, ...props }: React.ComponentProps<"code">) =>
      !className ? (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
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
          "overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-sm",
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
  };
}

const componentsDefault = createComponents(false);
const componentsCompact = createComponents(true);

export function ForumMarkdown({ source, className, compact = false }: Props) {
  const normalized = normalizeForumMarkdownSource(source);
  const components = compact ? componentsCompact : componentsDefault;
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

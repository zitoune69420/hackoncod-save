import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const FAQ_ITEMS = [
  {
    q: "Is it really free?",
    a: "Yes. Most features are available for free. You can access the platform, explore tools and use core functionality without paying. Premium services are optional and designed for users who want more speed, features or priority support.",
  },
  {
    q: "What do I get with premium?",
    a: "Premium gives you: faster updates, extended features, priority support. It’s not required, but it improves the overall experience if you use the platform regularly.",
  },
  {
    q: "How often is the platform updated?",
    a: "The platform is updated regularly to maintain stability, improve performance, and keep everything working smoothly. Updates are continuous rather than occasional.",
  },
  {
    q: "Is the platform stable?",
    a: "Yes. Stability is a core focus. The platform is built to provide consistent access, minimize issues, and reduce downtime as much as possible.",
  },
  {
    q: "How does support work?",
    a: 'Support is available to all users. Free users get standard response times, while premium users receive faster, priority handling.',
  },
  {
    q: "Do I need technical knowledge to use it?",
    a: "No. The platform is designed to be simple and accessible. Everything is organized to reduce friction and make usage straightforward, even for new users.",
  },
] as const

type FaqSectionProps = {
  titleFontClassName?: string
}

export function FaqSection({ titleFontClassName }: FaqSectionProps) {
  return (
    <section
      id="faq"
      className="w-full bg-black py-32"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Frequently Asked Questions
          </p>
          <h2
            id="faq-heading"
            className={cn(
              titleFontClassName,
              "mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl",
            )}
          >
            Common Questions & Answers
          </h2>
          <p className="mt-6 font-medium text-zinc-400">
            Find out all the essential details about our platform and how it can serve your needs.
          </p>
        </div>

        <div className="mx-auto mt-14 grid gap-8 md:grid-cols-2 md:gap-12">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q} className="flex gap-4">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-zinc-800 font-mono text-xs text-emerald-400"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-white">{item.q}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const FAQ_ITEMS = [
  {
    q: "What is a FAQ and why is it important?",
    a: "FAQ stands for Frequently Asked Questions. It is a list that provides answers to common questions people may have about a specific product, service, or topic.",
  },
  {
    q: "Why should I use a FAQ on my website or app?",
    a: "Utilizing a FAQ section on your website or app is a practical way to offer instant assistance to your users or customers. Instead of waiting for customer support responses, they can find quick answers to commonly asked questions.",
  },
  {
    q: "How do I effectively create a FAQ section?",
    a: "Creating a FAQ section starts with gathering the most frequent questions you receive from your users or customers. Once you have a list, you need to write clear, detailed, and helpful answers to each question.",
  },
  {
    q: "What are the benefits of having a well-maintained FAQ section?",
    a: "There are numerous advantages to maintaining a robust FAQ section. Firstly, it provides immediate answers to common queries, which improves the user experience.",
  },
  {
    q: "How should I organize my FAQ for optimal usability?",
    a: 'An organized FAQ is critical for user-friendliness. Start by grouping similar questions into categories, such as "Billing," "Account Setup," or "Technical Support." This way, users can quickly find the section that addresses their specific concerns.',
  },
  {
    q: "How often should I update my FAQ, and why is it necessary?",
    a: "Regular updates to your FAQ are essential to keeping the information accurate and relevant. As your product or service evolves, so will the types of questions your users ask.",
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
          <Badge variant="default" className="h-5 gap-1 rounded-4xl px-2 py-0.5">
            FAQ
          </Badge>
          <h2
            id="faq-heading"
            className={cn(
              titleFontClassName,
              "mt-4 text-4xl font-semibold tracking-tight text-white",
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

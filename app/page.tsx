import { HomeHero } from '@/app/components/home/home-hero';
import { LandingNav } from '@/app/components/home/landing-nav';
import { TrustStrip } from '@/app/components/home/trust-strip';
import { ValuePillars } from '@/app/components/home/value-pillars';
import { UxFeelsBetter } from '@/app/components/home/ux-feels-better';
import { PricingSection } from '@/app/components/home/pricing-section';
import { SupportSection } from '@/app/components/home/support-section';
import { SocialProofSection } from '@/app/components/home/social-proof-section';
import { StatsSection } from '@/app/components/home/stats-section';
import { FaqSection } from '@/app/components/home/faq-section';
import { Syne } from 'next/font/google'
import Link from 'next/link';

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function Home() {
  return (
    <>
    <LandingNav brandName="Hack on COD" brandClassName={syne.className} />
    <HomeHero
      fontClassName={syne.className}
      title="All your Call of Duty tools, in one place."
    >
      <p className="max-w-xl text-center text-lg text-white/75">
      Access tools, features and resources through a clean platform. Start free and upgrade anytime.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        Open dashboard
      </Link>
    </HomeHero>
    <TrustStrip titleFontClassName={syne.className} />
    <ValuePillars titleFontClassName={syne.className} />
    <UxFeelsBetter titleFontClassName={syne.className} />
    <PricingSection titleFontClassName={syne.className} />
    {/* Black spacer: pushes Support section (border included) with no transparent gap */}
    <div className="h-24 bg-black sm:h-28 lg:h-32" aria-hidden />
    <SupportSection titleFontClassName={syne.className} />
    {/* Spacer before Social proof (black background, no gap between sections) */}
    <div className="h-20 bg-black sm:h-28 lg:h-36" aria-hidden />
    <SocialProofSection titleFontClassName={syne.className} />
    <StatsSection titleFontClassName={syne.className} />
    <FaqSection titleFontClassName={syne.className} />
    </>
  );
}

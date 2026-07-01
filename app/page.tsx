import { HomeHero } from '@/app/components/home/home-hero';
import { LandingNav } from '@/app/components/home/landing-nav';
import { TrustStrip } from '@/app/components/home/trust-strip';
import { LazySections } from '@/app/components/home/lazy-sections';
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
    <LazySections titleFontClassName={syne.className} />
    </>
  );
}

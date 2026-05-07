'use client';

import { useEffect, useRef, useState } from 'react';
import { ValuePillars } from './value-pillars';
import { UxFeelsBetter } from './ux-feels-better';
import { PricingSection } from './pricing-section';
import { SupportSection } from './support-section';
import { SocialProofSection } from './social-proof-section';
import { StatsSection } from './stats-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';

interface Props {
  titleFontClassName: string;
}

export function LazySections({ titleFontClassName }: Props) {
  const [loaded, setLoaded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      // fire when sentinel is within 400px below the viewport — triggers near the end of TrustStrip
      { rootMargin: '0px 0px 400px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      {loaded && (
        <>
          <ValuePillars titleFontClassName={titleFontClassName} />
          <UxFeelsBetter titleFontClassName={titleFontClassName} />
          <PricingSection titleFontClassName={titleFontClassName} />
          <div className="h-24 bg-black sm:h-28 lg:h-32" aria-hidden />
          <SupportSection titleFontClassName={titleFontClassName} />
          <div className="h-20 bg-black sm:h-28 lg:h-36" aria-hidden />
          <SocialProofSection titleFontClassName={titleFontClassName} />
          <StatsSection titleFontClassName={titleFontClassName} />
          <FaqSection titleFontClassName={titleFontClassName} />
          <CtaSection titleFontClassName={titleFontClassName} />
        </>
      )}
    </>
  );
}

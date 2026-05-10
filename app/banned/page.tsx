import { Suspense } from "react";
import type { Metadata } from "next";
import { BannedClient } from "@/app/banned/banned-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={null}>
        <BannedClient />
      </Suspense>
    </div>
  );
}

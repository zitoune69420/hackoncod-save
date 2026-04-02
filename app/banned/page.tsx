import { Suspense } from "react";
import { BannedClient } from "@/app/banned/banned-client";

export default function BannedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={null}>
        <BannedClient />
      </Suspense>
    </div>
  );
}

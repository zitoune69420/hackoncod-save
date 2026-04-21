import type { Metadata } from "next";
import { DemoDashboard } from "./demo-dashboard";

export const metadata: Metadata = {
  title: "Démo — Aperçu V.I.P · Hack on COD",
  description:
    "Aperçu du dashboard V.I.P avec des données factices. Découvrez les avantages réservés aux membres V.I.P.",
  robots: { index: false, follow: true },
};

export default function DemoPage() {
  return <DemoDashboard />;
}

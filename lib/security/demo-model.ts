import type {
  SecurityChartRow,
  SecurityDeniedIp,
  SecurityEventRow,
  SecurityRange,
  SecurityRuleRow,
  SecuritySeriesKey,
  SecurityViewModel,
} from "./types";

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Données de démo — à remplacer par pare-feu / WAF / logs réels. */
export function getSecurityViewModel(range: SecurityRange): SecurityViewModel {
  const seed = hashSeed(range);
  const chart: SecurityChartRow[] = [];
  let n = 24;
  let labelAt = (i: number): string => {
    const h = i;
    return `${String(h).padStart(2, "0")}:00`;
  };

  if (range === "7d") {
    n = 7;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    labelAt = (i) => days[i] ?? `D${i}`;
  } else if (range === "30d") {
    n = 10;
    labelAt = (i) => `W${i + 1}`;
  }

  for (let i = 0; i < n; i++) {
    const wobble = ((seed + i * 17) % 97) / 97;
    const allowed = Math.round(
      120 + Math.sin(i / 2) * 80 + wobble * 180 + (i % 4) * 35,
    );
    const denied = Math.round(2 + wobble * 5 + (i % 3));
    const challenged = Math.round(15 + wobble * 35 + (i % 2) * 12);
    const logged = range === "1d" && i % 5 === 0 ? Math.round(3 + wobble * 8) : 0;
    const rateLimited =
      range !== "1d" ? Math.round(wobble * 4) : i % 7 === 0 ? Math.round(1 + wobble * 3) : 0;

    chart.push({
      label: labelAt(i),
      allowed: Math.max(0, allowed),
      denied: Math.max(0, denied),
      challenged: Math.max(0, challenged),
      logged,
      rateLimited,
    });
  }

  const sum = (k: keyof SecurityChartRow) =>
    chart.reduce((a, r) => a + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);

  const allowedSum = sum("allowed");
  const deniedSum = sum("denied");
  const challengedSum = sum("challenged");
  const loggedSum = sum("logged");
  const rlSum = sum("rateLimited");

  const legendTotals: Record<SecuritySeriesKey, number | null> = {
    allowed: allowedSum,
    denied: deniedSum,
    challenged: challengedSum,
    logged: loggedSum > 0 ? loggedSum : null,
    rateLimited: rlSum > 0 ? rlSum : null,
  };

  const rules: SecurityRuleRow[] = [
    { id: "bot", label: "Bot Protection", count: challengedSum + Math.round(seed % 200) },
    { id: "ddos", label: "DDoS Mitigation", count: 20 + (seed % 40) },
    { id: "ai", label: "AI Bots", count: 15 + (seed % 30) },
  ];

  const deniedIps: SecurityDeniedIp[] = [
    { ip: "77.83.39.167", countryCode: "DE", count: 8 },
    { ip: "185.220.101.44", countryCode: "NL", count: 5 },
    { ip: "45.142.212.61", countryCode: "FR", count: 4 },
    { ip: "91.231.89.19", countryCode: "GB", count: 4 },
    { ip: "103.152.112.120", countryCode: "PH", count: 2 },
  ];

  const events: SecurityEventRow[] = [];

  return {
    range,
    sourceNote:
      "Données de démonstration. Branchez vos logs WAF / Cloudflare / pare-feu pour des métriques réelles.",
    firewallHeadline: "Firewall is active",
    firewallSub: "All systems normal",
    botProtectionLabel: "Bot Protection",
    botProtectionStatus: "Active",
    customRulesCount: 0,
    legendTotals,
    chart,
    rules,
    events,
    deniedIps,
  };
}

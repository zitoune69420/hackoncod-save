export type SecurityRange = "1d" | "7d" | "30d";

export type SecuritySeriesKey =
  | "allowed"
  | "denied"
  | "challenged"
  | "logged"
  | "rateLimited";

export type SecurityChartRow = {
  label: string;
  allowed: number;
  denied: number;
  challenged: number;
  logged: number;
  rateLimited: number;
};

export type SecurityRuleRow = {
  id: string;
  label: string;
  count: number;
};

export type SecurityDeniedIp = {
  ip: string;
  countryCode: string;
  count: number;
};

export type SecurityEventRow = {
  action: string;
  hostname: string;
  ip: string;
  start: string;
  requests: number;
};

export type SecurityViewModel = {
  range: SecurityRange;
  /** Bannière optionnelle (ex. source démo). */
  sourceNote?: string;
  firewallHeadline: string;
  firewallSub: string;
  botProtectionLabel: string;
  botProtectionStatus: string;
  customRulesCount: number;
  legendTotals: Record<SecuritySeriesKey, number | null>;
  chart: SecurityChartRow[];
  rules: SecurityRuleRow[];
  events: SecurityEventRow[];
  deniedIps: SecurityDeniedIp[];
};

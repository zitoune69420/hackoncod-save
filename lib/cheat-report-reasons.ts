export const CHEAT_REPORT_REASON_KEYS = [
  "not_working",
  "outdated_version",
  "detection_risk",
  "crash_or_error",
  "wrong_instructions",
  "other",
] as const;

export type CheatReportReasonKey = (typeof CHEAT_REPORT_REASON_KEYS)[number];

/** Libellés FR pour le webhook Discord (alignés sur `messages/fr.json`). */
export const CHEAT_REPORT_REASON_WEBHOOK_LABEL_FR: Record<
  CheatReportReasonKey,
  string
> = {
  not_working: "Ne fonctionne pas / introuvable",
  outdated_version: "Version ou jeu obsolète",
  detection_risk: "Risque de détection",
  crash_or_error: "Crash ou erreur",
  wrong_instructions: "Instructions ou lien incorrects",
  other: "Autre",
};

export function isCheatReportReasonKey(v: string): v is CheatReportReasonKey {
  return (CHEAT_REPORT_REASON_KEYS as readonly string[]).includes(v);
}

/**
 * Comparaison à temps constant pour secrets ASCII/UTF-8 (Edge + Node).
 * Pas de retour anticipé sur longueur différente pour éviter l'oracle de longueur par timing.
 */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  // XOR de la différence de longueur dans diff — pas de retour anticipé
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Jeu de données factice pour la page `/demo` (aperçu V.I.P).
 * Noms, jeux et statuts inspirés de la console réelle — aucun lien de téléchargement.
 */
export type DemoVipCheat = {
  id: string;
  name: string;
  game: string;
  mode: string;
  extension: string;
  /** Bypass/anti-cheat contourné */
  crack: boolean;
  /** Client custom (launcher + auto-updater) */
  client: boolean;
};

export const DEMO_VIP_CHEATS: DemoVipCheat[] = [
  {
    id: "demo-vip-001",
    name: "Skull Internal",
    game: "Warzone",
    mode: "Battle Royale",
    extension: ".dll",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-002",
    name: "Phantom Aim",
    game: "Black Ops 6",
    mode: "Multijoueur",
    extension: ".exe",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-003",
    name: "RageBot Alpha",
    game: "Modern Warfare III",
    mode: "Multijoueur",
    extension: ".dll",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-004",
    name: "Silent Scope",
    game: "Warzone",
    mode: "Resurgence",
    extension: ".exe",
    crack: true,
    client: false,
  },
  {
    id: "demo-vip-005",
    name: "PixelBot Legit",
    game: "Black Ops 6",
    mode: "Ranked",
    extension: ".exe",
    crack: false,
    client: true,
  },
  {
    id: "demo-vip-006",
    name: "Radar Hunter",
    game: "Warzone",
    mode: "Plunder",
    extension: ".dll",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-007",
    name: "Ghost ESP",
    game: "Modern Warfare III",
    mode: "Zombies",
    extension: ".dll",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-008",
    name: "ColorBot Premium",
    game: "Black Ops 6",
    mode: "Warzone",
    extension: ".exe",
    crack: false,
    client: true,
  },
  {
    id: "demo-vip-009",
    name: "AutoHeal",
    game: "Warzone",
    mode: "Battle Royale",
    extension: ".dll",
    crack: true,
    client: true,
  },
  {
    id: "demo-vip-010",
    name: "No Recoil Suite",
    game: "Modern Warfare III",
    mode: "Multijoueur",
    extension: ".exe",
    crack: true,
    client: true,
  },
];

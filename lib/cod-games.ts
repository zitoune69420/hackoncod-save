/**
 * Jeux COD sur la page Cheats : raccourcis + menu « … » (icônes locales).
 * Les libellés doivent correspondre aux titres en base (`game.title`) quand le jeu existe.
 */
export type CodGameOption = {
  label: string;
  icon: string;
  value: string;
  pinned: boolean;
};

export const COD_GAMES: readonly CodGameOption[] = [
  {
    label: "Call of Duty: Black Ops",
    icon: "cod-bo1.png",
    value: "cod-bo1",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops 2",
    icon: "cod-bo2.png",
    value: "cod-bo2",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops 3",
    icon: "cod-bo3.png",
    value: "cod-bo3",
    pinned: true,
  },
  {
    label: "Call of Duty: Black Ops 4",
    icon: "cod-bo4.png",
    value: "cod-bo4",
    pinned: false,
  },
  {
    label: "Call of Duty: Black Ops Cold War",
    icon: "cod-bocw.png",
    value: "cod-bocw",
    pinned: true,
  },
  {
    label: "Call of Duty: Ghosts",
    icon: "cod-ghosts.png",
    value: "cod-ghosts",
    pinned: false,
  },
  {
    label: "Call of Duty: Infinite Warfare",
    icon: "cod-iw.png",
    value: "cod-iw",
    pinned: true,
  },
  {
    label: "Call of Duty 4: Modern Warfare",
    icon: "cod4.png",
    value: "cod4",
    pinned: false,
  },
  {
    label: "Call of Duty: Modern Warfare 2",
    icon: "cod-mw2.png",
    value: "cod-mw2",
    pinned: false,
  },
  {
    label: "Call of Duty: Modern Warfare 3",
    icon: "cod-mw3.png",
    value: "cod-mw3",
    pinned: false,
  },
  {
    label: "Call of Duty: World at War",
    icon: "cod-waw.png",
    value: "cod-waw",
    pinned: false,
  },
  {
    label: "Call of Duty: World War 2",
    icon: "cod-ww2.png",
    value: "cod-ww2",
    pinned: false,
  },
] as const;

/**
 * Liste étendue de titres Call of Duty (principale série + déclinaisons notables),
 * pour le select « suggestion de cheat ». Ordre approximatif de sortie.
 * Les libellés dupliquent ceux de la toolbar quand ils servent au matching DB.
 */
export const COD_GAME_TITLES_FOR_SUGGESTIONS: readonly string[] = [
  "Call of Duty",
  "Call of Duty 2",
  "Call of Duty 3",
  "Call of Duty 4: Modern Warfare",
  "Call of Duty: World at War",
  "Call of Duty: Modern Warfare 2",
  "Call of Duty: Modern Warfare 2 Campaign Remastered",
  "Call of Duty: Modern Warfare 3",
  "Call of Duty: Black Ops",
  "Call of Duty: Black Ops 2",
  "Call of Duty: Ghosts",
  "Call of Duty: Advanced Warfare",
  "Call of Duty: Black Ops 3",
  "Call of Duty: Infinite Warfare",
  "Call of Duty: Modern Warfare Remastered",
  "Call of Duty: World War 2",
  "Call of Duty: Black Ops 4",
  "Call of Duty: Modern Warfare (2019)",
  "Call of Duty: Black Ops Cold War",
  "Call of Duty: Vanguard",
  "Call of Duty: Modern Warfare II",
  "Call of Duty: Modern Warfare III",
  "Call of Duty: Black Ops 6",
  "Call of Duty: Black Ops 7",
  "Call of Duty: Warzone",
  "Call of Duty: Mobile",
];

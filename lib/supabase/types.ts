export type Cheat = {
  id: string
  name: string
  game_id: string
  mode: string
  platform: string
  crack: boolean
  client: string
  extension: string
  link: string
  statut: string
  vip: boolean
  semi_vip: boolean
  created_at: string
  updated_at: string
}

export type Game = {
  id: string
  title: string
  description: string | null
  image: string | null
  steam: string | null
  link: string | null
  client: string | null
  created_at: string
  updated_at: string
  displayed: boolean
}

export type CheatWithGame = Cheat & {
  game: { title: string } | { title: string }[] | null
}

export type Video = {
  id: string
  title: string
  description: string | null
  image: string | null
  link: string | null
  created_at: string
  updated_at: string
}

export type Review = {
  id: string
  user_id: string
  message: string
  note: number
  /** Renseigné à la création (session / OAuth) — évite l’API bot pour l’affichage. */
  author_name?: string | null
  created_at: string
  updated_at: string
}

/** Avis enrichis pour l’UI (même forme que l’API `/api/reviews`). */
export type ReviewWithAuthor = Review

# AGENTS.md — Next.js (App Router) + Tailwind + shadcn/ui

---

## 0. Principes non négociables

1. Simplicité > abstraction
2. Server-first systématique
3. Zéro logique implicite
4. Performance mesurable uniquement (pas d’optimisation spéculative)
5. Chaque fichier a une responsabilité unique
6. Toute complexité doit être justifiée ou supprimée

---

## 1. Stack technique

* Framework : Next.js (App Router uniquement)
* UI : Tailwind CSS
* Composants : shadcn/ui
* Langage : TypeScript (`strict: true`)
* Lint : ESLint + Prettier

### Règles structurelles

* Interdiction d’import circulaire
* Interdiction d’accès direct cross-feature
* Chaque feature est isolée
* `lib/` ne dépend jamais de React

---

## 3. Server vs Client (critique)

### Par défaut

* Tous les composants = Server Components

### Client uniquement si :

* interaction utilisateur
* état local
* API browser (window, localStorage)

```
"use client"
```

### Interdits

* fetch en client sans nécessité
* logique métier en client
* duplication server/client

---

## 4. Data Fetching (strict)

### Toujours explicite

```
fetch(url, { cache: "force-cache" })     // SSG
fetch(url, { cache: "no-store" })        // SSR
fetch(url, { next: { revalidate: 60 } }) // ISR
```

### Interdits

* axios
* fetch inline dans JSX complexe
* mutation sans validation

---

## 5. Mutations

* Toujours via Server Actions ou API routes
* Validation obligatoire

Pattern :

```
"use server"

export async function createUser(data: Input) {
  const parsed = schema.parse(data)
  ...
}
```

---

## 7. Composants

### Règles

* < 100 lignes
* Props explicites
* Pas de logique cachée

### Interdits

* props implicites
* children non typés
* composants “god object”

---

## 8. State management

### Autorisé

* useState (local uniquement)
* useReducer (complexité locale)

### Interdit

* global state sans raison critique
* Redux/Zustand par défaut

### Alternative

* Server state via RSC

---

## 9. Performance

### Obligatoire

* éviter JS client
* éviter hydration inutile
* éviter re-renders

### Images

```
import Image from "next/image"
```

Toujours :

* width
* height
* sizes

### Fonts

* utiliser `next/font`
* pas de Google Fonts runtime

---

## 10. Tailwind (discipline stricte)

### Autorisé

* classes utilitaires uniquement

### Interdit

* CSS custom inutile
* `@apply`
* styles inline complexes

### Pattern

```
className="flex items-center gap-2 p-4"
```

---

## 11. shadcn/ui

### Règles

* jamais modifier `/ui`
* wrapper autorisé
* pas de duplication

### Mauvais

modifier bouton directement

### Correct

```
export function PrimaryButton(props) {
  return <Button {...props} />
}
```

---

## 12. Accessibilité

* labels obligatoires
* aria seulement si nécessaire
* focus visible
* navigation clavier complète

---

## 13. SEO

* Metadata obligatoire

```
export const metadata = { ... }
```

* pas de contenu critique côté client
* HTML lisible sans JS

---

## 14. Sécurité

* validation systématique (zod)
* jamais exposer secrets
* sanitize input

---

## 15. Variables d’environnement

Centralisation :

```
lib/env.ts
```

Interdit :

```
process.env.X dans le code
```

---

## 16. API Routes

* REST minimal
* validation entrée
* réponse typée

---

## 17. Tests

### Unit

* logique pure

### E2E

* parcours critique

### Interdits

* tests fragiles
* tests timing

---

## 18. Lint & Types

Refus si :

* any
* unknown non contrôlé
* type implicite

Commandes :

```
pnpm lint
pnpm type-check
```

---

## 19. Git — Conventional Commits

Format :

```
type(scope): message
```

### Types

* feat
* fix
* refactor
* perf
* docs
* test
* chore

### Règles

* impératif
* court
* précis

---

## 20. Pull Requests

Doit contenir :

* problème
* solution
* impact

Interdits :

* PR massives incohérentes
* mélange refactor/feature

---

## 21. Anti-patterns critiques

* `useEffect` pour fetch
* composants énormes
* logique métier dans UI
* dépendances inutiles
* abstractions prématurées
* duplication

---

## 22. Checklist stricte avant commit

* build OK
* types OK
* lint OK
* aucun console.log
* aucun code mort
* perf non dégradée

---

## 23. Règle de suppression

Tout code :

* non utilisé
* non testé
* non justifié

→ supprimé

---

## 24. Règle finale

Si tu dois expliquer une abstraction, elle est probablement mauvaise.

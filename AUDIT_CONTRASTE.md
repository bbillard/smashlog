# Audit contraste texte — Smashlog

Date : 2026-08-05
Périmètre : `src/` et `app/` (thème, écrans, composants). Analyse statique du code + calcul de contraste WCAG 2.1 sur les couleurs réellement définies dans `src/theme/colors.ts`.
Aucun fichier modifié — audit uniquement.

---

## 1. Résumé

Le diagnostic des beta-testeurs est confirmé par le code : la couleur de texte secondaire du thème (`secondaryText` / `textMuted`, `#6B6B7A`) est utilisée à **210 endroits dans 31 fichiers**, sur des fonds quasi noirs (`#0D0D0F`, `#080809`, `#16161A`, `#1E1E24`). Son contraste va de **3.17:1 à 3.82:1** selon le fond — sous le seuil WCAG AA de 4.5:1 pour du texte normal. Et comme cette couleur est presque toujours utilisée en petite taille (9 à 13px, poids normal), l'exception "grand texte" (seuil 3:1) ne s'applique pas non plus : ce texte est en échec AA dans quasiment tous ses usages.

Plus grave : dans **5 champs de formulaire**, le placeholder ajoute une transparence supplémentaire par-dessus cette couleur déjà faible (`secondaryText + "70"` ou `rgba(107,107,122,0.45)`), ce qui fait chuter le contraste réel à **~1.6:1** — le texte est quasiment invisible sur fond sombre.

Le texte principal (`theme.text`, `#F0F0F2`) et le texte tertiaire (`theme.tertiaryText`, `#9999AA`) sont en revanche largement conformes (contraste 14–20:1 et 5.9–7.1:1).

---

## 2. Palette définie (`src/theme/colors.ts`)

Le thème n'a qu'une seule variante (`darkTheme` = copie de `lightTheme`) — pas de vrai mode clair actuellement.

| Token thème | Valeur hex | Rôle déclaré |
|---|---|---|
| `background` | `#0D0D0F` | fond principal |
| `backgroundAlt` | `#080809` | fond secondaire (encore plus sombre) |
| `surface` / `surfaceAlt` | `#16161A` / `#1E1E24` | cartes, blocs |
| `text` | `#F0F0F2` | texte principal |
| `secondaryText` | `#6B6B7A` | texte secondaire (labels, placeholders, meta) |
| `tertiaryText` | `#9999AA` | texte tertiaire |
| `primary` / `accent` | `#CEFF00` | accent (vert-jaune) |
| `accent2` | `#FF4D6D` | accent rouge/rose (aussi `danger`) |
| `accent3` | `#00E5FF` | accent cyan |

## 3. Contraste mesuré (WCAG 2.1, sur fond réel)

| Texte sur fond → | `#0D0D0F` (bg) | `#080809` (bgOuter) | `#16161A` (surface) | `#1E1E24` (surface2) |
|---|---|---|---|---|
| `text` `#F0F0F2` | 17.1 ✅ | 17.6 ✅ | 15.9 ✅ | 14.6 ✅ |
| `tertiaryText` `#9999AA` | 6.9 ✅ | 7.1 ✅ | 6.4 ✅ | 5.9 ✅ |
| **`secondaryText` `#6B6B7A`** | **3.7 ❌** | **3.8 ❌** | **3.4 ❌** | **3.2 ❌** |
| accents (`#CEFF00`, `#FF4D6D`, `#00E5FF`) | 6.0–16.6 ✅ | — | — | — |

✅ = AA normal (≥4.5:1) · ❌ = sous le seuil AA normal, tout juste à la limite du seuil "grand texte" (3:1), mais ce seuil ne s'applique pas ici (voir §4).

---

## 4. Le problème central : `secondaryText` (#6B6B7A)

**Pourquoi c'est un problème même si 3.2–3.8:1 semble "proche" de la norme :** le seuil réduit de 3:1 de la norme AA ne s'applique qu'au texte "large" (≥24px normal, ou ≥18.66px gras). Or dans le code, `secondaryText` est quasi systématiquement utilisé en 9 à 13px, poids normal :

- `label` (stat "Win rate") : 9px
- `sectionTitle` : 9px
- `heroMeta`, `notesEditBtnText` : 12px

→ Aucune exception ne s'applique : ce texte devrait atteindre 4.5:1 et n'atteint que 3.2–3.8:1.

### Où ce texte apparaît (top fichiers, sur 210 usages / 31 fichiers)

| Fichier | Occurrences | Écran |
|---|---|---|
| `app/players/[id].tsx` | 23 | Fiche joueur |
| `src/components/MatchesAccordion.tsx` | 22 | Historique des matchs (accordéon) |
| `src/components/ExerciseForm.tsx` | 20 | Formulaire création/édition d'exercice |
| `app/session/[id].tsx` | 13 | Détail d'une session |
| `app/(tabs)/exercises.tsx` | 12 | Liste des exercices |
| `src/components/ExercisesAccordion.tsx` | 11 | Accordéon exercices |
| `app/exercise/[id]/index.tsx` | 11 | Détail exercice |
| `app/sessions.tsx` | 10 | Liste des sessions |
| `app/players/index.tsx` | 8 | Liste des joueurs |
| `app/settings.tsx` | 7 | Réglages |
| `app/(tabs)/stats.tsx` | 7 | Statistiques |
| `app/auth.tsx` | 6 | Connexion / inscription |
| + 19 autres fichiers | 1–5 chacun | (profil, onboarding, partage, sidebar, etc.) |

### Types de texte concernés (avec cette même couleur trop faible)

- **Titres de section** — ex. "Notes", "Historique" dans la fiche joueur (`sectionTitle`, 9px)
- **Labels de statistiques** — "Win rate", compteurs (`label`, 9px)
- **Texte méta / horodatage** — "Depuis le...", dates de match, "vs.", "· avec [partenaire]"
- **Sous-titres de formulaire** — sous-titre du formulaire exercice (`subtitle`)
- **Liens et actions secondaires sur l'écran de connexion** — "Mot de passe oublié ?", "Continuer sans compte", séparateur "ou", onglet inactif Connexion/Inscription (`app/auth.tsx`) — **c'est l'écran d'entrée dans l'app, donc particulièrement sensible**
- **Icônes** — chevrons, icônes d'édition/suppression utilisent la même couleur que le texte associé (`theme.secondaryText`), donc aussi peu visibles
- **Placeholders de champs texte** — voir §5, cas le plus critique

---

## 5. Cas le plus critique : placeholders quasi invisibles

19 champs utilisent `placeholderTextColor={theme.secondaryText}` (contraste 3.2–3.8:1, déjà sous la norme). Mais **5 d'entre eux ajoutent une transparence supplémentaire**, ce qui fait chuter le contraste réel à environ **1.6:1** (quasiment invisible sur fond sombre) :

| Fichier | Ligne | Technique |
|---|---|---|
| `app/players/index.tsx` | 116 | `theme.secondaryText + "70"` (≈44% opacité) |
| `app/players/partenaires.tsx` | 82 | `theme.secondaryText + "70"` |
| `app/players/adversaires.tsx` | 82 | `theme.secondaryText + "70"` |
| `app/players/[id].tsx` | 420 | `theme.secondaryText + "70"` (placeholder "Ajoute des notes...") |
| `src/components/PlayerAutocomplete.tsx` | 285 | `rgba(107,107,122,0.45)` (même couleur, écrite en dur) |

Ce sont les champs de recherche joueur (liste joueurs, partenaires, adversaires), la zone de notes sur la fiche joueur, et l'autocomplete joueur. Sur ces écrans, un champ de saisie vide donne l'impression d'être une zone vide plutôt qu'un champ à remplir.

---

## 6. Ce qui est déjà conforme

- `theme.text` (`#F0F0F2`) : contraste 14.6–17.6:1 sur tous les fonds — très largement conforme, utilisé pour le texte principal (titres, contenu, valeurs de stats).
- `theme.tertiaryText` (`#9999AA`) : contraste 5.9–7.1:1 — conforme AA. Utilisé pour "vs.", légende du calendrier stats, aperçus de date, badge de niveau exercice.
- Les couleurs d'accent (`#CEFF00`, `#FF4D6D`, `#00E5FF`) : toutes ≥6:1, conformes.

---

## 7. Anomalies annexes (moindre priorité)

- **`#8b8b98` codé en dur** dans `src/components/planning/PlanningEditor.tsx` (3 endroits) et `app/planning.tsx` (1 endroit) : couleur proche de `tertiaryText` mais pas issue du thème. Contraste correct (5.8:1) mais incohérence de design system — devrait probablement être remplacée par `theme.tertiaryText`.
- **`rgba(255,255,255,0.06–0.45)` utilisé comme couleur de texte** : ~30 occurrences, concentrées dans `src/components/share/*ShareCard.tsx` (cartes générées pour le partage sur les réseaux) et 2 dans `app/onboarding/pseudo.tsx` (texte d'aperçu dans une mini-carte de prévisualisation, pas le formulaire réel). Priorité plus faible : ce sont des visuels décoratifs/exportés plutôt que de l'UI fonctionnelle lue en continu, mais à vérifier si l'un de ces textes porte une information utile (ex. username placeholder en italique à 35% d'opacité).

---

## 8. Récapitulatif par sévérité

| Sévérité | Constat | Ampleur |
|---|---|---|
| 🔴 Critique | Placeholders à ~1.6:1 (quasi invisibles) | 5 champs, 5 écrans (recherche joueurs ×3, notes fiche joueur, autocomplete) |
| 🟠 Élevée | `secondaryText` à 3.2–3.8:1 sur texte réel (titres, labels, liens, meta) | 210 usages, 31 fichiers, dont l'écran de connexion |
| 🟡 Faible | Couleur codée en dur hors thème (`#8b8b98`) | 4 endroits, incohérence plutôt qu'illisibilité |
| 🟢 À vérifier | Textes blancs très transparents dans les cartes de partage/onboarding | ~30 occurrences, contexte majoritairement décoratif |

---

## 9. Prochaine étape

Le point de levier principal est unique : **`secondaryText` / `textMuted` (`#6B6B7A`)** est défini une seule fois dans `src/theme/colors.ts` et propagé partout via `theme.secondaryText`. L'éclaircir suffirait à corriger la quasi-totalité des 210 usages d'un coup (hors les 5 placeholders avec transparence additionnelle, à traiter en supprimant le `+ "70"` / la transparence en plus).

À voir ensemble : quelle nouvelle valeur pour `textMuted` (ex. viser ≥4.5:1 sur le fond le plus sombre `#1E1E24`, ce qui donnerait une base pour calculer la teinte).

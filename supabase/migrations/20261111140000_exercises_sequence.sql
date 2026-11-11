-- Séquence de jeu structurée d'un exercice (ticket v1.4.1 « Wizard exercice —
-- étape Séquence de jeu (constructeur de coups) »).
--
-- jsonb nullable : les exercices existants n'ont pas de séquence et restent
-- valides. Côté app : Exercise.sequence ({ roles, distribution, steps, ending,
-- repetitions? }), mappé par src/services/supabaseMappers.ts (toExerciseRow /
-- fromExerciseRow, relu via parseExerciseSequence). Le schéma terrain est
-- recalculé à l'affichage et n'est jamais stocké ici.
--
-- ⚠️ À coller dans le SQL Editor Supabase AVANT de publier une version de
-- l'app qui envoie sequence : sans la colonne, les upserts d'exercices
-- échouent (PGRST204 « Could not find the 'sequence' column »).
alter table public.exercises
  add column if not exists sequence jsonb;

// ─────────────────────────────────────────────────────────────────────────────
// src/data/notificationMessages.ts
//
// Messages de motivation affichés dans les notifications quand aucune intention
// n'est disponible pour le contexte donné.
// Validés manuellement — ne pas modifier sans validation produit.
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationContext =
  | 'daily_no_badminton_session'       // rappel quotidien, aucune séance badminton enregistrée
  | 'planning_badminton_no_intent'     // créneau badminton, aucune intention badminton trouvée
  | 'planning_renforcement_no_intent'  // créneau renforcement, aucune intention trouvée
  | 'planning_cardio_no_intent'        // créneau cardio, aucune intention trouvée
  | 'planning_autre_no_intent';        // créneau autre, aucune intention trouvée

export const MOTIVATION_MESSAGES: Record<NotificationContext, string[]> = {

  // Rappel quotidien badminton — aucune séance badminton enregistrée
  // (l'utilisateur vient d'installer l'app et n'a pas encore joué)
  daily_no_badminton_session: [
    "C'est l'heure de jouer. Ta première séance t'attend — pense à noter ton ressenti après.",
    "Prêt à smasher ? Enregistre ta séance après pour commencer à suivre ta progression.",
    "Le voyage commence par une première séance. À toi de jouer 🏸",
  ],

  // Planning badminton — aucune intention badminton trouvée
  planning_badminton_no_intent: [
    "C'est l'heure du badminton. Joue, observe, et note ton ressenti après — c'est là que tout commence.",
    "Séance badminton dans quelques minutes. Profites-en pour définir ton premier objectif après.",
    "À toi de jouer. Après la séance, prends 30 secondes pour noter ce qui s'est passé.",
  ],

  // Planning renforcement — aucune intention trouvée
  planning_renforcement_no_intent: [
    "C'est l'heure du renforcement. Donne tout, tu le sentiras sur le terrain.",
    "Séance muscu dans quelques minutes. Le travail physique fait la différence sur le long terme.",
    "C'est l'heure de bosser le physique. Chaque série compte.",
  ],

  // Planning cardio — aucune intention trouvée
  planning_cardio_no_intent: [
    "C'est l'heure du cardio. Ton endurance sur le terrain se construit maintenant.",
    "Séance cardio dans quelques minutes. Lance-toi, le plus dur c'est de commencer.",
    "En route pour devenir infatigable sur le terrain.",
  ],

  // Planning autre (mobilité, récupération…) — aucune intention trouvée
  planning_autre_no_intent: [
    "C'est l'heure de ta séance. Prends soin de ton corps, ça paiera sur le terrain.",
    "Séance dans quelques minutes. La régularité, c'est ce qui fait la différence.",
    "C'est parti. Chaque effort compte, même les plus discrets.",
  ],

};

// ── Utilitaire : tirage aléatoire d'un message selon le contexte ──────────────

/**
 * Retourne un message de motivation aléatoire pour le contexte donné.
 * Utilisé par le scheduler de notifications quand aucune intention n'est disponible.
 */
export function pickMotivationMessage(context: NotificationContext): string {
  const messages = MOTIVATION_MESSAGES[context];
  return messages[Math.floor(Math.random() * messages.length)];
}

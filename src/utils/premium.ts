/**
 * Fonction utilitaire à utiliser partout où l'accès premium doit être
 * vérifié (les bêta-testeurs conservent l'accès via beta_access = true).
 * Ne contient aucune logique de paywall — juste la règle d'accès.
 *
 * Équivalent disponible directement sur le contexte : useAuth().isPremiumOrBeta.
 */
export function isPremiumOrBeta(flags: { isPremium: boolean; isBetaUser: boolean }): boolean {
  return flags.isPremium || flags.isBetaUser;
}

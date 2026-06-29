// ─────────────────────────────────────────────────────────────────────────────
// src/data/sharingData.ts
//
// Source de vérité pour les cartes de partage streak / milestone.
// Converti depuis Messages_partage_v2.xlsx — ne pas modifier manuellement.
// ─────────────────────────────────────────────────────────────────────────────

export type MessageType =
  | 'weeks_streak'
  | 'sessions_per_week'
  | 'milestones'
  | 'low_session_rate'
  | null; // null = applicable à tous les types

export type MessageLevel = 1 | 2 | 3 | 4 | 5;

export type CardType = 'weeksStreak' | 'sessionsPerWeek' | 'milestone';

export interface ShareMessage {
  id: number;
  template: string;    // *player_name* à substituer si hasPlayer = true
  type: MessageType;
  level: MessageLevel;
  hasPlayer: boolean;
}

export interface Threshold {
  value: number;       // semaines, sessions/semaine, ou total séances
  level: MessageLevel;
}

export interface Player {
  name: string;
  weight: number;      // poids pour tirage pondéré, normalisé à l'usage
}

// ── Paliers Weeks Streak (en semaines) ───────────────────────────────────────

export const WEEKS_STREAK_THRESHOLDS: Threshold[] = [
  { value: 2,   level: 1 }, // 2 semaines
  { value: 3,   level: 1 }, // 3 semaines
  { value: 4,   level: 1 }, // 1 mois
  { value: 8,   level: 2 }, // 2 mois
  { value: 10,  level: 2 }, // 10 semaines
  { value: 12,  level: 2 }, // 3 mois
  { value: 16,  level: 2 }, // 4 mois
  { value: 20,  level: 2 }, // 5 mois
  { value: 24,  level: 3 }, // 6 mois
  { value: 28,  level: 3 }, // 7 mois
  { value: 32,  level: 3 }, // 8 mois
  { value: 36,  level: 3 }, // 9 mois
  { value: 40,  level: 4 }, // 10 mois
  { value: 44,  level: 4 }, // 11 mois
  { value: 50,  level: 4 }, // 50 semaines
  { value: 52,  level: 4 }, // 1 an
  { value: 78,  level: 5 }, // 18 mois
  { value: 100, level: 5 }, // 100 semaines
  { value: 104, level: 5 }, // 2 ans
];

// ── Paliers Sessions per Week ─────────────────────────────────────────────────

export const SESSIONS_PER_WEEK_THRESHOLDS: Threshold[] = [
  { value: 2,  level: 1 },
  { value: 3,  level: 1 },
  { value: 4,  level: 1 },
  { value: 5,  level: 2 },
  { value: 6,  level: 2 },
  { value: 7,  level: 2 },
  { value: 8,  level: 3 },
  { value: 9,  level: 3 },
  { value: 10, level: 3 },
  { value: 11, level: 4 },
  { value: 12, level: 4 },
  { value: 13, level: 4 },
  { value: 14, level: 4 },
  { value: 15, level: 5 },
  { value: 16, level: 5 },
  { value: 17, level: 5 },
  { value: 18, level: 5 },
  { value: 19, level: 5 },
  { value: 20, level: 5 },
  { value: 21, level: 5 },
];

// ── Paliers Milestones (total séances cumulées) ───────────────────────────────

export const MILESTONE_THRESHOLDS: Threshold[] = [
  { value: 5,   level: 1 },
  { value: 10,  level: 1 },
  { value: 15,  level: 1 },
  { value: 20,  level: 1 },
  { value: 25,  level: 1 },
  { value: 30,  level: 2 },
  { value: 40,  level: 2 },
  { value: 50,  level: 2 },
  { value: 75,  level: 2 },
  { value: 100, level: 3 },
  { value: 150, level: 3 },
  { value: 200, level: 4 },
  { value: 250, level: 4 },
  { value: 300, level: 4 },
  { value: 400, level: 5 },
  { value: 500, level: 5 },
];

// ── Joueurs ───────────────────────────────────────────────────────────────────
// Antoine Badhack et Baptou sont des easter eggs (poids très faibles).

export const PLAYERS: Player[] = [
  { name: 'Lee Chong Wei',      weight: 1.0  },
  { name: 'Lin Dan',            weight: 1.0  },
  { name: 'Viktor Axelsen',     weight: 1.0  },
  { name: 'Kento Momota',       weight: 1.0  },
  { name: 'Peter Gade',         weight: 1.0  },
  { name: 'Chen Long',          weight: 1.0  },
  { name: 'Christo Popov',      weight: 1.0  },
  { name: 'Alex Lanier',        weight: 1.0  },
  { name: 'Antoine Badhack',    weight: 0.18 }, // easter egg ~1%
  { name: 'An Se Young',        weight: 1.0  },
  { name: 'Chen Yu Fei',        weight: 1.0  },
  { name: 'Tai Tzu Ying',       weight: 1.0  },
  { name: 'Carolina Marin',     weight: 1.0  },
  { name: 'Akane Yamaguchi',    weight: 1.0  },
  { name: 'Lee Zii Jia',        weight: 1.0  },
  { name: 'Kunlavut Vitidsarn', weight: 1.0  },
  { name: 'Loh Kean Yew',       weight: 1.0  },
  { name: 'Baptou',             weight: 0.09 }, // easter egg ~0.5%
];

// ── Messages ──────────────────────────────────────────────────────────────────

export const MESSAGES: ShareMessage[] = [
  // Niveau 1
  { id: 1,  template: "À ce rythme là, tu vas vite dépasser *player_name*.",                                                          type: null,               level: 2, hasPlayer: true  },
  { id: 2,  template: "Le voyage commence. *player_name* aussi a eu un premier smash raté.",                                           type: null,               level: 1, hasPlayer: true  },
  { id: 3,  template: "Une semaine de feu ! En route pour dépasser ton niveau actuel.",                                                type: 'sessions_per_week', level: 2, hasPlayer: false },
  { id: 4,  template: "Lee Chong Wei faisait 2 séances par jour, mais on ne juge pas.",                                               type: 'sessions_per_week', level: 1, hasPlayer: false },
  { id: 5,  template: "En route pour devenir meilleur que *player_name*. (Objectif ambitieux, on va pas se mentir)",                  type: null,               level: 1, hasPlayer: true  },
  { id: 6,  template: "À ce rythme, *player_name* commence à s'inquiéter.",                                                           type: null,               level: 2, hasPlayer: true  },
  { id: 7,  template: "Tu es officiellement un problème pour tes adversaires.",                                                        type: null,               level: 3, hasPlayer: false },
  { id: 8,  template: "Bien joué. La régularité, c'est 80% du travail.",                                                              type: null,               level: 1, hasPlayer: false },
  { id: 9,  template: "Chaque séance compte. Même les moins bonnes.",                                                                 type: 'low_session_rate', level: 1, hasPlayer: false },
  { id: 10, template: "Tu reviens. C'est déjà tout.",                                                                                 type: 'weeks_streak',     level: 1, hasPlayer: false },
  { id: 11, template: "Cette semaine, tu as joué. La semaine prochaine aussi ?",                                                       type: 'sessions_per_week', level: 1, hasPlayer: false },
  { id: 12, template: "*player_name* a commencé quelque part, toi aussi.",                                                            type: null,               level: 1, hasPlayer: true  },
  { id: 13, template: "Un smash puissant se construit une séance à la fois.",                                                          type: null,               level: 1, hasPlayer: false },
  { id: 14, template: "Séance enregistrée. Le gymnase s'en souvient.",                                                                 type: null,               level: 1, hasPlayer: false },
  { id: 15, template: "Pas de grands joueurs sans petites séances.",                                                                   type: 'low_session_rate', level: 1, hasPlayer: false },

  // Niveau 2
  { id: 16, template: "*player_name* devrait commencer à prendre des notes.",                                                          type: null,               level: 2, hasPlayer: true  },
  { id: 17, template: "Ta régularité ferait rougir bien des coachs.",                                                                  type: 'weeks_streak',     level: 2, hasPlayer: false },
  { id: 18, template: "Cette semaine, tu n'as laissé aucune chance au canapé.",                                                        type: 'sessions_per_week', level: 2, hasPlayer: false },
  { id: 19, template: "Tu accumules les séances comme d'autres accumulent les excuses.",                                               type: null,               level: 2, hasPlayer: false },
  { id: 20, template: "Le terrain te connaît par ton prénom maintenant.",                                                              type: 'weeks_streak',     level: 2, hasPlayer: false },
  { id: 21, template: "*player_name* a mis des années à trouver son rythme. Toi, tu l'as.",                                           type: null,               level: 2, hasPlayer: true  },
  { id: 22, template: "Quelque part, un adversaire va le regretter.",                                                                  type: null,               level: 2, hasPlayer: false },
  { id: 23, template: "Ta constance est ton arme secrète.",                                                                            type: 'weeks_streak',     level: 2, hasPlayer: false },
  { id: 24, template: "Autant de séances cette semaine ? Même le volant n'en revient pas.",                                            type: 'sessions_per_week', level: 2, hasPlayer: false },
  { id: 25, template: "Tu es en train de devenir quelqu'un qu'on ne veut pas affronter.",                                             type: null,               level: 2, hasPlayer: false },

  // Niveau 3
  { id: 26, template: "*player_name* a des doutes. Toi, tu as des séances à ton actif.",                                              type: null,               level: 3, hasPlayer: true  },
  { id: 27, template: "À ce niveau de régularité, le badminton devient une seconde nature.",                                           type: null,               level: 3, hasPlayer: false },
  { id: 28, template: "Ton adversaire de demain ne sait pas encore ce qui l'attend.",                                                  type: null,               level: 3, hasPlayer: false },
  { id: 29, template: "Les légendes ne sont pas nées légendes. Elles ont enchaîné les séances comme toi.",                            type: null,               level: 3, hasPlayer: false },
  { id: 30, template: "Cette semaine était de haut niveau. *player_name* confirme.",                                                   type: 'sessions_per_week', level: 3, hasPlayer: true  },
  { id: 31, template: "Tu empiles les semaines comme d'autres empilent des regrets.",                                                  type: 'weeks_streak',     level: 3, hasPlayer: false },
  { id: 32, template: "Tes adversaires ont une chose en commun : ils ne savent pas encore ce que tu leur prépares.",                  type: null,               level: 3, hasPlayer: false },

  // Niveau 4
  { id: 33, template: "*player_name* a appelé. Il veut savoir ton secret.",                                                           type: null,               level: 4, hasPlayer: true  },
  { id: 34, template: "Des séances comme ça, c'est ce qui sépare les joueurs des champions.",                                         type: null,               level: 4, hasPlayer: false },
  { id: 35, template: "Tu as transformé la discipline en habitude. C'est irréversible.",                                               type: 'weeks_streak',     level: 4, hasPlayer: false },
  { id: 36, template: "Cette semaine restera dans tes annales personnelles.",                                                          type: 'sessions_per_week', level: 4, hasPlayer: false },
  { id: 37, template: "Les joueurs tremblent en voyant ton nom dans leur poule.",                                                      type: null,               level: 4, hasPlayer: false },
  { id: 38, template: "À ce stade, c'est de la dévotion. *player_name* comprend.",                                                    type: null,               level: 4, hasPlayer: true  },
  { id: 39, template: "Ton palmarès de séances dépasse celui de beaucoup de joueurs de club.",                                        type: 'milestones',       level: 4, hasPlayer: false },
  { id: 40, template: "La régularité à ce niveau, c'est un talent à part entière.",                                                   type: 'weeks_streak',     level: 4, hasPlayer: false },

  // Niveau 5
  { id: 41, template: "*player_name* a raccroché sa raquette en voyant tes stats.",                                                   type: null,               level: 5, hasPlayer: true  },
  { id: 42, template: "Ce n'est plus de l'entraînement. C'est une philosophie de vie.",                                               type: null,               level: 5, hasPlayer: false },
  { id: 43, template: "Quelqu'un devrait écrire un article sur toi.",                                                                  type: 'milestones',       level: 5, hasPlayer: false },
  { id: 44, template: "Tu as joué plus de séances que la plupart des gens n'ont de bonnes résolutions.",                              type: 'milestones',       level: 5, hasPlayer: false },
  { id: 45, template: "À ce niveau, tu n'es plus un joueur de badminton. Tu es une institution.",                                     type: null,               level: 5, hasPlayer: false },
  { id: 46, template: "*player_name* t'a mis en favori sur son téléphone pour te surveiller.",                                        type: null,               level: 5, hasPlayer: true  },
  { id: 47, template: "Là il faudrait songer à trouver un travail.",                                                                  type: 'sessions_per_week', level: 5, hasPlayer: false },
  { id: 48, template: "Aucune excuse, aucune pause, aucun compromis. Respect.",                                                       type: 'weeks_streak',     level: 5, hasPlayer: false },

  // ── Nouvelles phrases — Niveau 1 ──────────────────────────────────────────────
  { id: 49, template: "Ton revers s'améliore une séance à la fois. C'est comme ça que ça marche.",                                    type: null,               level: 1, hasPlayer: false },
  { id: 50, template: "Un service propre, ça se travaille. Comme tu le fais.",                                                        type: null,               level: 1, hasPlayer: false },
  { id: 51, template: "Le volant ne ment pas sur la régularité. Et toi tu joues.",                                                    type: null,               level: 1, hasPlayer: false },
  { id: 52, template: "Pas de résultat sans séances. Tu coches la première case.",                                                    type: null,               level: 1, hasPlayer: false },
  { id: 53, template: "Tu es revenu sur le terrain. C'est ce qui sépare l'intention de la pratique.",                                 type: 'low_session_rate', level: 1, hasPlayer: false },
  { id: 54, template: "Une séance de moins que tu n'en voulais ? La prochaine compte.",                                               type: 'low_session_rate', level: 1, hasPlayer: false },
  { id: 55, template: "*player_name* aussi a eu des semaines difficiles. La constance l'a emporté.",                                  type: null,               level: 1, hasPlayer: true  },
  { id: 56, template: "Le smash qu'on prépare, c'est à l'entraînement. Comme aujourd'hui.",                                          type: null,               level: 1, hasPlayer: false },
  { id: 57, template: "Le volant finit toujours par récompenser ceux qui reviennent.",                                                type: 'low_session_rate', level: 1, hasPlayer: false },
  { id: 58, template: "Le service que tu rates aujourd'hui, tu le rentres demain.",                                                   type: null,               level: 1, hasPlayer: false },

  // ── Nouvelles phrases — Niveau 2 ──────────────────────────────────────────────
  { id: 59, template: "Ton coup droit commence à avoir de la conviction.",                                                            type: null,               level: 2, hasPlayer: false },
  { id: 60, template: "*player_name* n'a pas bâti son jeu différemment. Séance après séance.",                                       type: null,               level: 2, hasPlayer: true  },
  { id: 61, template: "Ce rythme sur la semaine ? Le filet s'en souvient.",                                                          type: 'sessions_per_week', level: 2, hasPlayer: false },
  { id: 62, template: "Chaque amorti bien placé vient de séances comme celle-là.",                                                   type: null,               level: 2, hasPlayer: false },
  { id: 63, template: "Deux mois de suite. L'effort finit par laisser des traces dans ton jeu.",                                     type: 'weeks_streak',     level: 2, hasPlayer: false },
  { id: 64, template: "Ta régularité devient difficile à imiter pour tes adversaires.",                                               type: 'weeks_streak',     level: 2, hasPlayer: false },
  { id: 65, template: "À ce rythme hebdomadaire, ton endurance n'est plus un problème.",                                             type: 'sessions_per_week', level: 2, hasPlayer: false },
  { id: 66, template: "*player_name* confirme : la constance bat le talent une fois sur deux.",                                      type: null,               level: 2, hasPlayer: true  },
  { id: 67, template: "Le coup droit ne s'improvise pas. Les séances que tu fais prouvent que tu le sais.",                          type: null,               level: 2, hasPlayer: false },
  { id: 68, template: "Ton amorti finit par devenir un réflexe. C'est ça, l'entraînement.",                                         type: null,               level: 2, hasPlayer: false },

  // ── Nouvelles phrases — Niveau 3 ──────────────────────────────────────────────
  { id: 69, template: "Ton dégagement a changé de statut. C'est une arme maintenant.",                                               type: null,               level: 3, hasPlayer: false },
  { id: 70, template: "Cette semaine-là, même le volant était surpris.",                                                             type: 'sessions_per_week', level: 3, hasPlayer: false },
  { id: 71, template: "*player_name* a remarqué ta progression. Ce n'est pas anodin.",                                               type: null,               level: 3, hasPlayer: true  },
  { id: 72, template: "Le contre que tu travailles finit toujours par payer.",                                                       type: null,               level: 3, hasPlayer: false },
  { id: 73, template: "Ce milestone, c'est la preuve que l'effort était là depuis le début.",                                        type: 'milestones',       level: 3, hasPlayer: false },
  { id: 74, template: "Ton engagement au filet raconte quelque chose sur ta progression.",                                           type: null,               level: 3, hasPlayer: false },
  { id: 75, template: "Plusieurs mois sans interruption. Les adversaires commencent à le sentir.",                                   type: 'weeks_streak',     level: 3, hasPlayer: false },
  { id: 76, template: "À ce stade, chaque séance renforce ce que tu as déjà construit.",                                            type: null,               level: 3, hasPlayer: false },
  { id: 77, template: "Cette série de semaines consécutives parle seule.",                                                           type: 'weeks_streak',     level: 3, hasPlayer: false },
  { id: 78, template: "Le badminton ne pardonne pas l'irrégularité. Toi, tu es régulier.",                                          type: null,               level: 3, hasPlayer: false },
  { id: 79, template: "*player_name* s'entraîne avec la même discipline. Maintenant toi aussi.",                                    type: null,               level: 3, hasPlayer: true  },

  // ── Nouvelles phrases — Niveau 4 ──────────────────────────────────────────────
  { id: 80, template: "Ton revers de maintenant n'a plus grand-chose à voir avec celui du début.",                                   type: null,               level: 4, hasPlayer: false },
  { id: 81, template: "*player_name* passerait volontiers ton engagement en interview.",                                             type: null,               level: 4, hasPlayer: true  },
  { id: 82, template: "Cette semaine de feu restera dans tes références personnelles.",                                              type: 'sessions_per_week', level: 4, hasPlayer: false },
  { id: 83, template: "Ton smash à ce stade n'est plus un coup. C'est une signature.",                                              type: null,               level: 4, hasPlayer: false },
  { id: 84, template: "La constance sur cette durée, peu de joueurs y arrivent. Toi si.",                                           type: 'weeks_streak',     level: 4, hasPlayer: false },
  { id: 85, template: "Tu as passé un seuil. L'amorti croisé vient naturellement maintenant.",                                      type: 'milestones',       level: 4, hasPlayer: false },
  { id: 86, template: "Ton niveau de pratique force le respect, que tu le sentes ou non.",                                          type: null,               level: 4, hasPlayer: false },
  { id: 87, template: "*player_name* a eu ce genre de régularité. Et tu sais où ça l'a mené.",                                     type: null,               level: 4, hasPlayer: true  },
  { id: 88, template: "Ce que tu construis là, c'est difficile à défaire.",                                                         type: null,               level: 4, hasPlayer: false },

  // ── Nouvelles phrases — Niveau 5 ──────────────────────────────────────────────
  { id: 89, template: "Ton service en ce moment, c'est différent. Les mois de pratique, ça fait ça.",                               type: null,               level: 5, hasPlayer: false },
  { id: 90, template: "*player_name* te mettrait dans sa liste d'adversaires à surveiller.",                                        type: null,               level: 5, hasPlayer: true  },
  { id: 91, template: "Ce volume de séances en si peu de temps — c'est exceptionnel.",                                              type: 'milestones',       level: 5, hasPlayer: false },
  { id: 92, template: "Tu as trouvé ton rythme. Et ton rythme est redoutable.",                                                     type: 'weeks_streak',     level: 5, hasPlayer: false },
  { id: 93, template: "L'intensité de tes semaines parle d'elle-même. Plus besoin de commentaire.",                                 type: 'sessions_per_week', level: 5, hasPlayer: false },
  { id: 94, template: "À ce stade, le dégagement, le smash, le contre — tout ça s'est fondu dans ton jeu.",                        type: null,               level: 5, hasPlayer: false },
  { id: 95, template: "*player_name* en aurait fait un documentaire.",                                                              type: null,               level: 5, hasPlayer: true  },
  { id: 96, template: "Tes adversaires ne savent pas encore ce qui les attend. Toi si.",                                            type: null,               level: 5, hasPlayer: false },
];

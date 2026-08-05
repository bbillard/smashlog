import { StyleSheet, Text } from "react-native";

import { HelpAccordionSection, HelpSection } from "@/src/components/HelpAccordion";
import { Screen } from "@/src/components/Screen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

const HELP_SECTIONS: HelpSection[] = [
  {
    icon: "information-circle-outline",
    title: "Comprendre Smashlog",
    items: [
      {
        question: "C'est quoi Smashlog ?",
        answer:
          "Smashlog est un journal de séances de badminton. Il te permet d'enregistrer tes séances, de noter ce qui a bien marché et ce qui a moins bien fonctionné, et surtout de te fixer une intention pour ta prochaine séance. L'app te rappelle cet objectif juste avant que tu joues.",
      },
      {
        question: "C'est quoi une \"intention\" ?",
        answer:
          "L'intention c'est l'objectif que tu te fixes après une séance pour la suivante. Par exemple : \"travailler mon smash croisé\" ou \"être plus agressif au filet\". Smashlog te renvoie cette intention sous forme de notification avant ta prochaine séance, pour que tu arrives sur le terrain avec un vrai focus.",
      },
      {
        question: "Pourquoi c'est utile ?",
        answer:
          "La plupart des joueurs s'entraînent régulièrement mais stagnent, parce qu'ils jouent sans fil conducteur. Smashlog te force à prendre du recul après chaque séance et à te donner un cap pour la suivante. L'idée : chaque entraînement doit te rendre au moins 1% meilleur.",
      },
    ],
  },
  {
    icon: "create-outline",
    title: "Enregistrer une séance",
    items: [
      {
        question: "Comment enregistrer une séance ?",
        answer:
          "Depuis l'accueil, appuie sur le bouton d'ajout. Choisis le type de séance (match, entraînement, jeu libre, renforcement, cardio…), réponds aux quelques questions, et ajoute des notes libres si tu veux. La séance est enregistrée en quelques secondes.",
      },
      {
        question: "Quels types de séances puis-je enregistrer ?",
        answer:
          "Match, entraînement, jeu libre, renforcement musculaire, cardio, ou autre. Smashlog couvre à la fois tes séances de badminton et tes séances physiques complémentaires.",
      },
      {
        question: "Puis-je modifier une séance après l'avoir enregistrée ?",
        answer:
          "Oui. Ouvre la séance depuis la liste, puis utilise l'option de modification pour corriger ou compléter les informations.",
      },
      {
        question: "Comment ajouter un match à une séance ?",
        answer:
          "Lors de la création d'une séance de type \"match\" ou \"jeu libre\", tu peux ajouter un ou plusieurs matchs avec le résultat, le mode (simple, double, mixte) et les scores si tu les as. Tu peux aussi y ajouter des adversaires et des partenaires.",
      },
    ],
  },
  {
    icon: "notifications-outline",
    title: "Notifications et planning",
    items: [
      {
        question: "Comment fonctionnent les rappels ?",
        answer:
          "Smashlog t'envoie une notification avant ta prochaine séance pour te rappeler l'intention que tu avais notée lors de la précédente. Pour que ça fonctionne, tu dois avoir activé les notifications et configuré ta semaine type dans l'onglet Planning.",
      },
      {
        question: "Comment configurer ma semaine type ?",
        answer:
          "Va dans l'onglet Planning depuis le menu principal. Tu peux y ajouter tes créneaux habituels (jour, heure, type de séance). Smashlog utilisera ces créneaux pour savoir quand te rappeler ton intention.",
      },
      {
        question: "Je ne reçois pas de notifications, que faire ?",
        answer:
          "Vérifie d'abord que les notifications Smashlog sont activées dans les réglages de ton téléphone. Ensuite, assure-toi d'avoir au moins une séance enregistrée avec une intention, et au moins un créneau configuré dans le Planning.",
      },
    ],
  },
  {
    icon: "people-outline",
    title: "Mes joueurs",
    items: [
      {
        question: "À quoi sert la section \"Mes joueurs\" ?",
        answer:
          "Elle te permet de retrouver l'historique de tes matchs contre tes adversaires habituels ou avec tes partenaires, avec ton win rate pour chaque joueur. C'est utile pour préparer un match ou analyser tes performances.",
      },
      {
        question: "Comment ajouter un joueur ?",
        answer:
          "Tu peux ajouter un adversaire ou un partenaire directement lors de la saisie d'un match, ou depuis l'onglet Mes joueurs.",
      },
    ],
  },
  {
    icon: "barbell-outline",
    title: "Mes exercices",
    items: [
      {
        question: "C'est quoi la bibliothèque d'exercices ?",
        answer:
          "C'est ta bibliothèque personnelle d'exercices physiques. Tu peux y enregistrer tes exercices habituels (gainage, renforcement, étirements…) et les ajouter rapidement lors de la saisie d'une séance d'entraînement.",
      },
    ],
  },
  {
    icon: "share-social-outline",
    title: "Cartes de partage",
    items: [
      {
        question: "C'est quoi les cartes de partage ?",
        answer:
          "Après certaines séances ou à des moments clés (milestone de séances, bon win rate…), Smashlog génère une carte visuelle que tu peux partager sur Instagram ou dans tes stories. Elle résume ta séance ou ta progression de façon sobre et stylée.",
      },
    ],
  },
  {
    icon: "server-outline",
    title: "Données et compte",
    items: [
      {
        question: "Mes données sont-elles sauvegardées ?",
        answer:
          "Par défaut, toutes tes données sont stockées localement sur ton téléphone. Tu peux créer un compte Smashlog pour les sauvegarder dans le cloud et y accéder depuis plusieurs appareils.",
      },
      {
        question: "Comment exporter mes données ?",
        answer:
          "Dans les réglages, tu trouveras une option pour exporter toutes tes données (séances, joueurs, exercices, planning) au format JSON. Tu peux utiliser ce fichier comme sauvegarde ou pour l'importer sur un autre appareil.",
      },
      {
        question: "Comment supprimer mon compte ?",
        answer:
          "Dans les réglages, section \"Compte\", tu trouveras l'option \"Supprimer mon compte\". Cette action est irréversible et supprime définitivement toutes tes données.",
      },
    ],
  },
  {
    icon: "help-circle-outline",
    title: "Autre chose ?",
    items: [
      {
        question: "Je n'ai pas trouvé ma réponse.",
        answer:
          "Contacte-nous à smashlog.app@gmail.com ou sur Instagram @smashlog.app, on te répondra rapidement.",
      },
    ],
  },
];

export default function HelpScreen() {
  const { theme } = useAppTheme();

  return (
    <Screen nativeHeader scrollable>
      <Text style={[styles.title, { color: theme.text }]}>Aide</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
        Les réponses aux questions les plus fréquentes sur Smashlog.
      </Text>
      {HELP_SECTIONS.map((section) => (
        <HelpAccordionSection key={section.title} section={section} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: fonts.displayExtraBold,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    marginTop: -8,
  },
});

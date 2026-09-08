// withCleanAndroidPermissions.js
//
// Contexte : Google Play a refusé la publication de Smashlog pour usage non
// conforme des permissions photos/vidéos. L'accès aux photos dans l'app est
// uniquement ponctuel (photo de profil, sauvegarde des cartes de partage) :
// la galerie n'est jamais parcourue. Le sélecteur système Android (Photo
// Picker, via expo-image-picker) et MediaLibrary.saveToLibraryAsync()
// suffisent, et ne nécessitent ni READ_EXTERNAL_STORAGE ni
// WRITE_EXTERNAL_STORAGE sur les versions d'Android actuellement ciblées
// (stockage scoped, API 29+).
//
// Problème : ces deux permissions sont déclarées à plusieurs niveaux
// indépendants du champ "android.permissions" de app.json :
//  - le template Android de base d'Expo les inclut par défaut ;
//  - expo-media-library, expo-image-picker et expo-file-system embarquent
//    chacun leur propre AndroidManifest.xml qui les redéclare, et ce
//    manifeste de librairie est fusionné par l'outil de fusion de manifeste
//    de Gradle au moment du build (pas au moment de "expo prebuild").
// Les retirer du tableau android.permissions ou du XML généré ne suffit donc
// pas : une librairie tierce peut les réintroduire pendant la fusion Gradle.
// On utilise donc le mécanisme officiel d'Expo prévu pour ce cas
// (AndroidConfig.Permissions.withBlockedPermissions), qui ajoute la
// directive Gradle `tools:node="remove"` — le même mécanisme que celui déjà
// utilisé par le plugin expo-image-picker pour bloquer CAMERA/RECORD_AUDIO
// (cameraPermission: false / microphonePermission: false dans app.json).
//
// IMPORTANT : ce plugin doit être déclaré APRÈS "expo-media-library" dans la
// liste "plugins" de app.json.
const { AndroidConfig } = require("@expo/config-plugins");

const DISALLOWED_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

module.exports = function withCleanAndroidPermissions(config) {
  return AndroidConfig.Permissions.withBlockedPermissions(config, DISALLOWED_PERMISSIONS);
};

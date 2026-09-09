// withCleanAndroidPermissions.js
//
// Contexte : Google Play a refusé la publication de Smashlog pour usage non
// conforme des permissions photos/vidéos. L'accès aux photos dans l'app est
// uniquement ponctuel (photo de profil, sauvegarde des cartes de partage) :
// la galerie n'est jamais parcourue. Le sélecteur système Android (Photo
// Picker, via expo-image-picker) et MediaLibrary.saveToLibraryAsync()
// suffisent, et ne nécessitent ni les permissions de stockage héritées, ni
// les permissions granulaires READ_MEDIA_IMAGES/READ_MEDIA_VIDEO sur les
// versions d'Android actuellement ciblées.
//
// Problème : plusieurs de ces permissions peuvent être déclarées à des
// niveaux indépendants du champ "android.permissions" de app.json (template
// Android de base d'Expo, AndroidManifest.xml embarqué dans certaines
// librairies natives, options de plugin comme granularPermissions de
// expo-media-library). Les retirer du tableau android.permissions ou du XML
// généré ne suffit donc pas de façon fiable : une librairie ou une future
// mise à jour de plugin peut les réintroduire pendant la fusion de manifeste
// de Gradle. On utilise donc le mécanisme officiel d'Expo prévu pour ce cas
// (AndroidConfig.Permissions.withBlockedPermissions), qui ajoute la
// directive Gradle `tools:node="remove"` sur chacune — le même mécanisme
// déjà utilisé par le plugin expo-image-picker pour bloquer CAMERA/
// RECORD_AUDIO (cameraPermission: false / microphonePermission: false).
// Cette directive force leur exclusion du manifest final quelle que soit la
// librairie qui tenterait de les redéclarer.
//
// READ_MEDIA_VISUAL_USER_SELECTED n'est PAS dans cette liste : c'est la
// permission granulaire autorisée par Google (accès uniquement aux photos
// choisies via le sélecteur système) et elle doit rester.
//
// IMPORTANT : ce plugin doit être déclaré APRÈS "expo-media-library" dans la
// liste "plugins" de app.json.
const { AndroidConfig } = require("@expo/config-plugins");

const DISALLOWED_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
];

module.exports = function withCleanAndroidPermissions(config) {
  return AndroidConfig.Permissions.withBlockedPermissions(config, DISALLOWED_PERMISSIONS);
};

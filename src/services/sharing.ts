import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

function ensureFileUri(uri: string) {
  return uri.startsWith("file://") ? uri : `file://${uri}`;
}

export async function shareImageAsync(uri: string) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("sharing_unavailable");
  }

  await Sharing.shareAsync(ensureFileUri(uri), {
    dialogTitle: "Partager ta carte Smashlog",
    mimeType: "image/png",
    UTI: "public.png",
  });
}

export async function downloadImageAsync(uri: string) {
  const assetUri = ensureFileUri(uri);

  if (typeof document !== "undefined") {
    const link = document.createElement("a");
    link.href = assetUri;
    link.download = `smashlog-card-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("media_library_permission_denied");
  }

  try {
    await MediaLibrary.saveToLibraryAsync(assetUri);
  } catch {
    await MediaLibrary.createAssetAsync(assetUri);
  }
}

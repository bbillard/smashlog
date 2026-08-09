// Edge Function "delete-account" — supprime définitivement le compte de
// l'utilisateur qui appelle cette fonction : toutes ses données applicatives
// (sessions, matches, players, exercises, planning_slots, profile) puis son
// compte auth.users.
//
// Pourquoi une Edge Function : supprimer un utilisateur Auth nécessite
// auth.admin.deleteUser(), qui exige la clé service_role. Cette clé ne doit
// JAMAIS être embarquée dans l'app mobile (elle bypass RLS entièrement) —
// elle ne peut donc vivre que côté serveur, ici dans cette fonction.
//
// Sécurité : l'id de l'utilisateur à supprimer n'est JAMAIS lu depuis le
// corps de la requête. On le déduit du JWT envoyé dans le header
// Authorization (vérifié via un client "anon"), donc un appelant ne peut
// supprimer que son propre compte, jamais celui de quelqu'un d'autre.
//
// Déploiement : Dashboard Supabase → Edge Functions → Deploy a new function
// → Via Editor → coller ce fichier → nom de la fonction "delete-account".
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement
// par la plateforme, aucune configuration manuelle de secret nécessaire.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Non authentifié." }, 401);
  }

  // Client "anon" porteur du JWT de l'appelant : sert uniquement à vérifier
  // ce JWT et en extraire le vrai user id, jamais à lire/écrire des données.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Session invalide ou expirée." }, 401);
  }

  const userId = user.id;

  // Client admin (service_role) : seul lui peut supprimer un utilisateur
  // Auth et bypasser RLS pour nettoyer toutes les tables applicatives.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. matches référence sessions et players (matches_session_id_fkey,
    // matches_*_id_fkey) : doit être supprimée en premier.
    const { error: matchesError } = await adminClient.from("matches").delete().eq("user_id", userId);
    if (matchesError) throw matchesError;

    // 2. Tables qui ne dépendent plus de rien d'autre que profiles :
    // peuvent être supprimées en parallèle.
    const results = await Promise.all([
      adminClient.from("sessions").delete().eq("user_id", userId),
      adminClient.from("players").delete().eq("user_id", userId),
      adminClient.from("exercises").delete().eq("user_id", userId),
      adminClient.from("planning_slots").delete().eq("user_id", userId),
    ]);
    for (const result of results) {
      if (result.error) throw result.error;
    }

    // 3. profiles référence auth.users (profiles_id_fkey) : après tout le
    // reste, avant l'utilisateur Auth lui-même.
    const { error: profileError } = await adminClient.from("profiles").delete().eq("id", userId);
    if (profileError) throw profileError;

    // 4. Le compte Auth en dernier — invalide définitivement la session et
    // les refresh tokens de l'utilisateur.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("[delete-account] Échec de la suppression :", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant la suppression.";
    return jsonResponse({ error: message }, 500);
  }
});

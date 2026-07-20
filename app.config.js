// Étend app.json de façon dynamique pour injecter les variables
// d'environnement Supabase dans expoConfig.extra (accessible via
// Constants.expoConfig.extra côté app).
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  };
};

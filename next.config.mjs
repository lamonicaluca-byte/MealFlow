/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ["src"],
  },
  experimental: {
    typedRoutes: false,
  },
  // L'integrazione Vercel↔Supabase crea le variabili con un prefisso custom
  // (qui "MEALFLOW_") anziché con i nomi standard. Le variabili NEXT_PUBLIC_*
  // devono però chiamarsi esattamente così per essere iniettate nel bundle
  // client da Next.js: questo blocco fa da ponte, senza duplicare i valori
  // manualmente su Vercel (fonte di verità unica).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.MEALFLOW_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.MEALFLOW_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;

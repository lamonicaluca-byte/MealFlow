import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const ACCOUNTS = {
  luca: { email: "QUICK_LOGIN_EMAIL_LUCA", password: "QUICK_LOGIN_PASSWORD_LUCA" },
  anita: { email: "QUICK_LOGIN_EMAIL_ANITA", password: "QUICK_LOGIN_PASSWORD_ANITA" },
  chalika: { email: "QUICK_LOGIN_EMAIL_CHALIKA", password: "QUICK_LOGIN_PASSWORD_CHALIKA" },
} as const;

type AccountKey = keyof typeof ACCOUNTS;

function isAccountKey(value: unknown): value is AccountKey {
  return typeof value === "string" && value in ACCOUNTS;
}

/**
 * Esegue il login Supabase per conto dell'utente, per mantenere l'esperienza
 * "accesso rapido" (un clic, nessuna password digitata) pur avendo una vera
 * sessione autenticata dietro — necessaria perché le Row Level Security
 * verifichino `auth.uid()`. Le password reali restano solo in variabili
 * d'ambiente server-only, mai esposte al client.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato: usa la modalità demo." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { accountKey?: unknown } | null;
  if (!body || !isAccountKey(body.accountKey)) {
    return NextResponse.json({ error: "Account non valido." }, { status: 400 });
  }

  const { email: emailVar, password: passwordVar } = ACCOUNTS[body.accountKey];
  const email = process.env[emailVar];
  const password = process.env[passwordVar];
  if (!email || !password) {
    return NextResponse.json(
      { error: "Credenziali dell'account non configurate lato server." },
      { status: 500 },
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Client Supabase non disponibile." }, { status: 500 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Accesso non riuscito." }, { status: 401 });
  }

  return NextResponse.json({ userId: data.user.id });
}

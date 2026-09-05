"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAppStore } from "@/store/app-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { loginSchema, type LoginValues } from "@/lib/validation/auth-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/** Account fissi disponibili per l'accesso rapido in produzione (§ scelta prodotto: niente password per l'utente finale). */
const PRODUCTION_ACCOUNTS = [
  { key: "luca", label: "Luca" },
  { key: "anita", label: "Anita" },
  { key: "chalika", label: "Chalika" },
] as const;

export default function LoginPage() {
  const users = useAppStore((s) => s.users);
  const loginAs = useAppStore((s) => s.loginAs);
  const status = useAppStore((s) => s.status);
  const router = useRouter();
  const { toast } = useToast();
  const [pendingAccount, setPendingAccount] = React.useState<string | null>(null);
  const usingSupabase = isSupabaseConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const match = users.find((u) => u.email.toLowerCase() === values.email.toLowerCase());
    if (!match) {
      toast({
        variant: "destructive",
        title: "Accesso non riuscito",
        description: "In modalità demo, usa uno degli account rapidi qui sotto oppure una delle email demo.",
      });
      return;
    }
    loginAs(match.id);
    router.push("/home");
  });

  const quickLoginProduction = async (accountKey: string) => {
    setPendingAccount(accountKey);
    try {
      const res = await fetch("/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountKey }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Accesso non riuscito", description: body.error ?? "Riprova." });
        setPendingAccount(null);
        return;
      }
      // Hard navigation: il client Supabase del browser deve rileggere i
      // cookie di sessione appena impostati dalla risposta del server.
      window.location.href = "/home";
    } catch {
      toast({ variant: "destructive", title: "Accesso non riuscito", description: "Errore di rete, riprova." });
      setPendingAccount(null);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="font-display text-4xl font-semibold tracking-tight">MealFlow</span>
          <p className="text-eyebrow mt-2">Meno decisioni, più tempo insieme.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accedi</CardTitle>
            <CardDescription>Entra nello spazio condiviso della tua famiglia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usingSupabase ? (
              <div className="grid gap-2">
                {PRODUCTION_ACCOUNTS.map((account) => (
                  <Button
                    key={account.key}
                    variant="outline"
                    disabled={pendingAccount !== null}
                    onClick={() => quickLoginProduction(account.key)}
                  >
                    {pendingAccount === account.key ? "Accesso in corso…" : `Accedi come ${account.label}`}
                  </Button>
                ))}
              </div>
            ) : (
              <>
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="tuo@indirizzo.it" {...register("email")} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Link href="/recupero-password" className="text-crimson hover:underline">
                      Password dimenticata?
                    </Link>
                    <Link href="/invito/demo-token" className="text-muted-foreground hover:underline">
                      Hai un invito?
                    </Link>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || status !== "ready"}>
                    Accedi
                  </Button>
                </form>

                <div className="relative py-1 text-center text-xs text-muted-foreground">
                  <span className="relative bg-card px-2">oppure entra rapidamente (demo)</span>
                  <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
                </div>

                <div className="grid gap-2">
                  {users.map((u) => (
                    <Button
                      key={u.id}
                      variant="outline"
                      disabled={status !== "ready"}
                      onClick={() => {
                        loginAs(u.id);
                        router.push("/home");
                      }}
                    >
                      Accedi come {u.displayName}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {usingSupabase
            ? "Accesso rapido: un clic, nessuna password da ricordare."
            : "Dati dimostrativi, sostituibili durante l'onboarding. Nessuna credenziale reale è richiesta."}
        </p>
      </div>
    </div>
  );
}

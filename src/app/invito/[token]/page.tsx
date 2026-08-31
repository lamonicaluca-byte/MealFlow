"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAppStore } from "@/store/app-store";
import { DEMO_USER_IDS } from "@/lib/data/demo-ids";
import { acceptInvitationSchema, type AcceptInvitationValues } from "@/lib/validation/auth-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Accettazione invito (§16.4). In modalità demo il token non viene verificato
 * contro un backend reale: la schermata mostra sempre l'invito dimostrativo
 * di Chalika come Collaboratrice, per illustrare il flusso end-to-end.
 */
export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const loginAs = useAppStore((s) => s.loginAs);
  const household = useAppStore((s) => s.household);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationValues>({ resolver: zodResolver(acceptInvitationSchema) });

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 300));
    loginAs(DEMO_USER_IDS.chalika);
    router.push("/home");
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">
              Invito {params.token}
            </Badge>
            <CardTitle>Sei stato invitato</CardTitle>
            <CardDescription>
              Luca ti ha invitato a unirti a "{household?.name ?? "Famiglia"}" come <strong>Collaboratrice</strong>: potrai
              consultare menu e ricette, leggere le note operative e aggiornare la lista della spesa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Nome e cognome</Label>
                <Input id="displayName" placeholder="Chalika" {...register("displayName")} />
                {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Crea una password</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Accetta e crea account
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Accettando, non avrai accesso ad allergie, dati sanitari, ruoli o impostazioni di sicurezza della famiglia.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

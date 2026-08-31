import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Inserisci l'indirizzo email.").email("Indirizzo email non valido."),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Inserisci l'indirizzo email.").email("Indirizzo email non valido."),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const acceptInvitationSchema = z
  .object({
    displayName: z.string().min(2, "Inserisci nome e cognome."),
    password: z.string().min(6, "La password deve avere almeno 6 caratteri."),
    confirmPassword: z.string().min(6, "Conferma la password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono.",
    path: ["confirmPassword"],
  });
export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>;

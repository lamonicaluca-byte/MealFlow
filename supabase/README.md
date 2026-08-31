# Database MealFlow — Supabase

Questa cartella contiene lo schema completo pensato per l'esecuzione reale
dell'app (§19-§20 del brief). **L'app funziona anche senza applicare queste
migrazioni**: senza `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
valorizzate, MealFlow resta in modalità demo (dati in memoria/localStorage).

## Struttura

- `migrations/0001_schema.sql` — tabelle, enum, indici, trigger `updated_at`.
- `migrations/0002_rls.sql` — Row Level Security: funzioni helper +
  policy per ogni tabella, coerenti con `src/lib/auth/permissions.ts`.

## Applicare le migrazioni

Con la [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <il-tuo-project-ref>
supabase db push
```

In alternativa, incolla il contenuto dei due file, in ordine, nell'SQL Editor
della dashboard Supabase.

## Note di progettazione

- **`recipes`/`recipe_ingredients`** sono un catalogo condiviso (non
  household-scoped): rappresentano la libreria di ricette mediterranee usata
  dal `MenuGenerationService`. La scrittura è riservata al ruolo di servizio
  (seed applicativo), non esposta agli utenti finali in questa versione.
- **`meals.recipe_snapshot`** conserva una fotografia JSON della ricetta al
  momento dell'assegnazione: se la ricetta "master" cambia in futuro, lo
  storico dei pasti serviti/approvati non viene alterato retroattivamente.
- **Dati sensibili** (`dietary_profiles` e tabelle figlie: allergie,
  intolleranze, esclusioni) sono leggibili e scrivibili **solo** da
  owner/admin: nessuna policy consente a un Collaborator di leggerli o
  modificarli, in linea con §3 e §20.
- Il vincolo `no_automatic_weekday_lunch` su `meals` impedisce, a livello di
  database, che un pranzo feriale venga marcato come generato
  automaticamente — è comunque permesso aggiungerlo manualmente (§5).
- Le funzioni helper (`is_household_member`, `can_edit_menu`, …) sono
  `security definer` per evitare ricorsioni nella valutazione delle policy
  RLS che altrimenti dovrebbero rileggere `household_user_roles` (a sua volta
  protetta da RLS).

## Seed dei dati demo

I dati demo (famiglia Lamonica, ricette, menu, ecc.) sono definiti in
`src/lib/data/*` e generati interamente in TypeScript/JavaScript lato
applicazione: non esiste un `seed.sql` equivalente, per evitare di mantenere
due fonti di verità sugli stessi dati. Collegando un progetto Supabase reale,
il primo accesso dovrebbe rieseguire l'onboarding con i dati reali della
famiglia (i dati demo restano solo un riferimento per lo sviluppo/i test).

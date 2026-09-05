# MealFlow

**Meno decisioni, più tempo insieme.**

MealFlow è un'applicazione web mobile-first per la gestione familiare condivisa
del menu settimanale e della lista della spesa. Genera un menu
di ispirazione mediterranea, lo fa approvare da uno dei due adulti responsabili,
produce automaticamente la lista della spesa e la mantiene sincronizzata in
tempo reale tra i membri della famiglia — riducendo il carico mentale legato
all'organizzazione dei pasti.

L'app **funziona interamente in modalità demo**, senza Supabase né alcuna
chiave di un provider AI: dati, autenticazione e realtime sono simulati
localmente, con un'architettura pronta per essere collegata a servizi reali.

---

## Avvio rapido

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000): verrai reindirizzato al
login demo, da cui puoi entrare con un clic come uno dei tre account
dimostrativi (nessuna password richiesta in modalità demo):

| Account            | Ruolo         | Ruolo operativo | Note |
|--------------------|---------------|------------------|------|
| Luca               | Owner         | Approver         | Accesso completo |
| Anita              | Admin         | Approver         | Può approvare/modificare il menu |
| Chalika            | Collaborator  | Viewer sul menu  | Consulta menu/ricette, aggiorna la spesa, non approva né vede dati sanitari |

Amelia (9 anni) non ha un account: è un profilo alimentare considerato nella
generazione dei pasti, gestito da Luca e Anita.

## Comandi disponibili

```bash
npm run dev          # sviluppo (Next.js, App Router)
npm run build         # build di produzione
npm run start         # avvia la build di produzione
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (strict)
npm run test            # Vitest (unit + component test)
npm run test:watch      # Vitest in watch mode
npm run test:e2e        # Playwright (esegue build + start automaticamente)
npm run format           # Prettier (con plugin Tailwind)
```

---

## Modalità demo vs. modalità reale

Tutto il progetto è scritto per funzionare **senza** servizi esterni:

- **Dati**: generati e persistiti in `localStorage` del browser
  (`src/lib/data/build-demo-state.ts` costruisce lo stato iniziale; lo store
  Zustand in `src/store/app-store.ts` lo mantiene e lo salva a ogni modifica).
- **Autenticazione**: selezione rapida tra i tre account demo
  (`src/app/login/page.tsx`); nessuna password reale è verificata.
- **Generazione del menu**: `MockMenuProvider`
  (`src/lib/services/menu-generation/mock-provider.ts`), deterministico,
  pesca da una libreria di ~35 ricette mediterranee incluse nel repository.
- **Realtime**: un bus pub/sub in-memory (`src/lib/realtime/demo-bus.ts`) che
  imita l'interfaccia di Supabase Realtime.

Per collegare i servizi reali, valorizza `.env.local` (vedi `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # solo lato server
MEALFLOW_AI_PROVIDER=anthropic     # invece di "mock"
ANTHROPIC_API_KEY=...
```

Applica poi le migrazioni in `supabase/migrations/` (istruzioni in
`supabase/README.md`).

### Generazione del menu con l'AI (Claude)

Quando `MEALFLOW_AI_PROVIDER=anthropic` e `ANTHROPIC_API_KEY` sono valorizzate,
`RealMenuGenerationAdapter` (`src/lib/services/menu-generation/real-adapter.ts`)
sostituisce il `MockMenuProvider`: chiama Claude forzando l'uso di un tool con
`input_schema` generato dallo stesso schema Zod usato per la validazione
(`src/lib/validation/menu-schema.ts`, convertito con `zod-to-json-schema`),
così l'output è sempre JSON strutturato, mai testo libero da interpretare.
Qualunque errore (rete, output non conforme) fa fallback silenzioso al
provider mock, senza mai bloccare l'utente. Le regole di sicurezza
(allergie, intolleranze, esclusioni) restano **sempre** verificate anche
dopo con `validateGeneratedWeek`: non sono mai delegate al solo modello,
nemmeno quando il prompt le richiede esplicitamente.

Le stesse regole della famiglia (allergie, preferenze, impostazioni,
almeno 2 cene di pesce a settimana) sono tradotte in testo nel prompt
(`src/lib/services/menu-generation/prompts.ts`) sia per il provider AI reale
sia — come regole applicate in codice — per il provider mock: i due
provider seguono le stesse regole, cambia solo il "motore" che sceglie le
ricette.

**Apprendimento dal feedback (§15).** Quando lasci un feedback su un pasto
segnato "Da non riproporre", quel piatto viene automaticamente escluso dalle
generazioni successive — sia dal provider mock (regola di codice) sia dal
provider AI reale (elencato esplicitamente nel prompt, con chi l'ha
segnalato e l'eventuale nota). È una regola a livello di piatto per tutta la
famiglia, non per singolo membro: il modello dati odierno non registra "per
chi" vale il dislike, solo il pasto e chi ha lasciato il feedback.

L'adapter reale è collegato solo a `generateWeeklyMenu` (la generazione
settimanale, chiamata da `/api/menu/ensure`), `regenerateMeal`,
`generateMealAlternatives` ed `explainMenuChoice`. `regenerateDay` e
`generateShoppingList` restano sul mock perché non sono collegati a nessuna
azione dell'interfaccia (la lista della spesa è sempre ricalcolata
deterministicamente dagli ingredienti dei pasti, mai generata dall'AI).

Il codice è anche predisposto con client Supabase separati per browser/server
(`src/lib/supabase/`) e con repository per tutte le entità applicative (menu,
spesa, note, inviti…) in `src/lib/data`, entrambi collegati allo store
Zustand (`src/store/app-store.ts`): vedi la sezione successiva per lo stato
esatto del collegamento a Supabase in produzione.

### Stato del collegamento a Supabase (produzione)

Con le variabili d'ambiente valorizzate (vedi `.env.example`), l'app passa
dalla modalità demo a un backend Supabase reale:

- **Login "un clic" con sessione reale**: la pagina di login mostra i 3
  account della famiglia come bottoni; ognuno chiama
  `POST /api/auth/quick-login`, che esegue un vero
  `signInWithPassword` lato server con credenziali note solo al backend
  (`QUICK_LOGIN_EMAIL_*` / `QUICK_LOGIN_PASSWORD_*`).
- **Bootstrap e generazione menu**: `POST /api/menu/ensure` genera (se manca)
  il menu della settimana corrente con la service-role key, sempre in stato
  `pending_approval` (mai auto-approvato).
- **Approvazione menu**: `POST /api/menu/[menuId]/approve` è un'unica
  mutazione atomica lato server (verifica ruolo, aggiorna la versione,
  genera la lista della spesa aggregata) — l'app la attende con `await`
  per evitare che una navigazione la interrompa a metà.
- **Lista della spesa e le altre azioni**: ogni mutazione (spesa, presenze ai
  pasti, note pasto/famiglia, "fuori casa", pasti manuali, sostituzione e
  rigenerazione pasto, feedback pasto, inviti membri, preferenze di
  notifica, profilo alimentare e impostazioni famiglia) aggiorna prima lo
  stato locale in modo ottimistico e poi sincronizza su Supabase in
  background (`syncSupabase` in `src/store/app-store.ts`). Quando una
  modifica a un pasto tocca un menu già approvato, viene creata una nuova
  versione (mai sovrascrivendo quella approvata) e, se esisteva già una
  lista della spesa, viene ricollegata e i suoi articoli ricalcolati.
- **Supabase Realtime**: `subscribeRealtime()` collega la lista della spesa,
  lo stato del menu e le note famiglia agli aggiornamenti fatti da altri
  dispositivi (`supabase/migrations/0004_realtime.sql` abilita la
  pubblicazione realtime sulle tabelle coinvolte, con le stesse RLS già in
  vigore per le query normali). Un cambiamento fatto da un familiare — es.
  "Chalika ha segnato le zucchine come comprate" — arriva agli altri
  dispositivi senza ricaricare la pagina, tramite lo stesso bus di eventi
  usato per i toast in modalità demo (`src/lib/realtime/demo-bus.ts`).
- **Keep-alive automatico**: un Vercel Cron Job (`vercel.json`) chiama
  `/api/cron/keep-alive` ogni giorno per evitare che il progetto Supabase
  free tier vada in pausa per inattività.

Cosa **non** è ancora collegato: gli inviti restano "un clic" solo nella UI
(non esiste ancora il flusso che, all'accettazione, crea davvero un nuovo
utente Supabase Auth); il catalogo `allergies`/`intolerances`/
`dietary_restrictions`/`dislikes` (tabelle figlie del profilo alimentare)
non è ancora sincronizzato — solo i campi semplici (note, piatti preferiti,
apertura a nuovi piatti) lo sono, poiché è l'unico caso già usato
dall'interfaccia.

---

## Stack tecnologico

Next.js 14 (App Router) · React 18 · TypeScript strict · Tailwind CSS ·
componenti shadcn/ui personalizzati su Radix UI · lucide-react · Zustand ·
React Hook Form + Zod · date-fns · Vitest + Testing Library · Playwright ·
Supabase (`@supabase/supabase-js`, `@supabase/ssr`) · PWA con service worker
scritto a mano.

Nessun `any` nel codice applicativo (l'unica eccezione documentata è
l'`unknown` tipizzato in `AuditLogEntry.metadata` e `RealtimeEvent<TPayload>`,
entrambi generici per costruzione).

---

## Design system — "ISAIA / Risto Eventi"

Estetica editoriale, elegante, minimalista. Titoli in **Cormorant Garamond**
(serif), testo e interfaccia in **Montserrat** (sans-serif), accento rosso
cremisi. Due temi:

- **Scuro** (predefinito): fondo carbone caldo, tipografia avorio.
- **Chiaro — "Maiolica di Capri"**: bianco caldo con blu cobalto come
  accento secondario, richiamo alle maioliche capresi.

I token colore sono variabili CSS in `src/app/globals.css` (`:root` = scuro,
`html.light` = chiaro), composte da Tailwind (`tailwind.config.ts`). Il
cambio tema è gestito da `src/components/theme-provider.tsx` (persistito in
`localStorage`, indipendente da `prefers-color-scheme` del sistema operativo,
come richiesto: il tema di default è sempre quello scuro).

---

## Struttura del progetto

```
src/
  app/                    # route Next.js (App Router)
    (app)/                # area autenticata: home, menu, spesa...
    login/, onboarding/, invito/[token]/, recupero-password/
  components/
    ui/                   # design system (shadcn/ui personalizzato)
    layout/, menu/, meal/, shopping/, onboarding/, providers/
  lib/
    services/menu-generation/  # MenuGenerationService: interfaccia, mock, adapter reale
    validation/                # Zod schema + validazione deterministica (allergie, struttura settimana)
    shopping/                  # normalizzazione e aggregazione ingredienti, riconciliazione lista spesa
    menu/                      # versioning del menu dopo l'approvazione
    auth/                       # regole di autorizzazione centralizzate
    realtime/                   # bus pub/sub demo
    data/                       # dati demo (famiglia, ricette, stato iniziale)
    supabase/                   # client browser/server (usati solo se configurato)
    home/                        # logica di priorità della Home
  store/                  # store Zustand (unica fonte di verità in modalità demo)
  types/domain.ts         # tipi di dominio condivisi da tutta l'app
supabase/
  migrations/             # schema SQL completo + Row Level Security
tests/
  unit/                   # Vitest + Testing Library
  e2e/                    # Playwright
```

---

## Assunzioni e scelte di progettazione

Il brief è estremamente dettagliato; dove lasciava margini di interpretazione
o conteneva un'ambiguità, si è scelta l'opzione più semplice e robusta,
documentata qui invece che chiesta a voce:

1. **"17 momenti alimentari" (§5).** L'enumerazione esplicita (5 giorni
   feriali × 2 pasti + 2 giorni di weekend × 3 pasti) somma **16**, non 17.
   Si è trattato "17" come un refuso e implementata esattamente la struttura
   descritta (16 pasti generati automaticamente), lasciando comunque la
   possibilità di aggiungere manualmente un pranzo feriale (che porterebbe il
   totale a 17+ a seconda di quanti se ne aggiungono). Vedi il commento in
   `src/lib/validation/validate-generated-week.ts`.
2. **Duplicati in colazione.** La regola "niente piatti ripetuti nella
   settimana" si applica a pranzo/cena, non alla colazione: la libreria demo
   ha meno colazioni che giorni della settimana, e nella cucina mediterranea
   reale la colazione è tipicamente più ricorrente (pane e olio, yogurt e
   frutta...).
3. **Modifica di un menu già approvato.** Non richiede una nuova
   approvazione esplicita per tornare efficace: crea una nuova versione
   (immutabile quella precedente), aggiorna lo stato a
   "modificato dopo l'approvazione" e notifica gli altri membri, ma il pasto
   modificato è subito valido. Si è ritenuto più coerente con "uno dei due
   può modificarlo" (già equivalente all'approvazione) che bloccare l'intero
   menu in attesa di una seconda conferma.
4. **Ruolo operativo di Chalika.** È impostata come `collaborator` /
   `viewer` (non `editor`): può consultare menu e ricette ma non modificarli
   (niente "cambia piatto", "rigenera", "segna pasto fuori"). I suoi permessi
   reali sulla lista della spesa (aggiornare stati, aggiungere prodotti) sono
   flag granulari indipendenti dal ruolo operativo, per rispettare alla
   lettera l'elenco del brief (§3).
5. **Sicurezza in modalità demo.** Senza un backend reale non può esistere
   una barriera server-side "vera": le regole di autorizzazione
   (`src/lib/auth/permissions.ts`) sono comunque centralizzate e pure,
   condivise concettualmente con le policy RLS di Supabase
   (`supabase/migrations/0002_rls.sql`), che sono la barriera reale quando
   l'app è collegata a un progetto Supabase.
6. **Icone PWA.** I file PNG (`public/icons/icon-*.png`) sono generati da
   uno script che scrive byte PNG grezzi (`scripts/generate-pwa-icons.mjs`),
   per evitare dipendenze di generazione immagini: sono segnaposto a tinta
   unita nei colori del brand, validi come formato ma da sostituire con un
   artwork reale prima di una pubblicazione pubblica. `public/icons/icon.svg`
   contiene un monogramma "M" più curato, usato come icona principale/favicon.
7. **Cancellazione account/famiglia (§20).** In modalità demo non esiste un
   record server da cancellare: le due azioni in "Privacy" effettuano un
   logout locale, con testo esplicito che descrive cosa accadrebbe con un
   backend reale collegato.
8. **Notifiche.** Solo in-app in questa consegna: le chiavi VAPID per le push
   reali sono previste in `.env.example` ma il flusso di sottoscrizione push
   non è implementato.
9. **Date senza fuso orario.** Tutte le date "YYYY-MM-DD" del dominio (giorni
   del menu, scadenze...) sono trattate come date pure in UTC, indipendenti
   dal fuso orario del server/browser che esegue il codice — per evitare che
   lo stesso menu "slitti" di un giorno a seconda di dove gira l'app.
10. **Ricette come catalogo condiviso.** `recipes`/`recipe_ingredients` non
    sono scoped per famiglia: rappresentano la libreria comune usata dal
    generatore. Ciò che è specifico di una famiglia è la fotografia
    (`recipe_snapshot`) salvata su ogni pasto assegnato.
11. **Gestione avanzi rimossa.** Su richiesta esplicita, la sezione dedicata
    "Avanzi" (registrazione, suggerimenti di riutilizzo) è stata rimossa per
    mantenere l'app più snella: non esiste più la schermata `/avanzi`, la
    voce di navigazione, lo stato `leftoverItems` né il metodo
    `suggestLeftoverReuse` del `MenuGenerationService`. Il campo
    `usesLeftovers` resta solo come dato interno della ricetta (usato dal
    generatore per varietà), senza alcuna funzionalità dedicata in UI.
12. **Almeno due cene di pesce a settimana.** `MockMenuProvider` applica un
    aggiustamento post-generazione (`ensureMinimumFishDinners`) che sostituisce
    cene non di pesce con ricette di pesce quando ce ne sono meno di due nella
    settimana — rispettando comunque sempre le allergie: se nessuna ricetta di
    pesce è sicura per la famiglia, il vincolo non viene forzato.
13. **Contrasto colori nel tema chiaro.** `--muted-foreground` (usato per
    metadati, icone ed etichette secondarie) è stato scurito rispetto alla
    prima versione per garantire un contrasto ampiamente sopra la soglia AA
    su sfondo bianco/carta.
14. **Porzioni non mostrate in UI.** Il dato `servings` resta nel modello
    (serve a costruire correttamente la lista della spesa) ma non è più
    esposto nelle schermate di menu/ricetta/alternative, per ridurre il
    numero di informazioni mostrate contemporaneamente.
15. **Gestione dispensa ("In casa") rimossa.** Su richiesta esplicita, anche
    questa sezione è stata rimossa: niente più schermata `/dispensa`, voce di
    navigazione, tipo `PantryItem`/`PantryAvailability`, azioni di store
    dedicate né passaggio "Dispensa base" nell'onboarding (ridotto a 4
    passaggi). L'indicatore "Usa prodotti già in casa" e la variante di
    alternativa "Con ingredienti già presenti" sono stati rimossi di
    conseguenza, non avendo più una fonte dati da cui derivare. Lo stato
    "Già in casa" resta comunque disponibile come stato *manuale* di un
    articolo nella lista della spesa (§12): a sparire è solo il calcolo
    automatico basato sul confronto con una dispensa dedicata.
16. **Generazione del menu con Claude, con apprendimento dal feedback.**
    `RealMenuGenerationAdapter` collega la generazione a un vero modello AI
    (vedi sezione dedicata sopra); i piatti segnati "Da non riproporre" in un
    feedback vengono esclusi dalle settimane successive, sia dal provider
    mock sia da quello AI reale.

## Accessibilità e sicurezza — punti salienti

- Focus visibile su ogni elemento interattivo (`:focus-visible` con anello
  cremisi), componenti costruiti su Radix UI (gestione focus trap, ARIA,
  navigazione da tastiera già corretta by design).
- Contrasti verificati per entrambi i temi sui colori di testo/superficie
  principali.
- Le allergie sono validate **deterministicamente** lato servizio
  (`src/lib/validation/allergy-guard.ts`), mai delegate al solo provider AI:
  qualunque ricetta incompatibile viene scartata prima di raggiungere
  l'utente, sia in generazione automatica sia nelle alternative proposte.
- I dati sanitari (allergie, intolleranze, note familiari) sono leggibili e
  modificabili solo da owner/admin, sia nell'app (`permissions.ts`) sia nello
  schema RLS.
- Esportazione dati e cancellazione account/famiglia disponibili in
  **Privacy ed esportazione dati**.

---

## Test

- **Vitest + Testing Library** (`tests/unit`): aggregazione della lista della
  spesa (unità compatibili/incompatibili), guardia allergie, validazione
  della struttura settimanale, versioning del menu, riconciliazione della
  spesa dopo una modifica, generazione deterministica del `MockMenuProvider`
  (incluso il vincolo delle almeno due cene di pesce a settimana), logica di
  priorità della Home, un componente (`MealFeedbackForm`).
- **Playwright** (`tests/e2e`): flusso end-to-end login → home → menu →
  approvazione → lista della spesa, più una verifica che Chalika non veda mai
  l'azione di approvazione.

---

## Disclaimer

MealFlow offre un supporto organizzativo basato su principi generali di sana
alimentazione. Non sostituisce le indicazioni del medico, del pediatra o di
un professionista della nutrizione — il messaggio è mostrato nell'app in
corrispondenza delle schermate di ricetta e privacy.

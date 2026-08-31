-- =============================================================================
-- MealFlow — schema iniziale
-- =============================================================================
-- Convenzioni (§19): UUID come chiave primaria, household_id per lo scoping
-- multi-tenant, created_at/updated_at su tutte le tabelle mutabili,
-- created_by/updated_by dove ha senso tracciare l'autore, deleted_at per le
-- entità con soft-delete (household_members: la bambina o un membro rimosso
-- non deve sparire dallo storico dei pasti già serviti).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
create type household_role as enum ('owner', 'admin', 'collaborator');
create type operational_role as enum ('approver', 'editor', 'viewer');
create type age_group as enum ('adulto', 'bambino_6_10', 'bambino_11_13', 'adolescente', 'neonato');
create type weekday as enum ('lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica');
create type meal_slot as enum ('colazione', 'pranzo', 'cena');
create type menu_status as enum ('draft', 'generated', 'pending_approval', 'approved', 'modified_after_approval', 'archived');
create type meal_attendance_type as enum (
  'tutti_presenti', 'assenze_parziali', 'ospiti', 'fuori_casa', 'viaggio',
  'gia_organizzato', 'avanzi', 'nessuna_preparazione'
);
create type recipe_difficulty as enum ('facile', 'media', 'impegnativa');
create type ingredient_unit as enum ('g', 'kg', 'ml', 'l', 'pz', 'cucchiai', 'cucchiaini', 'q.b.');
create type shopping_category as enum (
  'frutta_verdura', 'pesce_carne', 'latticini_uova', 'pane_forno', 'pasta_riso_cereali',
  'dispensa', 'surgelati', 'colazione', 'bevande', 'casa', 'altro'
);
create type shopping_item_status as enum ('da_verificare', 'gia_in_casa', 'da_comprare', 'comprato', 'non_disponibile', 'sostituito');
create type pantry_availability as enum ('disponibile', 'quasi_finito', 'da_ricomprare');
create type allergy_severity as enum ('lieve', 'moderata', 'grave');
create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type notification_type as enum (
  'menu_pronto', 'promemoria_approvazione', 'menu_approvato', 'menu_modificato',
  'spesa_aggiornata', 'nota_aggiunta', 'invito_ricevuto'
);
create type meal_feedback_tag as enum (
  'piaciuto_a_tutti', 'piaciuto_agli_adulti', 'piaciuto_alla_bambina', 'da_riproporre',
  'da_non_riproporre', 'quantita_eccessiva', 'quantita_insufficiente',
  'preparazione_troppo_lunga', 'sono_rimasti_avanzi'
);
create type leftover_status as enum ('disponibile', 'utilizzato', 'scaduto');

-- ---------------------------------------------------------------------------
-- Funzione di utilità: mantiene updated_at aggiornato
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- users — profilo applicativo collegato a auth.users
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  onboarding_completed_at timestamptz,
  onboarding_step smallint not null default 0,
  shopping_day weekday not null default 'sabato',
  week_starts_on weekday not null default 'lunedi',
  budget_level text not null default 'equilibrato' check (budget_level in ('essenziale', 'equilibrato', 'senza_pensieri')),
  max_prep_minutes_weekday smallint not null default 30,
  max_prep_minutes_weekend smallint not null default 60,
  chalika_cooking_days weekday[] not null default '{}',
  variety_level text not null default 'equilibrata' check (variety_level in ('abitudinaria', 'equilibrata', 'esplorativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references users (id)
);
create trigger households_set_updated_at before update on households
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- household_members — componenti della famiglia, con o senza account
-- ---------------------------------------------------------------------------
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  display_name text not null,
  age_group age_group not null,
  age smallint,
  is_demo boolean not null default false,
  avatar_color text not null default 'crimson',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index household_members_household_id_idx on household_members (household_id);
create trigger household_members_set_updated_at before update on household_members
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- household_user_roles — governance + ruolo operativo per utente autenticato
-- ---------------------------------------------------------------------------
create table household_user_roles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role household_role not null,
  operational_role operational_role not null,
  -- Permessi granulari: valorizzati SOLO per role = 'collaborator'. I tre
  -- campi critici sono vincolati a false per un Collaborator (§3, §20): mai
  -- approvazione, mai modifica di allergie/dati sanitari, mai gestione ruoli.
  can_view_menu boolean not null default true,
  can_view_recipes boolean not null default true,
  can_view_operational_notes boolean not null default true,
  can_update_shopping_list boolean not null default true,
  can_mark_pantry_items boolean not null default true,
  can_add_manual_items boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  constraint collaborator_never_privileged check (
    role != 'collaborator' or (
      -- per un collaborator, i permessi critici non esistono come colonne
      -- separate: l'applicazione e le policy RLS (0002) impediscono comunque
      -- approvazione/modifica ruoli/allergie indipendentemente da questi flag.
      true
    )
  )
);
create index household_user_roles_household_id_idx on household_user_roles (household_id);
create index household_user_roles_user_id_idx on household_user_roles (user_id);

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  email text not null,
  role household_role not null,
  operational_role operational_role not null,
  invited_by uuid not null references users (id),
  token text not null unique,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);
create index invitations_household_id_idx on invitations (household_id);

-- ---------------------------------------------------------------------------
-- dietary_profiles + tabelle figlie (allergie, intolleranze, esclusioni, dislike)
-- ---------------------------------------------------------------------------
create table dietary_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  member_id uuid not null references household_members (id) on delete cascade,
  preferred_dishes text[] not null default '{}',
  disliked_textures text[] not null default '{}',
  family_notes text,
  openness_to_new_dishes text not null default 'media' check (openness_to_new_dishes in ('bassa', 'media', 'alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);
create trigger dietary_profiles_set_updated_at before update on dietary_profiles
  for each row execute function set_updated_at();

create table allergies (
  id uuid primary key default gen_random_uuid(),
  dietary_profile_id uuid not null references dietary_profiles (id) on delete cascade,
  allergen text not null,
  severity allergy_severity not null,
  notes text,
  created_at timestamptz not null default now()
);
create index allergies_dietary_profile_id_idx on allergies (dietary_profile_id);

create table intolerances (
  id uuid primary key default gen_random_uuid(),
  dietary_profile_id uuid not null references dietary_profiles (id) on delete cascade,
  substance text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index intolerances_dietary_profile_id_idx on intolerances (dietary_profile_id);

create table dietary_restrictions (
  id uuid primary key default gen_random_uuid(),
  dietary_profile_id uuid not null references dietary_profiles (id) on delete cascade,
  ingredient text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index dietary_restrictions_dietary_profile_id_idx on dietary_restrictions (dietary_profile_id);

create table dislikes (
  id uuid primary key default gen_random_uuid(),
  dietary_profile_id uuid not null references dietary_profiles (id) on delete cascade,
  ingredient_or_dish text not null,
  created_at timestamptz not null default now()
);
create index dislikes_dietary_profile_id_idx on dislikes (dietary_profile_id);

-- ---------------------------------------------------------------------------
-- preferences — gusti a livello di famiglia (non del singolo membro)
-- ---------------------------------------------------------------------------
create table preferences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  favorite_dishes text[] not null default '{}',
  disliked_dishes text[] not null default '{}',
  favorite_vegetables text[] not null default '{}',
  favorite_fish text[] not null default '{}',
  favorite_legumes text[] not null default '{}',
  favorite_breakfasts text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (household_id)
);
create trigger preferences_set_updated_at before update on preferences
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- recipes + recipe_ingredients — libreria condivisa (non household-scoped:
-- le ricette sono un catalogo comune; ciò che è household-scoped è l'uso che
-- se ne fa in un pasto, tramite meals.recipe_snapshot).
-- ---------------------------------------------------------------------------
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  mediterranean_tags text[] not null default '{}',
  servings smallint not null default 4,
  prep_minutes smallint not null default 0,
  cook_minutes smallint not null default 0,
  difficulty recipe_difficulty not null default 'facile',
  can_prepare_ahead boolean not null default false,
  allergens text[] not null default '{}',
  steps text[] not null default '{}',
  image_emoji text not null default '🍽️',
  is_vegetarian boolean not null default false,
  is_quick_under_20 boolean not null default false,
  uses_leftovers boolean not null default false,
  cost_level text not null default 'medio' check (cost_level in ('basso', 'medio', 'alto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger recipes_set_updated_at before update on recipes
  for each row execute function set_updated_at();

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2),
  unit ingredient_unit,
  category shopping_category not null,
  optional boolean not null default false,
  created_at timestamptz not null default now()
);
create index recipe_ingredients_recipe_id_idx on recipe_ingredients (recipe_id);

-- ---------------------------------------------------------------------------
-- weekly_menus + menu_versions + menu_days + meals
-- ---------------------------------------------------------------------------
create table weekly_menus (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  week_start_date date not null,
  status menu_status not null default 'draft',
  current_version_id uuid, -- FK aggiunta dopo la creazione di menu_versions (dipendenza circolare)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users (id),
  unique (household_id, week_start_date)
);
create index weekly_menus_household_id_idx on weekly_menus (household_id);
create trigger weekly_menus_set_updated_at before update on weekly_menus
  for each row execute function set_updated_at();

create table menu_versions (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references weekly_menus (id) on delete cascade,
  version_number smallint not null,
  previous_version_id uuid references menu_versions (id),
  approved_by uuid references users (id),
  approved_by_name text,
  approved_at timestamptz,
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references users (id),
  is_immutable boolean not null default false,
  unique (menu_id, version_number)
);
create index menu_versions_menu_id_idx on menu_versions (menu_id);

alter table weekly_menus
  add constraint weekly_menus_current_version_fk foreign key (current_version_id) references menu_versions (id);

create table menu_days (
  id uuid primary key default gen_random_uuid(),
  menu_version_id uuid not null references menu_versions (id) on delete cascade,
  day weekday not null,
  date date not null,
  unique (menu_version_id, day)
);
create index menu_days_menu_version_id_idx on menu_days (menu_version_id);

create table meals (
  id uuid primary key default gen_random_uuid(),
  menu_version_id uuid not null references menu_versions (id) on delete cascade,
  day weekday not null,
  date date not null,
  slot meal_slot not null,
  recipe_id uuid references recipes (id),
  -- Fotografia della ricetta al momento dell'assegnazione: se la ricetta
  -- "master" cambia in futuro, il pasto storico resta fedele a ciò che è
  -- stato davvero servito/approvato.
  recipe_snapshot jsonb,
  is_manually_added boolean not null default false,
  attendance_type meal_attendance_type not null default 'tutti_presenti',
  attendance_absent_member_ids uuid[] not null default '{}',
  attendance_guests_count smallint not null default 0,
  attendance_guests_note text,
  chalika_note text,
  family_note text,
  child_adaptation_note text,
  uses_existing_pantry_items text[] not null default '{}',
  uses_leftovers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id),
  -- Regola di dominio (§5): il pranzo nei giorni feriali non è mai generato
  -- automaticamente, solo aggiunto manualmente.
  constraint no_automatic_weekday_lunch check (
    is_manually_added = true or slot != 'pranzo' or day in ('sabato', 'domenica')
  )
);
create index meals_menu_version_id_idx on meals (menu_version_id);
create index meals_date_idx on meals (date);
create trigger meals_set_updated_at before update on meals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_feedback
-- ---------------------------------------------------------------------------
create table meal_feedback (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals (id) on delete cascade,
  household_id uuid not null references households (id) on delete cascade,
  created_by uuid not null references users (id),
  tags meal_feedback_tag[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);
create index meal_feedback_meal_id_idx on meal_feedback (meal_id);

-- ---------------------------------------------------------------------------
-- shopping_lists + shopping_list_items + shopping_item_status_history
-- ---------------------------------------------------------------------------
create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  menu_version_id uuid not null references menu_versions (id),
  week_start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_version_id)
);
create index shopping_lists_household_id_idx on shopping_lists (household_id);
create trigger shopping_lists_set_updated_at before update on shopping_lists
  for each row execute function set_updated_at();

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references shopping_lists (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity numeric(10, 2),
  unit ingredient_unit,
  category shopping_category not null,
  status shopping_item_status not null default 'da_comprare',
  note text,
  is_manual boolean not null default false,
  source_meal_ids uuid[] not null default '{}',
  needs_review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users (id)
);
create index shopping_list_items_shopping_list_id_idx on shopping_list_items (shopping_list_id);
create index shopping_list_items_normalized_name_idx on shopping_list_items (normalized_name);
create trigger shopping_list_items_set_updated_at before update on shopping_list_items
  for each row execute function set_updated_at();

create table shopping_item_status_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references shopping_list_items (id) on delete cascade,
  previous_status shopping_item_status,
  new_status shopping_item_status not null,
  changed_by uuid not null references users (id),
  changed_by_name text not null,
  changed_at timestamptz not null default now()
);
create index shopping_item_status_history_item_id_idx on shopping_item_status_history (item_id);

-- ---------------------------------------------------------------------------
-- pantry_items + leftover_items
-- ---------------------------------------------------------------------------
create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  quantity text,
  unit ingredient_unit,
  category shopping_category not null,
  expires_on date,
  availability pantry_availability not null default 'disponibile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id)
);
create index pantry_items_household_id_idx on pantry_items (household_id);
create trigger pantry_items_set_updated_at before update on pantry_items
  for each row execute function set_updated_at();

create table leftover_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  dish_or_ingredient text not null,
  quantity text,
  logged_on date not null default current_date,
  expires_on date,
  note text,
  status leftover_status not null default 'disponibile',
  created_at timestamptz not null default now(),
  created_by uuid references users (id)
);
create index leftover_items_household_id_idx on leftover_items (household_id);

-- ---------------------------------------------------------------------------
-- household_notes
-- ---------------------------------------------------------------------------
create table household_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  scope text not null check (scope in ('menu', 'spesa', 'generale')),
  ref_id uuid,
  author_id uuid not null references users (id),
  author_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index household_notes_household_id_idx on household_notes (household_id);

-- ---------------------------------------------------------------------------
-- notifications + notification_preferences
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on notifications (user_id);

create table notification_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  menu_pronto boolean not null default true,
  promemoria_approvazione boolean not null default true,
  menu_approvato boolean not null default true,
  spesa_aggiornata boolean not null default true,
  note_aggiunte boolean not null default true,
  canale text not null default 'app' check (canale in ('app', 'app_e_push'))
);

-- ---------------------------------------------------------------------------
-- audit_logs — traccia le azioni critiche (§20)
-- ---------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  actor_id uuid not null references users (id),
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_household_id_idx on audit_logs (household_id);
create index audit_logs_created_at_idx on audit_logs (created_at desc);

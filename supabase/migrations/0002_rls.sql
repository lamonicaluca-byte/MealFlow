-- =============================================================================
-- MealFlow — Row Level Security
-- =============================================================================
-- Principio guida (§20): "un utente deve accedere esclusivamente alle
-- famiglie di cui è membro" e "la sicurezza non deve dipendere dalla sola
-- interfaccia". Queste policy sono l'ultima barriera, indipendente
-- dall'applicazione: valgono anche per chiamate dirette all'API REST/Realtime
-- di Supabase con il solo anon/JWT dell'utente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funzioni helper (security definer: leggono household_user_roles ignorando
-- la RLS della tabella stessa, per evitare ricorsioni infinite nelle policy)
-- ---------------------------------------------------------------------------
create or replace function is_household_member(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles
    where household_id = target_household_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function is_owner_or_admin(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles
    where household_id = target_household_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$ language sql security definer stable;

create or replace function is_owner(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles
    where household_id = target_household_id and user_id = auth.uid() and role = 'owner'
  );
$$ language sql security definer stable;

create or replace function can_approve_menu(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles
    where household_id = target_household_id and user_id = auth.uid() and operational_role = 'approver'
  );
$$ language sql security definer stable;

create or replace function can_edit_menu(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles
    where household_id = target_household_id
      and user_id = auth.uid()
      and operational_role in ('approver', 'editor')
  );
$$ language sql security definer stable;

create or replace function can_update_shopping_list(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles hur
    where hur.household_id = target_household_id
      and hur.user_id = auth.uid()
      and (hur.role in ('owner', 'admin') or hur.can_update_shopping_list = true)
  );
$$ language sql security definer stable;

create or replace function can_mark_pantry_items(target_household_id uuid)
returns boolean as $$
  select exists (
    select 1 from household_user_roles hur
    where hur.household_id = target_household_id
      and hur.user_id = auth.uid()
      and (hur.role in ('owner', 'admin') or hur.can_mark_pantry_items = true)
  );
$$ language sql security definer stable;

create or replace function household_of_member(target_member_id uuid)
returns uuid as $$
  select household_id from household_members where id = target_member_id;
$$ language sql security definer stable;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
alter table users enable row level security;

create policy users_select_self_or_household_peers on users for select
  using (
    id = auth.uid()
    or exists (
      select 1 from household_user_roles a
      join household_user_roles b on a.household_id = b.household_id
      where a.user_id = auth.uid() and b.user_id = users.id
    )
  );

create policy users_update_self on users for update
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
alter table households enable row level security;

create policy households_select_member on households for select
  using (is_household_member(id));

create policy households_insert_any_authenticated on households for insert
  with check (created_by = auth.uid());

create policy households_update_owner_admin on households for update
  using (is_owner_or_admin(id));

create policy households_delete_owner on households for delete
  using (is_owner(id));

-- ---------------------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------------------
alter table household_members enable row level security;

create policy household_members_select_member on household_members for select
  using (is_household_member(household_id));

create policy household_members_write_owner_admin on household_members for insert
  with check (is_owner_or_admin(household_id));

create policy household_members_update_owner_admin on household_members for update
  using (is_owner_or_admin(household_id));

create policy household_members_delete_owner_admin on household_members for delete
  using (is_owner_or_admin(household_id));

-- ---------------------------------------------------------------------------
-- household_user_roles — solo owner/admin gestiscono i ruoli (§20)
-- ---------------------------------------------------------------------------
alter table household_user_roles enable row level security;

create policy household_user_roles_select_member on household_user_roles for select
  using (is_household_member(household_id));

create policy household_user_roles_write_owner_admin on household_user_roles for insert
  with check (is_owner_or_admin(household_id));

create policy household_user_roles_update_owner_admin on household_user_roles for update
  using (is_owner_or_admin(household_id));

create policy household_user_roles_delete_owner on household_user_roles for delete
  using (is_owner(household_id));

-- ---------------------------------------------------------------------------
-- invitations — solo owner/admin
-- ---------------------------------------------------------------------------
alter table invitations enable row level security;

create policy invitations_select_owner_admin on invitations for select
  using (is_owner_or_admin(household_id));

create policy invitations_write_owner_admin on invitations for insert
  with check (is_owner_or_admin(household_id));

create policy invitations_update_owner_admin on invitations for update
  using (is_owner_or_admin(household_id));

-- ---------------------------------------------------------------------------
-- dietary_profiles + tabelle figlie — MAI leggibili/scrivibili da un
-- Collaborator (§3: "le informazioni relative ad allergie e indicazioni
-- familiari devono essere protette"): solo owner/admin.
-- ---------------------------------------------------------------------------
alter table dietary_profiles enable row level security;

create policy dietary_profiles_owner_admin_only on dietary_profiles for all
  using (is_owner_or_admin(household_id))
  with check (is_owner_or_admin(household_id));

alter table allergies enable row level security;
create policy allergies_owner_admin_only on allergies for all
  using (is_owner_or_admin((select household_id from dietary_profiles where id = allergies.dietary_profile_id)))
  with check (is_owner_or_admin((select household_id from dietary_profiles where id = allergies.dietary_profile_id)));

alter table intolerances enable row level security;
create policy intolerances_owner_admin_only on intolerances for all
  using (is_owner_or_admin((select household_id from dietary_profiles where id = intolerances.dietary_profile_id)))
  with check (is_owner_or_admin((select household_id from dietary_profiles where id = intolerances.dietary_profile_id)));

alter table dietary_restrictions enable row level security;
create policy dietary_restrictions_owner_admin_only on dietary_restrictions for all
  using (is_owner_or_admin((select household_id from dietary_profiles where id = dietary_restrictions.dietary_profile_id)))
  with check (is_owner_or_admin((select household_id from dietary_profiles where id = dietary_restrictions.dietary_profile_id)));

alter table dislikes enable row level security;
create policy dislikes_owner_admin_only on dislikes for all
  using (is_owner_or_admin((select household_id from dietary_profiles where id = dislikes.dietary_profile_id)))
  with check (is_owner_or_admin((select household_id from dietary_profiles where id = dislikes.dietary_profile_id)));

-- ---------------------------------------------------------------------------
-- preferences — leggibile da tutta la famiglia, scrivibile da owner/admin
-- ---------------------------------------------------------------------------
alter table preferences enable row level security;

create policy preferences_select_member on preferences for select
  using (is_household_member(household_id));

create policy preferences_write_owner_admin on preferences for all
  using (is_owner_or_admin(household_id))
  with check (is_owner_or_admin(household_id));

-- ---------------------------------------------------------------------------
-- recipes / recipe_ingredients — catalogo condiviso, in lettura per chiunque
-- sia autenticato; la scrittura è riservata al ruolo service (seed/gestione
-- editoriale), non esposta agli utenti finali in questa versione.
-- ---------------------------------------------------------------------------
alter table recipes enable row level security;
create policy recipes_select_authenticated on recipes for select
  using (auth.role() = 'authenticated');

alter table recipe_ingredients enable row level security;
create policy recipe_ingredients_select_authenticated on recipe_ingredients for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- weekly_menus / menu_versions / menu_days — leggibili da tutta la famiglia
-- (incluso Collaborator: "può consultare il menu"); scrivibili solo da chi
-- ha ruolo operativo approver/editor (mai un Collaborator "viewer").
-- ---------------------------------------------------------------------------
alter table weekly_menus enable row level security;
create policy weekly_menus_select_member on weekly_menus for select
  using (is_household_member(household_id));
create policy weekly_menus_write_editor_approver on weekly_menus for all
  using (can_edit_menu(household_id))
  with check (can_edit_menu(household_id));

alter table menu_versions enable row level security;
create policy menu_versions_select_member on menu_versions for select
  using (is_household_member((select household_id from weekly_menus where id = menu_versions.menu_id)));
create policy menu_versions_write_editor_approver on menu_versions for all
  using (can_edit_menu((select household_id from weekly_menus where id = menu_versions.menu_id)))
  with check (can_edit_menu((select household_id from weekly_menus where id = menu_versions.menu_id)));
-- Il campo approved_by/approved_at può essere valorizzato solo da chi può approvare:
create policy menu_versions_approve_only_approver on menu_versions for update
  using (can_approve_menu((select household_id from weekly_menus where id = menu_versions.menu_id)))
  with check (can_approve_menu((select household_id from weekly_menus where id = menu_versions.menu_id)));

alter table menu_days enable row level security;
create policy menu_days_select_member on menu_days for select
  using (is_household_member((select household_id from weekly_menus wm join menu_versions mv on mv.menu_id = wm.id where mv.id = menu_days.menu_version_id)));

alter table meals enable row level security;
create policy meals_select_member on meals for select
  using (is_household_member((select household_id from weekly_menus wm join menu_versions mv on mv.menu_id = wm.id where mv.id = meals.menu_version_id)));
create policy meals_write_editor_approver on meals for all
  using (can_edit_menu((select household_id from weekly_menus wm join menu_versions mv on mv.menu_id = wm.id where mv.id = meals.menu_version_id)))
  with check (can_edit_menu((select household_id from weekly_menus wm join menu_versions mv on mv.menu_id = wm.id where mv.id = meals.menu_version_id)));

-- ---------------------------------------------------------------------------
-- meal_feedback — qualsiasi membro può lasciare feedback, nessun voto/punteggio
-- ---------------------------------------------------------------------------
alter table meal_feedback enable row level security;
create policy meal_feedback_select_member on meal_feedback for select
  using (is_household_member(household_id));
create policy meal_feedback_insert_member on meal_feedback for insert
  with check (is_household_member(household_id) and created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- shopping_lists / shopping_list_items / shopping_item_status_history
-- Leggibili e aggiornabili anche da un Collaborator (§3: "può aggiornare la
-- spesa"), mai da chi non è membro della famiglia.
-- ---------------------------------------------------------------------------
alter table shopping_lists enable row level security;
create policy shopping_lists_select_member on shopping_lists for select
  using (is_household_member(household_id));
create policy shopping_lists_write_editor_approver on shopping_lists for all
  using (can_edit_menu(household_id))
  with check (can_edit_menu(household_id));

alter table shopping_list_items enable row level security;
create policy shopping_list_items_select_member on shopping_list_items for select
  using (is_household_member((select household_id from shopping_lists where id = shopping_list_items.shopping_list_id)));
create policy shopping_list_items_write_collaborator_ok on shopping_list_items for all
  using (can_update_shopping_list((select household_id from shopping_lists where id = shopping_list_items.shopping_list_id)))
  with check (can_update_shopping_list((select household_id from shopping_lists where id = shopping_list_items.shopping_list_id)));

alter table shopping_item_status_history enable row level security;
create policy shopping_item_status_history_select_member on shopping_item_status_history for select
  using (is_household_member((
    select sl.household_id from shopping_lists sl
    join shopping_list_items sli on sli.shopping_list_id = sl.id
    where sli.id = shopping_item_status_history.item_id
  )));
create policy shopping_item_status_history_insert_collaborator_ok on shopping_item_status_history for insert
  with check (changed_by = auth.uid());

-- ---------------------------------------------------------------------------
-- pantry_items — Collaborator può indicare prodotti già presenti (§3)
-- ---------------------------------------------------------------------------
alter table pantry_items enable row level security;
create policy pantry_items_select_member on pantry_items for select
  using (is_household_member(household_id));
create policy pantry_items_write_collaborator_ok on pantry_items for all
  using (can_mark_pantry_items(household_id))
  with check (can_mark_pantry_items(household_id));

-- ---------------------------------------------------------------------------
-- leftover_items — chiunque in famiglia può segnalare un avanzo
-- ---------------------------------------------------------------------------
alter table leftover_items enable row level security;
create policy leftover_items_select_member on leftover_items for select
  using (is_household_member(household_id));
create policy leftover_items_write_member on leftover_items for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- household_notes — leggibili da chi può vedere le note operative
-- ---------------------------------------------------------------------------
alter table household_notes enable row level security;
create policy household_notes_select_member on household_notes for select
  using (is_household_member(household_id));
create policy household_notes_insert_member on household_notes for insert
  with check (is_household_member(household_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications / notification_preferences — strettamente personali
-- ---------------------------------------------------------------------------
alter table notifications enable row level security;
create policy notifications_select_own on notifications for select
  using (user_id = auth.uid());
create policy notifications_update_own on notifications for update
  using (user_id = auth.uid());

alter table notification_preferences enable row level security;
create policy notification_preferences_own on notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_logs — leggibili da owner/admin, scrivibili dal sistema/dagli utenti
-- che compiono l'azione tracciata (mai modificabili/cancellabili: append-only)
-- ---------------------------------------------------------------------------
alter table audit_logs enable row level security;
create policy audit_logs_select_owner_admin on audit_logs for select
  using (is_owner_or_admin(household_id));
create policy audit_logs_insert_member on audit_logs for insert
  with check (is_household_member(household_id) and actor_id = auth.uid());

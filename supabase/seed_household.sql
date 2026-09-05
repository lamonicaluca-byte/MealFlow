-- =============================================================================
-- MealFlow — seed della famiglia reale (Luca, Anita, Amelia, Chalika)
-- =============================================================================
-- Da eseguire UNA VOLTA sul progetto Supabase collegato, dopo le migrazioni
-- (0001_schema.sql, 0002_rls.sql) e dopo aver creato i 3 account in
-- auth.users (Luca, Anita, Chalika — Amelia non ha un account, come da §3).
-- Gli id qui sotto sono fissi e generati una tantum per questo progetto:
-- rieseguire lo script è idempotente grazie a ON CONFLICT DO NOTHING.
-- =============================================================================

-- Utenti applicativi, collegati agli account auth.users creati via Admin API.
insert into users (id, email, display_name) values
  ('cd758093-8c90-4358-ac0e-57ec3887cd24', 'luca@mealflow.family', 'Luca'),
  ('8f44c42d-1540-42a6-8155-5c21c8b7fee2', 'anita@mealflow.family', 'Anita'),
  ('8774c753-c196-488b-8f94-a5086083c4b4', 'chalika@mealflow.family', 'Chalika')
on conflict (id) do nothing;

-- Famiglia
insert into households (
  id, name, onboarding_completed_at, onboarding_step, shopping_day, week_starts_on,
  budget_level, max_prep_minutes_weekday, max_prep_minutes_weekend, chalika_cooking_days,
  variety_level, created_by
) values (
  '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'Famiglia', now(), 4, 'sabato', 'lunedi',
  'equilibrato', 30, 60, array['martedi','giovedi']::weekday[],
  'equilibrata', 'cd758093-8c90-4358-ac0e-57ec3887cd24'
) on conflict (id) do nothing;

-- Componenti della famiglia
insert into household_members (id, household_id, user_id, display_name, age_group, age, avatar_color) values
  ('b3525d9a-f6f6-4593-89eb-7fdf117037ac', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'cd758093-8c90-4358-ac0e-57ec3887cd24', 'Luca', 'adulto', 52, 'crimson'),
  ('c2a6968b-68ba-48ca-a0b3-08ebfc4eb3ad', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', '8f44c42d-1540-42a6-8155-5c21c8b7fee2', 'Anita', 'adulto', 44, 'maiolica'),
  ('c15d4715-b1f2-49f7-b7a4-3617249c4123', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', null, 'Amelia', 'bambino_6_10', 9, 'amber'),
  ('dba72349-f9f6-4fa4-a982-a7d3e6902f29', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', '8774c753-c196-488b-8f94-a5086083c4b4', 'Chalika', 'adulto', null, 'slate')
on conflict (id) do nothing;

-- Ruoli: Luca Owner/Approver, Anita Admin/Approver, Chalika Collaborator/Viewer
-- (permessi granulari come da §3: mai approvazione, mai allergie/ruoli).
insert into household_user_roles (
  id, household_id, user_id, role, operational_role,
  can_view_menu, can_view_recipes, can_view_operational_notes,
  can_update_shopping_list, can_mark_pantry_items, can_add_manual_items
) values
  ('4ef36df8-ed01-473a-a9cd-9073ff005746', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'cd758093-8c90-4358-ac0e-57ec3887cd24', 'owner', 'approver', true, true, true, true, true, true),
  ('d7c4e8a7-af8a-4b6d-9ba6-4a39f280da4d', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', '8f44c42d-1540-42a6-8155-5c21c8b7fee2', 'admin', 'approver', true, true, true, true, true, true),
  ('3b81f30b-0084-4c3c-9461-08f667255b79', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', '8774c753-c196-488b-8f94-a5086083c4b4', 'collaborator', 'viewer', true, true, true, true, true, true)
on conflict (id) do nothing;

-- Profili alimentari
insert into dietary_profiles (id, household_id, member_id, preferred_dishes, disliked_textures, family_notes, openness_to_new_dishes) values
  ('0bb50b45-3bde-42f3-977c-c81b05fcf434', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'b3525d9a-f6f6-4593-89eb-7fdf117037ac',
    array['Pasta e fagioli','Sgombro al forno con patate e olive'], '{}', null, 'media'),
  ('3d9043d0-391c-4409-a18e-b22ed179ab84', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'c2a6968b-68ba-48ca-a0b3-08ebfc4eb3ad',
    array['Cous cous di verdure e ceci'], '{}', null, 'alta'),
  ('db0f2b15-8b9d-4fa1-943b-2cecaf58adb7', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52', 'c15d4715-b1f2-49f7-b7a4-3617249c4123',
    array['Pasta con pomodorini e basilico'], array['verdure filacciose','pesce con lische'],
    'Preferisce porzioni più piccole e sapori delicati.', 'bassa')
on conflict (id) do nothing;

-- Intolleranze, esclusioni, dislike (nessuna allergia in famiglia).
insert into intolerances (id, dietary_profile_id, substance, notes) values
  ('3666b9b7-9490-47bd-ad4a-19e62d539ffb', '3d9043d0-391c-4409-a18e-b22ed179ab84', 'lattosio', 'lieve, tollera piccole quantità')
on conflict (id) do nothing;

insert into dietary_restrictions (id, dietary_profile_id, ingredient, reason) values
  ('a6e8908e-6d12-472a-85f0-d4c36a4f9534', '0bb50b45-3bde-42f3-977c-c81b05fcf434', 'frattaglie', 'non gradite')
on conflict (id) do nothing;

insert into dislikes (id, dietary_profile_id, ingredient_or_dish) values
  ('9b824193-7ba4-4464-b860-f8d3b048af1f', '0bb50b45-3bde-42f3-977c-c81b05fcf434', 'frattaglie'),
  ('b0fa1b59-28ad-4b81-9f6e-66850ad64f6c', 'db0f2b15-8b9d-4fa1-943b-2cecaf58adb7', 'cime di rapa')
on conflict (id) do nothing;

-- Preferenze di famiglia
insert into preferences (
  id, household_id, favorite_dishes, disliked_dishes, favorite_vegetables,
  favorite_fish, favorite_legumes, favorite_breakfasts
) values (
  '702b5231-7ea9-4fc0-ab85-9ea09369a784', '9aec0a24-3aba-4b33-8907-d0d5d6c68e52',
  array['Pasta e fagioli','Salmone al vapore con broccoli'],
  array['Fritture miste'],
  array['zucchine','pomodori','carote','broccoli'],
  array['merluzzo','salmone','sgombro'],
  array['ceci','lenticchie','fagioli borlotti'],
  array['Yogurt, frutta fresca e granola','Porridge d''avena con frutta secca']
) on conflict (id) do nothing;

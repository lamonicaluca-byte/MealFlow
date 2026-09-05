-- =============================================================================
-- MealFlow — Supabase Realtime (sincronizzazione multi-dispositivo)
-- =============================================================================
-- Aggiunge alla pubblicazione "supabase_realtime" le tabelle su cui i
-- dispositivi devono ricevere gli aggiornamenti fatti da altri membri della
-- famiglia (es. "Chalika ha segnato le zucchine come comprate" mentre Luca
-- ha la lista aperta su un altro telefono).
--
-- Postgres Changes applica automaticamente le stesse Row Level Security già
-- definite in 0002_rls.sql al momento della sottoscrizione: un client riceve
-- solo le righe delle famiglie di cui è effettivamente membro, esattamente
-- come per una query REST normale. Non serve alcuna policy aggiuntiva.
-- =============================================================================

alter publication supabase_realtime add table shopping_list_items;
alter publication supabase_realtime add table shopping_item_status_history;
alter publication supabase_realtime add table weekly_menus;
alter publication supabase_realtime add table household_notes;

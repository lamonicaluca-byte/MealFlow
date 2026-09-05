-- =============================================================================
-- MealFlow — source_meal_ids come text[], non uuid[]
-- =============================================================================
-- Il modello applicativo traccia la provenienza di un ingrediente aggregato
-- con chiavi simboliche "giorno|slot" (es. "martedi|cena"), non con i veri
-- UUID dei pasti: sono comode per raggruppare senza bisogno di un JOIN,
-- dato che un ingrediente aggregato può provenire da più pasti nella stessa
-- settimana. La colonna era stata dichiarata erroneamente uuid[].
-- =============================================================================

alter table shopping_list_items
  alter column source_meal_ids type text[] using source_meal_ids::text[];

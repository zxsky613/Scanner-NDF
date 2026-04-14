-- ÉTAPE A — À exécuter SEULE, dans l’éditeur SQL Supabase, puis bouton Run.
-- (Une nouvelle valeur d’enum ne peut pas être utilisée dans la même transaction que son ADD VALUE.)
-- Ensuite exécuter : add_crm_projects.sql

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';

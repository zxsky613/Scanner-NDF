-- Notifications projet → uniquement les comptes Finance.
-- À exécuter dans le SQL Editor Supabase après notifications.sql et la table projects.
-- Déclencheurs : création de projet, changement de statut.

CREATE OR REPLACE FUNCTION public.notify_on_project_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.created_by;
    INSERT INTO notifications (user_id, type, title, body, expense_id, metadata)
    SELECT
      p.id,
      'project_created',
      'Nouveau projet',
      COALESCE(creator_name, 'Responsable') || ' — ' || NEW.name,
      NULL,
      jsonb_build_object(
        'project_id', NEW.id::text,
        'project_name', NEW.name,
        'creator_name', COALESCE(creator_name, '')
      )
    FROM profiles p
    WHERE p.role = 'finance'
      AND (auth.uid() IS NULL OR p.id <> auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO notifications (user_id, type, title, body, expense_id, metadata)
      SELECT
        p.id,
        'project_status_changed',
        'Statut projet modifié',
        NEW.name || ' : ' || OLD.status::text || ' → ' || NEW.status::text,
        NULL,
        jsonb_build_object(
          'project_id', NEW.id::text,
          'project_name', NEW.name,
          'old_status', OLD.status::text,
          'new_status', NEW.status::text
        )
      FROM profiles p
      WHERE p.role = 'finance'
        AND (auth.uid() IS NULL OR p.id <> auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_projects_notify ON projects;
CREATE TRIGGER trigger_projects_notify
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_project_change();

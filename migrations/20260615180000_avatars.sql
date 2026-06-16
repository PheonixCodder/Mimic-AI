-- Avatars: system (global) and custom (workspace-scoped) avatar library

CREATE TABLE public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  variant TEXT NOT NULL CHECK (variant IN ('system', 'custom')),
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,
  r2_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  readiness_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT avatars_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT avatars_system_no_workspace CHECK (
    variant != 'system' OR workspace_id IS NULL
  ),
  CONSTRAINT avatars_custom_requires_workspace CHECK (
    variant != 'custom' OR workspace_id IS NOT NULL
  )
);

CREATE INDEX idx_avatars_variant ON public.avatars(variant);
CREATE INDEX idx_avatars_workspace_id ON public.avatars(workspace_id);
CREATE INDEX idx_avatars_name ON public.avatars(name);
CREATE INDEX idx_avatars_updated_at ON public.avatars(updated_at DESC);

CREATE TRIGGER avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY avatars_select ON public.avatars
  FOR SELECT TO authenticated
  USING (
    variant = 'system'
    OR public.is_workspace_member(workspace_id)
  );

CREATE POLICY avatars_custom_insert ON public.avatars
  FOR INSERT TO authenticated
  WITH CHECK (
    variant = 'custom'
    AND created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY avatars_custom_update ON public.avatars
  FOR UPDATE TO authenticated
  USING (
    variant = 'custom'
    AND public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    variant = 'custom'
    AND public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY avatars_custom_delete ON public.avatars
  FOR DELETE TO authenticated
  USING (
    variant = 'custom'
    AND public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avatars TO authenticated;

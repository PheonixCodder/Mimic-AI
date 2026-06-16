-- Voices: system (global) and custom (workspace-scoped) voice library

CREATE TABLE public.voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  variant TEXT NOT NULL CHECK (variant IN ('system', 'custom')),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en-US',
  r2_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT voices_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT voices_system_no_workspace CHECK (
    variant != 'system' OR workspace_id IS NULL
  ),
  CONSTRAINT voices_custom_requires_workspace CHECK (
    variant != 'custom' OR workspace_id IS NOT NULL
  )
);

CREATE INDEX idx_voices_variant ON public.voices(variant);
CREATE INDEX idx_voices_workspace_id ON public.voices(workspace_id);
CREATE INDEX idx_voices_name ON public.voices(name);
CREATE INDEX idx_voices_updated_at ON public.voices(updated_at DESC);

CREATE TRIGGER voices_updated_at
  BEFORE UPDATE ON public.voices
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY voices_select ON public.voices
  FOR SELECT TO authenticated
  USING (
    variant = 'system'
    OR public.is_workspace_member(workspace_id)
  );

CREATE POLICY voices_custom_insert ON public.voices
  FOR INSERT TO authenticated
  WITH CHECK (
    variant = 'custom'
    AND created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY voices_custom_update ON public.voices
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

CREATE POLICY voices_custom_delete ON public.voices
  FOR DELETE TO authenticated
  USING (
    variant = 'custom'
    AND public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voices TO authenticated;

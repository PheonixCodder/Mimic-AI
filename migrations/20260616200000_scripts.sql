-- Scripts: workspace-scoped script drafts for video productions

CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  character_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scripts_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT scripts_character_count_non_negative CHECK (character_count >= 0)
);

CREATE INDEX idx_scripts_workspace_id ON public.scripts(workspace_id);
CREATE INDEX idx_scripts_project_id ON public.scripts(project_id);
CREATE INDEX idx_scripts_updated_at ON public.scripts(updated_at DESC);

CREATE TRIGGER scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY scripts_member_select ON public.scripts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY scripts_member_insert ON public.scripts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY scripts_member_update ON public.scripts
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY scripts_member_delete ON public.scripts
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;

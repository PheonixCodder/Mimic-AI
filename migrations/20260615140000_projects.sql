-- Projects: workspace-scoped containers for videos, scripts, and assets

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_member_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY projects_member_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY projects_member_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY projects_member_delete ON public.projects
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

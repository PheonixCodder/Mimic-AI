-- Brand Kits: workspace-scoped branding configuration
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  logo_key TEXT,
  colors JSONB NOT NULL DEFAULT '{"primary": "#16A34A", "secondary": "#15803D", "background": "#F0FDF4", "text": "#166534"}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{"primary": "Inter", "header": "Outfit"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brand_kits_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_brand_kits_workspace_id ON public.brand_kits(workspace_id);
CREATE INDEX idx_brand_kits_updated_at ON public.brand_kits(updated_at DESC);

CREATE TRIGGER brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_kits_member_select ON public.brand_kits
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY brand_kits_member_insert ON public.brand_kits
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY brand_kits_member_update ON public.brand_kits
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY brand_kits_member_delete ON public.brand_kits
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;

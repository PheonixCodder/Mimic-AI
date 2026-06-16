-- Templates: reusable video layouts and configs
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  avatar_id UUID REFERENCES public.avatars(id) ON DELETE SET NULL,
  voice_id UUID REFERENCES public.voices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL DEFAULT '{"aspectRatio": "16:9", "avatarPosition": "center", "avatarSize": "medium", "subtitlesEnabled": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT templates_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_templates_workspace_id ON public.templates(workspace_id);
CREATE INDEX idx_templates_brand_kit_id ON public.templates(brand_kit_id);
CREATE INDEX idx_templates_avatar_id ON public.templates(avatar_id);
CREATE INDEX idx_templates_voice_id ON public.templates(voice_id);
CREATE INDEX idx_templates_updated_at ON public.templates(updated_at DESC);

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_member_select ON public.templates
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY templates_member_insert ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY templates_member_update ON public.templates
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY templates_member_delete ON public.templates
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;

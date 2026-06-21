CREATE TABLE public.digital_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL UNIQUE REFERENCES public.avatars(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  speaking_style TEXT NOT NULL DEFAULT 'conversational',
  tone TEXT NOT NULL DEFAULT 'professional',
  personality TEXT,
  vocabulary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digital_twins_avatar_id ON public.digital_twins(avatar_id);
CREATE INDEX idx_digital_twins_workspace_id ON public.digital_twins(workspace_id);

ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;

CREATE POLICY twin_member_select ON public.digital_twins
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY twin_member_insert ON public.digital_twins
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY twin_member_update ON public.digital_twins
  FOR UPDATE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY twin_member_delete ON public.digital_twins
  FOR DELETE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_twins TO authenticated;

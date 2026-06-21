CREATE TABLE public.model_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_model TEXT NOT NULL DEFAULT 'flux-schnell',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'training', 'ready', 'failed')),
  trigger_word TEXT,
  r2_weights_key TEXT,
  replicate_training_id TEXT,
  error_message TEXT,
  training_images_r2_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT model_variants_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_model_variants_workspace_id ON public.model_variants(workspace_id);

CREATE TRIGGER model_variants_updated_at BEFORE UPDATE ON public.model_variants
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.model_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY mv_member_select ON public.model_variants FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY mv_member_insert ON public.model_variants FOR INSERT TO authenticated WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY mv_member_update ON public.model_variants FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY mv_member_delete ON public.model_variants FOR DELETE TO authenticated USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_variants TO authenticated;

CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hypothesis TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed')),
  winner_variant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT experiments_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE public.experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experiments
  ADD CONSTRAINT experiments_winner_fk
  FOREIGN KEY (winner_variant_id) REFERENCES public.experiment_variants(id) ON DELETE SET NULL;

CREATE INDEX idx_experiments_workspace_id ON public.experiments(workspace_id);
CREATE INDEX idx_experiment_variants_experiment_id ON public.experiment_variants(experiment_id);

CREATE TRIGGER experiments_updated_at BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY experiments_member_select ON public.experiments FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY experiments_member_insert ON public.experiments FOR INSERT TO authenticated WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY experiments_member_update ON public.experiments FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY experiments_member_delete ON public.experiments FOR DELETE TO authenticated USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY variants_member_select ON public.experiment_variants FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY variants_member_insert ON public.experiment_variants FOR INSERT TO authenticated WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));
CREATE POLICY variants_member_delete ON public.experiment_variants FOR DELETE TO authenticated USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.experiment_variants TO authenticated;

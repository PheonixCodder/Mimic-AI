CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_api_keys_workspace_id ON public.api_keys(workspace_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_member_select ON public.api_keys
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

CREATE POLICY api_keys_admin_insert ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY api_keys_admin_delete ON public.api_keys
  FOR DELETE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin'));

GRANT SELECT, INSERT, DELETE ON public.api_keys TO authenticated;

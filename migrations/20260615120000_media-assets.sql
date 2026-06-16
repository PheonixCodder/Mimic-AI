-- Media assets: R2 object registry with workspace-scoped access

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('voice', 'avatar', 'video', 'preview', 'asset')),
  r2_object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  filename TEXT,
  byte_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_assets_workspace_id ON public.media_assets(workspace_id);
CREATE INDEX idx_media_assets_created_by ON public.media_assets(created_by);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);

CREATE TRIGGER media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_assets_member_select ON public.media_assets
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY media_assets_uploader_insert ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY media_assets_uploader_update ON public.media_assets
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      created_by = (SELECT auth.uid())
      OR public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (public.is_workspace_member(workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.media_assets TO authenticated;

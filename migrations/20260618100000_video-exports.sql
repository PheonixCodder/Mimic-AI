-- Video Exports: track resolution, format, and watermark configurations for rendered videos
CREATE TABLE public.video_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution TEXT NOT NULL CHECK (resolution IN ('720p', '1080p', '4k')),
  format TEXT NOT NULL CHECK (format IN ('mp4', 'webm')),
  watermark_enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  r2_object_key TEXT,
  r2_object_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_exports_video_id ON public.video_exports(video_id);
CREATE INDEX idx_video_exports_workspace_id ON public.video_exports(workspace_id);
CREATE INDEX idx_video_exports_status ON public.video_exports(status);
CREATE INDEX idx_video_exports_created_at ON public.video_exports(created_at DESC);

CREATE TRIGGER video_exports_updated_at
  BEFORE UPDATE ON public.video_exports
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.video_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_exports_member_select ON public.video_exports
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY video_exports_member_insert ON public.video_exports
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY video_exports_member_update ON public.video_exports
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY video_exports_member_delete ON public.video_exports
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_exports TO authenticated;

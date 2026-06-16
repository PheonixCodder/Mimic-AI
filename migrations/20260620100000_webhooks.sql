-- Webhooks migration
-- Create webhook_endpoints table
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  events TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook_deliveries table
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_headers JSONB,
  response_body TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_webhook_endpoints_workspace_id ON public.webhook_endpoints(workspace_id);
CREATE INDEX idx_webhook_endpoints_active ON public.webhook_endpoints(active);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON public.webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

-- Add updated_at trigger for webhook_endpoints
CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policies for webhook_endpoints
CREATE POLICY webhook_endpoints_member_select ON public.webhook_endpoints
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY webhook_endpoints_admin_insert ON public.webhook_endpoints
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY webhook_endpoints_admin_update ON public.webhook_endpoints
  FOR UPDATE TO authenticated
  USING (
    public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY webhook_endpoints_admin_delete ON public.webhook_endpoints
  FOR DELETE TO authenticated
  USING (
    public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
  );

-- Policies for webhook_deliveries (Members can select logs of their endpoints)
CREATE POLICY webhook_deliveries_member_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints e
      WHERE e.id = endpoint_id
        AND public.is_workspace_member(e.workspace_id)
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;

-- Create Agent Sessions (Threads)
CREATE TABLE public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_sessions_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX idx_agent_sessions_workspace_id ON public.agent_sessions(workspace_id);
CREATE INDEX idx_agent_sessions_created_by ON public.agent_sessions(created_by);
CREATE INDEX idx_agent_sessions_updated_at ON public.agent_sessions(updated_at DESC);

CREATE TRIGGER agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_member_select ON public.agent_sessions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY sessions_member_insert ON public.agent_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY sessions_member_update ON public.agent_sessions
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY sessions_member_delete ON public.agent_sessions
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.get_user_workspace_role(workspace_id) IN ('owner', 'admin')
      OR created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_sessions TO authenticated;


-- Create Agent Messages (Historical Audit/Fast Render)
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_messages_session_id ON public.agent_messages(session_id);
CREATE INDEX idx_agent_messages_created_at ON public.agent_messages(created_at ASC);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Note: Access control on messages is delegated via its session's workspace membership
CREATE POLICY messages_member_select ON public.agent_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_sessions s
      WHERE s.id = session_id AND public.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY messages_member_insert ON public.agent_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_sessions s
      WHERE s.id = session_id AND public.get_user_workspace_role(s.workspace_id) IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY messages_member_delete ON public.agent_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_sessions s
      WHERE s.id = session_id AND public.get_user_workspace_role(s.workspace_id) IN ('owner', 'admin', 'member')
    )
  );

GRANT SELECT, INSERT, DELETE ON public.agent_messages TO authenticated;


-- Create Agent Skills (Progressive Disclosure)
CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_skills_name_not_blank CHECK (length(trim(name)) > 0),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_agent_skills_workspace_id ON public.agent_skills(workspace_id);
CREATE INDEX idx_agent_skills_name ON public.agent_skills(name);

CREATE TRIGGER agent_skills_updated_at
  BEFORE UPDATE ON public.agent_skills
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY skills_member_select ON public.agent_skills
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY skills_member_insert ON public.agent_skills
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY skills_member_update ON public.agent_skills
  FOR UPDATE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY skills_member_delete ON public.agent_skills
  FOR DELETE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_skills TO authenticated;


-- Create Agent MCP Servers (Dynamic Adapter)
CREATE TABLE public.agent_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'stdio', 'http'
  enabled BOOLEAN DEFAULT true NOT NULL,
  command TEXT,
  args TEXT[],
  env JSONB,
  url TEXT,
  headers JSONB,
  requires_auth BOOLEAN DEFAULT false,
  auth_tokens JSONB,
  client_info JSONB,
  code_verifier TEXT,
  oauth_status VARCHAR(50) DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_mcp_servers_name_not_blank CHECK (length(trim(name)) > 0),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_agent_mcp_servers_workspace_id ON public.agent_mcp_servers(workspace_id);

CREATE TRIGGER agent_mcp_servers_updated_at
  BEFORE UPDATE ON public.agent_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.agent_mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_member_select ON public.agent_mcp_servers
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY mcp_member_insert ON public.agent_mcp_servers
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY mcp_member_update ON public.agent_mcp_servers
  FOR UPDATE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY mcp_member_delete ON public.agent_mcp_servers
  FOR DELETE TO authenticated
  USING (public.get_user_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_mcp_servers TO authenticated;

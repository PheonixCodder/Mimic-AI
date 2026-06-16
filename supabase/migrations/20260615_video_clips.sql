-- Item 27: Video Clips table for AI-generated clip assets
-- Run: npx insforge migration run --file supabase/migrations/20260615_video_clips.sql

create table if not exists public.video_clips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  project_id uuid references public.projects(id) on delete set null,
  title text not null default 'Untitled Clip',
  prompt text not null default '',
  style text not null default 'cinematic',
  duration_seconds integer not null default 5,
  aspect_ratio text not null default '16:9',
  resolution text not null default '1080p',
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'processing', 'completed', 'failed')),
  r2_object_key text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_clips_workspace_idx on public.video_clips(workspace_id);
create index if not exists video_clips_project_idx  on public.video_clips(project_id);
create index if not exists video_clips_status_idx   on public.video_clips(status);

alter table public.video_clips enable row level security;

create policy "workspace members can manage clips"
  on public.video_clips for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

create or replace function public.update_video_clips_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_clips_updated_at on public.video_clips;

create trigger video_clips_updated_at
  before update on public.video_clips
  for each row execute procedure public.update_video_clips_updated_at();

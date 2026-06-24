alter table videos add column if not exists estimated_cost jsonb;
alter table jobs add column if not exists estimated_cost jsonb;

comment on column videos.estimated_cost is 'Line-item cost estimate generated before approval.';
comment on column jobs.estimated_cost is 'Line-item cost estimate copied from the video at job creation.';

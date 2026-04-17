-- Per-request Slack channel routing
alter table public.menu_items add column slack_channel text;

-- Default Slack channel for the workspace (fallback)
alter table public.venues add column default_slack_channel text;

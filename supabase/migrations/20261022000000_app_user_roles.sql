-- Application authorization: elevated roles of authenticated users.
-- Apply with the Supabase CLI: supabase db push.
--
-- Authentication is Supabase Auth: every authenticated user is implicitly a
-- normal "user", which is never stored. This table holds only the elevated
-- roles, and apps/api is the only authority that reads it: the browser never
-- sees it, and a role sent by a client is never trusted.
--
-- Internal workers and services use backend credentials (service_role); they
-- are not application users and have no rows here.
--
-- The first admin is granted by hand in the SQL Editor; there is no endpoint
-- that grants roles:
--   insert into public.app_user_roles (user_id, role, note)
--   select id, 'admin', 'bootstrap' from auth.users where email = '<email>';

-- Current elevated-role state. Granting is an insert, revoking a delete;
-- every change is recorded in app_user_role_events.
create table public.app_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now(),
  -- The admin who granted it; null when granted outside the app (bootstrap).
  granted_by uuid references auth.users(id) on delete set null,
  note text,
  primary key (user_id, role)
);

-- Append-only history of grants and revocations. user_id and actor_id have
-- no foreign key on purpose: the history outlives a deleted user.
create table public.app_user_role_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  role text not null,
  action text not null check (action in ('granted', 'revoked')),
  -- The admin who acted, when the change came through the app.
  actor_id uuid,
  -- The database session that made the change (for example postgres from
  -- the SQL Editor, or authenticator for apps/api through PostgREST).
  db_role text not null,
  note text,
  occurred_at timestamptz not null default now()
);

create index app_user_role_events_user_idx
  on public.app_user_role_events(user_id, occurred_at);

-- Records every grant and revocation, including a revocation caused by the
-- user's deletion (the cascade fires this trigger too). security definer:
-- that cascade may run as Auth's own database role, which has no access to
-- the events table, and deleting a user must not fail on the audit.
-- db_role still records current_user, the role that made the change.
create function public.app_user_roles_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Inside security definer, current_user is the owner; session_user is who
  -- connected.
  if tg_op = 'INSERT' then
    insert into public.app_user_role_events (user_id, role, action, actor_id, db_role, note)
    values (new.user_id, new.role, 'granted', new.granted_by, session_user, new.note);
    return new;
  end if;
  insert into public.app_user_role_events (user_id, role, action, db_role)
  values (old.user_id, old.role, 'revoked', session_user);
  return old;
end;
$$;

create trigger app_user_roles_audit
  after insert or delete on public.app_user_roles
  for each row execute function public.app_user_roles_audit();

-- A role is granted or revoked, never edited: an update would change what
-- the history says was granted.
create function public.app_user_roles_no_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'app_user_roles rows are never updated; revoke and grant instead';
end;
$$;

create trigger app_user_roles_no_update
  before update on public.app_user_roles
  for each row execute function public.app_user_roles_no_update();

-- reference_append_only() is defined with the reference-data tables.
create trigger app_user_role_events_append_only
  before update or delete on public.app_user_role_events
  for each row execute function public.reference_append_only();

-- Backend only: RLS on, no policies, and no table access for browser roles.
alter table public.app_user_roles enable row level security;
alter table public.app_user_role_events enable row level security;

revoke all on public.app_user_roles from anon, authenticated;
revoke all on public.app_user_role_events from anon, authenticated;

revoke execute on function public.app_user_roles_audit() from public, anon, authenticated;
revoke execute on function public.app_user_roles_no_update() from public, anon, authenticated;

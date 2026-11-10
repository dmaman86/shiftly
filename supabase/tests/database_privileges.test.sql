-- Browser roles (anon, authenticated) reach no table or function in public
-- except the ones listed here. Supabase grants every new table and function
-- to them by default, so a migration that forgets its revoke fails here.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Known exceptions while the web app still reads and writes user data
-- directly. The revocation PR empties this list.
create temp table browser_table_exceptions (table_name text) on commit drop;
insert into browser_table_exceptions
values ('monthly_configs'), ('work_days'), ('shifts');

create temp table browser_function_exceptions (function_name text) on commit drop;
insert into browser_function_exceptions values ('import_guest_month');

select is_empty(
  $$
    select c.relname, r.rolname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) as r(rolname)
     where n.nspname = 'public'
       and c.relkind in ('r', 'v', 'm', 'p')
       and c.relname not in (select table_name from browser_table_exceptions)
       and (
         has_table_privilege(r.rolname, c.oid, 'select')
         or has_table_privilege(r.rolname, c.oid, 'insert')
         or has_table_privilege(r.rolname, c.oid, 'update')
         or has_table_privilege(r.rolname, c.oid, 'delete')
         or has_table_privilege(r.rolname, c.oid, 'truncate')
       )
  $$,
  'browser roles have no privilege on any other public table'
);

-- Trigger functions are skipped: Postgres refuses to call them directly.
select is_empty(
  $$
    select p.proname, r.rolname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     cross join (values ('anon'), ('authenticated')) as r(rolname)
     where n.nspname = 'public'
       and p.prorettype <> 'trigger'::regtype
       and p.proname not in (select function_name from browser_function_exceptions)
       and has_function_privilege(r.rolname, p.oid, 'execute')
  $$,
  'browser roles cannot execute any other public function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.import_guest_month(integer, integer, numeric, numeric, jsonb, jsonb)',
    'execute'
  ),
  'anon cannot import a guest month'
);

select is_empty(
  $$
    select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype <> 'trigger'::regtype
       and (p.proacl is null or exists (
         select 1 from aclexplode(p.proacl) a
          where a.grantee = 0 and a.privilege_type = 'EXECUTE'
       ))
  $$,
  'no public function is executable by PUBLIC'
);

select is_empty(
  $$
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and not c.relrowsecurity
  $$,
  'every public table has row level security enabled'
);

select * from finish();
rollback;

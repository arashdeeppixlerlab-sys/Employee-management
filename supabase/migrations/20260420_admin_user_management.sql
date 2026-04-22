-- Admin user management foundation:
-- - block/unblock state on profiles
-- - admin helper function for RLS
-- - profile policies
-- - optional action audit log
-- - auth.users -> profiles bootstrap trigger

alter table if exists public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists deleted_at timestamptz;

create table if not exists public.admin_user_actions (
  id bigserial primary key,
  action text not null check (action in ('create_user', 'block_user', 'unblock_user', 'delete_user')),
  target_user_id uuid not null,
  performed_by uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_user_actions_target_user
  on public.admin_user_actions(target_user_id);

create index if not exists idx_admin_user_actions_performed_by
  on public.admin_user_actions(performed_by);

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

alter table if exists public.profiles enable row level security;

drop policy if exists "employee_profile_select_own" on public.profiles;
create policy "employee_profile_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "employee_profile_update_own" on public.profiles;
create policy "employee_profile_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admin_profile_full_access" on public.profiles;
create policy "admin_profile_full_access"
on public.profiles
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'employee'),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      role = excluded.role,
      name = excluded.name;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created_profile'
  ) then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row execute procedure public.handle_new_user_profile();
  end if;
end;
$$;

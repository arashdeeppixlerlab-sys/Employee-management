alter table if exists public.profiles
  add column if not exists email_notifications boolean not null default true,
  add column if not exists push_notifications boolean not null default true,
  add column if not exists language text not null default 'English',
  add column if not exists timezone text not null default 'UTC+05:30';

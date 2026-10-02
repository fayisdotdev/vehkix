create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,32}$')
);

alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

grant select on public.profiles to authenticated;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists profiles_read_admin on public.profiles;
create policy profiles_read_admin
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := btrim(new.raw_user_meta_data ->> 'username');

  if requested_username is null or requested_username !~ '^[A-Za-z0-9_]{3,32}$' then
    raise exception 'Username must contain 3 to 32 letters, numbers, or underscores';
  end if;

  insert into public.profiles (id, username, email)
  values (new.id, requested_username, new.email)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_number text,
  name text,
  model text,
  company text,
  year integer,
  taken_date date,
  last_service_date date,
  last_service_km integer,
  next_service_date date,
  next_service_km integer,
  last_pucc_date date,
  next_pucc_date date,
  insurance_taken_date date,
  insurance_next_renewal_date date,
  uploaded_by text,
  uploaded_date date not null default current_date,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.user_vehicles
  add column if not exists rc_owner_name text,
  add column if not exists chassis_no text,
  add column if not exists engine_no text,
  add column if not exists tax_valid_upto date,
  add column if not exists registration_validity date,
  add column if not exists primary_image text;

create index if not exists user_vehicles_user_created_idx
  on public.user_vehicles (user_id, created_at desc);

alter table public.user_vehicles enable row level security;

drop policy if exists user_vehicles_read_own on public.user_vehicles;
create policy user_vehicles_read_own
  on public.user_vehicles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_vehicles_read_admin on public.user_vehicles;
create policy user_vehicles_read_admin
  on public.user_vehicles
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists user_vehicles_insert_own on public.user_vehicles;
create policy user_vehicles_insert_own
  on public.user_vehicles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_vehicles_update_own on public.user_vehicles;
create policy user_vehicles_update_own
  on public.user_vehicles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_vehicles_update_admin on public.user_vehicles;
create policy user_vehicles_update_admin
  on public.user_vehicles
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists user_vehicles_delete_own on public.user_vehicles;
create policy user_vehicles_delete_own
  on public.user_vehicles
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_vehicles_delete_admin on public.user_vehicles;
create policy user_vehicles_delete_admin
  on public.user_vehicles
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.user_vehicles to authenticated;create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,32}$')
);

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

grant select on public.profiles to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := btrim(new.raw_user_meta_data ->> 'username');

  if requested_username is null or requested_username !~ '^[A-Za-z0-9_]{3,32}$' then
    raise exception 'Username must contain 3 to 32 letters, numbers, or underscores';
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_number text,
  name text,
  model text,
  company text,
  year integer,
  taken_date date,
  last_service_date date,
  last_service_km integer,
  next_service_date date,
  next_service_km integer,
  last_pucc_date date,
  next_pucc_date date,
  insurance_taken_date date,
  insurance_next_renewal_date date,
  uploaded_by text,
  uploaded_date date not null default current_date,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.user_vehicles enable row level security;

drop policy if exists user_vehicles_read_own on public.user_vehicles;
create policy user_vehicles_read_own
  on public.user_vehicles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_vehicles_insert_own on public.user_vehicles;
create policy user_vehicles_insert_own
  on public.user_vehicles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_vehicles_update_own on public.user_vehicles;
create policy user_vehicles_update_own
  on public.user_vehicles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_vehicles_delete_own on public.user_vehicles;
create policy user_vehicles_delete_own
  on public.user_vehicles
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_vehicles to authenticated;

create table if not exists public.vehicle_field_visibility (
  field_key text primary key,
  show_in_form boolean not null default true,
  show_in_details boolean not null default true,
  allow_share boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint vehicle_field_visibility_key check (field_key in (
    'vehicle_title', 'vehicle_number', 'company', 'model', 'year', 'taken_date',
    'last_service_date', 'last_service_km', 'next_service_date', 'next_service_km',
    'next_pucc_date', 'insurance_next_renewal_date', 'tax_valid_upto',
    'registration_validity', 'last_pucc_date', 'insurance_taken_date',
    'rc_owner_name', 'chassis_no', 'engine_no', 'images', 'owner_username', 'id', 'uploaded_by', 'uploaded_date'
  ))
);

insert into public.vehicle_field_visibility (field_key, show_in_form, show_in_details, allow_share)
values
  ('vehicle_title', false, true, true),
  ('vehicle_number', true, true, true),
  ('company', true, true, true),
  ('model', true, true, true),
  ('year', true, true, true),
  ('taken_date', false, false, false),
  ('last_service_date', true, true, true),
  ('last_service_km', true, true, true),
  ('next_service_date', true, true, true),
  ('next_service_km', true, true, true),
  ('next_pucc_date', true, true, true),
  ('insurance_next_renewal_date', true, true, true),
  ('tax_valid_upto', true, true, true),
  ('registration_validity', true, true, true),
  ('last_pucc_date', true, true, true),
  ('insurance_taken_date', true, true, true),
  ('rc_owner_name', true, true, true),
  ('chassis_no', true, true, true),
  ('engine_no', true, true, true),
  ('images', true, true, true),
  ('owner_username', false, true, true),
  ('id', false, false, false),
  ('uploaded_by', false, false, false),
  ('uploaded_date', false, false, false)
on conflict (field_key) do nothing;

alter table public.vehicle_field_visibility enable row level security;
drop policy if exists vehicle_field_visibility_read on public.vehicle_field_visibility;
create policy vehicle_field_visibility_read
  on public.vehicle_field_visibility for select to authenticated using (true);
drop policy if exists vehicle_field_visibility_update_admin on public.vehicle_field_visibility;
create policy vehicle_field_visibility_update_admin
  on public.vehicle_field_visibility for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
grant select, update on public.vehicle_field_visibility to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'vehicle_field_visibility'
    ) then
    alter publication supabase_realtime add table public.vehicle_field_visibility;
  end if;
end;
$$;

create table if not exists public.user_vehicle_share_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  share_field_keys text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_vehicle_share_preferences enable row level security;
drop policy if exists user_vehicle_share_preferences_read_own on public.user_vehicle_share_preferences;
create policy user_vehicle_share_preferences_read_own
  on public.user_vehicle_share_preferences for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists user_vehicle_share_preferences_insert_own on public.user_vehicle_share_preferences;
create policy user_vehicle_share_preferences_insert_own
  on public.user_vehicle_share_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists user_vehicle_share_preferences_update_own on public.user_vehicle_share_preferences;
create policy user_vehicle_share_preferences_update_own
  on public.user_vehicle_share_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update on public.user_vehicle_share_preferences to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-vehicle-images',
  'user-vehicle-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists user_vehicle_images_read_own on storage.objects;
create policy user_vehicle_images_read_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-vehicle-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

drop policy if exists user_vehicle_images_upload_own on storage.objects;
create policy user_vehicle_images_upload_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-vehicle-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

drop policy if exists user_vehicle_images_delete_own on storage.objects;
create policy user_vehicle_images_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-vehicle-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

-- After creating an account, promote it manually in the SQL Editor:
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email) = lower('admin@example.com')
-- on conflict (user_id) do nothing;
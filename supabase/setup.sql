-- ============================================================
-- DROP EXISTING TABLE
-- ============================================================

drop table if exists public.vehicles;


-- ============================================================
-- CREATE VEHICLES TABLE
-- ALL FIELDS EXCEPT ID ARE OPTIONAL
-- ============================================================

create table public.vehicles (
  id text primary key,

  vehicle_number text,

  name text,
  model text,
  company text,
  year integer,
  taken_date date,

  -- Service
  last_service_date date,
  last_service_km integer,
  next_service_date date,
  next_service_km integer,

  -- PUCC
  last_pucc_date date,
  next_pucc_date date,

  -- Insurance
  insurance_taken_date date,
  insurance_next_renewal_date date,

  -- Upload information
  uploaded_by text,
  uploaded_date date,

  -- Vehicle images
  images text[]
);


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.vehicles enable row level security;


-- ============================================================
-- REMOVE OLD POLICY IF IT EXISTS
-- ============================================================

drop policy if exists vehicles_read_public
on public.vehicles;


-- ============================================================
-- PUBLIC READ POLICY
-- ============================================================

create policy vehicles_read_public
on public.vehicles
for select
to anon, authenticated
using (true);


-- ============================================================
-- GRANT READ ACCESS
-- ============================================================

grant select
on public.vehicles
to anon, authenticated;


-- ============================================================
-- INSERT DEMO / FAKE DATA
-- ============================================================

-- insert into public.vehicles (
--   id,
--   vehicle_number,
--   name,
--   model,
--   company,
--   year,
--   taken_date,
--   last_service_date,
--   last_service_km,
--   next_service_date,
--   next_service_km,
--   last_pucc_date,
--   next_pucc_date,
--   insurance_taken_date,
--   insurance_next_renewal_date,
--   uploaded_by,
--   uploaded_date,
--   images
-- )

-- values

-- (
--   'VH001',
--   'KL-07-AB-4821',
--   'City Cruiser',
--   'Swift VXi',
--   'Maruti Suzuki',
--   2022,
--   '2024-06-15',
--   '2026-07-10',
--   42500,
--   '2026-12-10',
--   47500,
--   '2026-05-20',
--   '2027-05-19',
--   '2026-03-15',
--   '2027-03-14',
--   'demo_user',
--   '2026-09-30',
--   ARRAY[
--     'https://example.com/vehicles/VH001/front.jpg',
--     'https://example.com/vehicles/VH001/side.jpg'
--   ]
-- ),

-- (
--   'VH002',
--   'KL-11-CD-7394',
--   'Road Beast',
--   'Creta SX',
--   'Hyundai',
--   2023,
--   '2025-01-20',
--   '2026-08-05',
--   28750,
--   '2027-02-05',
--   33750,
--   '2026-06-12',
--   '2027-06-11',
--   '2026-01-20',
--   '2027-01-19',
--   'demo_admin',
--   '2026-09-28',
--   ARRAY[
--     'https://example.com/vehicles/VH002/front.jpg',
--     'https://example.com/vehicles/VH002/interior.jpg'
--   ]
-- ),

-- (
--   'VH003',
--   'KL-13-EF-2168',
--   'Night Runner',
--   'City ZX',
--   'Honda',
--   2021,
--   '2023-11-08',
--   '2026-06-18',
--   61200,
--   '2026-12-18',
--   66200,
--   '2026-04-25',
--   '2027-04-24',
--   '2026-02-10',
--   '2027-02-09',
--   'demo_manager',
--   '2026-09-25',
--   ARRAY[
--     'https://example.com/vehicles/VH003/front.jpg',
--     'https://example.com/vehicles/VH003/rear.jpg',
--     'https://example.com/vehicles/VH003/dashboard.jpg'
--   ]
-- ),

-- (
--   'VH004',
--   'KL-08-GH-9057',
--   'Mountain King',
--   'Thar LX',
--   'Mahindra',
--   2024,
--   '2024-12-02',
--   '2026-08-22',
--   18400,
--   '2027-02-22',
--   23400,
--   '2026-07-01',
--   '2027-06-30',
--   '2025-01-05',
--   '2027-01-04',
--   'demo_user',
--   '2026-09-22',
--   ARRAY[
--     'https://example.com/vehicles/VH004/front.jpg',
--     'https://example.com/vehicles/VH004/side.jpg'
--   ]
-- ),

-- (
--   'VH005',
--   'KL-15-JK-6342',
--   'Urban Falcon',
--   'Nexon XZ+',
--   'Tata Motors',
--   2022,
--   '2024-03-18',
--   '2026-07-28',
--   38900,
--   '2027-01-28',
--   43900,
--   '2026-05-08',
--   '2027-05-07',
--   '2026-03-18',
--   '2027-03-17',
--   'demo_garage',
--   '2026-09-18',
--   ARRAY[
--     'https://example.com/vehicles/VH005/front.jpg',
--     'https://example.com/vehicles/VH005/interior.jpg'
--   ]
-- ),

-- (
--   'VH006',
--   'KL-05-LM-8173',
--   'Silver Arrow',
--   'Verna SX',
--   'Hyundai',
--   2023,
--   '2024-08-25',
--   '2026-08-15',
--   32100,
--   '2027-02-15',
--   37100,
--   '2026-06-30',
--   '2027-06-29',
--   '2026-04-01',
--   '2027-03-31',
--   'demo_user',
--   '2026-09-15',
--   ARRAY[
--     'https://example.com/vehicles/VH006/front.jpg',
--     'https://example.com/vehicles/VH006/side.jpg',
--     'https://example.com/vehicles/VH006/rear.jpg'
--   ]
-- );
-- Create cases table
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  code int not null,
  title text not null,
  place text,
  description text,
  crime_type text not null,
  date date,
  hour time,
  status text,
  latitude double precision,
  longitude double precision,
  suspect text,
  victim text,
  cuadrante int,
  sector int,
  escape_route text,
  suspect_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create media table
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  type text,
  url text not null,
  filename text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_cases_created_at on public.cases(created_at desc);
create index if not exists idx_media_case_id on public.media(case_id);

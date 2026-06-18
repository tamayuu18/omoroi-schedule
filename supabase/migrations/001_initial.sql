-- 担当者テーブル
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  google_access_token text,
  google_refresh_token text,
  google_token_expiry timestamptz,
  google_calendar_id text default 'primary',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 予約ページ設定
create table if not exists booking_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  duration_minutes int default 30,
  buffer_minutes int default 15,
  max_days_ahead int default 30,
  available_start_hour int default 9,
  available_end_hour int default 18,
  available_days int[] default '{1,2,3,4,5}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 予約ページ ↔ 担当者 (many-to-many)
create table if not exists booking_page_staff (
  booking_page_id uuid references booking_pages(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  primary key (booking_page_id, staff_id)
);

-- CRM 求職者テーブル（既存CRMと共有）
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  status text default 'new',
  notes text,
  source text default 'booking',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 予約テーブル
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_page_id uuid references booking_pages(id),
  staff_id uuid references staff(id),
  contact_id uuid references contacts(id),
  candidate_name text not null,
  candidate_email text not null,
  candidate_phone text,
  candidate_note text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  google_event_id text,
  google_meet_link text,
  status text default 'confirmed',
  created_at timestamptz default now()
);

-- RLS 有効化
alter table staff enable row level security;
alter table booking_pages enable row level security;
alter table booking_page_staff enable row level security;
alter table bookings enable row level security;
alter table contacts enable row level security;

-- サービスロールに全アクセス許可
create policy "service full access staff" on staff for all using (true);
create policy "service full access booking_pages" on booking_pages for all using (true);
create policy "service full access booking_page_staff" on booking_page_staff for all using (true);
create policy "service full access bookings" on bookings for all using (true);
create policy "service full access contacts" on contacts for all using (true);

-- contacts の updated_at 自動更新
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

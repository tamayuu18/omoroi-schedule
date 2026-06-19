create table if not exists contact_activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  activity_type text not null default 'booking',
  title text not null,
  description text,
  booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz default now()
);
alter table contact_activities enable row level security;
create policy "service role full access on contact_activities" on contact_activities for all using (true);

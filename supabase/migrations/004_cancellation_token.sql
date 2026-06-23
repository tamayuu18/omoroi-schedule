-- 予約者本人がキャンセルするための認証用トークン
alter table bookings add column if not exists cancellation_token uuid default gen_random_uuid();

-- 既存予約にトークンを付与
update bookings set cancellation_token = gen_random_uuid() where cancellation_token is null;

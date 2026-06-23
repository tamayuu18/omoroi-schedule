-- 予約受付の最小リードタイム（時間）。
-- 「今から min_notice_hours 時間後」以降のスロットのみ予約可能にする。
-- デフォルトは 24 時間（＝24時間後以降のみ予約可）。
alter table booking_pages
  add column if not exists min_notice_hours int default 24;

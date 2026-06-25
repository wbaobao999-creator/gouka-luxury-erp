create extension if not exists pgcrypto;

alter table public.items add column if not exists product_no text;
alter table public.items add column if not exists purchase_date date;
alter table public.items add column if not exists category text;
alter table public.items add column if not exists brand text;
alter table public.items add column if not exists item text;
alter table public.items add column if not exists title text;
alter table public.items add column if not exists material text;
alter table public.items add column if not exists color text;
alter table public.items add column if not exists origin text;
alter table public.items add column if not exists qty integer default 1;
alter table public.items add column if not exists purchase_currency text;
alter table public.items add column if not exists purchase_amount numeric(18,2);
alter table public.items add column if not exists purchase_rate numeric(18,6);
alter table public.items add column if not exists declared_currency text;
alter table public.items add column if not exists declared_amount numeric(18,2);
alter table public.items add column if not exists declared_rate numeric(18,6);
alter table public.items add column if not exists expected_sale_jpy numeric(18,2);
alter table public.items add column if not exists shipping_jpy numeric default 0;
alter table public.items add column if not exists duty_jpy numeric default 0;
alter table public.items add column if not exists customs_fee_jpy numeric default 0;
alter table public.items add column if not exists platform_fee_jpy numeric default 0;
alter table public.items add column if not exists other_cost_jpy numeric default 0;
alter table public.items add column if not exists supplier text;
alter table public.items add column if not exists supplier_address text;
alter table public.items add column if not exists id_check text;
alter table public.items add column if not exists customs_batch text;
alter table public.items add column if not exists platform text;
alter table public.items add column if not exists status text;
alter table public.items add column if not exists memo text;
alter table public.items add column if not exists sold_date date;
alter table public.items add column if not exists sold_platform text;
alter table public.items add column if not exists sold_price_jpy numeric default 0;
alter table public.items add column if not exists sold_memo text;
alter table public.items add column if not exists ledger_status text default 'valid';
alter table public.items add column if not exists ledger_void_reason text;
alter table public.items add column if not exists created_at timestamptz default now();
alter table public.items add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'items'
      and indexname = 'items_product_no_unique_idx'
  ) then
    create unique index items_product_no_unique_idx on public.items(product_no);
  end if;
end $$;

alter table public.items disable row level security;
alter table public.item_images disable row level security;
alter table public.suppliers disable row level security;
alter table public.customs_batches disable row level security;
alter table public.sales disable row level security;
alter table public.dictionaries disable row level security;
alter table public.operation_logs disable row level security;

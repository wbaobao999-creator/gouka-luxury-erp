-- GOUKA ERP V7.20 Cloud 需要的补充字段与 Storage 权限

alter table public.items add column if not exists source text;
alter table public.items add column if not exists supplier_address text;
alter table public.items add column if not exists id_check text;
alter table public.items add column if not exists customs_batch_text text;
alter table public.items add column if not exists sold_date date;
alter table public.items add column if not exists sold_platform text;
alter table public.items add column if not exists sold_price_jpy numeric default 0;
alter table public.items add column if not exists sold_memo text;
alter table public.items add column if not exists ledger_status text default '有效';
alter table public.items add column if not exists ledger_void_reason text;

-- 先为了快速跑通：允许 anon 对核心表读写。上线后再收紧 RLS/登录权限。
alter table public.items disable row level security;
alter table public.item_images disable row level security;
alter table public.suppliers disable row level security;
alter table public.customs_batches disable row level security;
alter table public.sales disable row level security;
alter table public.dictionaries disable row level security;
alter table public.operation_logs disable row level security;

-- Storage 公共读写策略。若已存在同名策略会报错，可以忽略或先删除同名策略。
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gouka_product_images_read') then
    create policy gouka_product_images_read on storage.objects for select to anon using (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gouka_product_images_insert') then
    create policy gouka_product_images_insert on storage.objects for insert to anon with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gouka_product_images_update') then
    create policy gouka_product_images_update on storage.objects for update to anon using (bucket_id = 'product-images') with check (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='gouka_product_images_delete') then
    create policy gouka_product_images_delete on storage.objects for delete to anon using (bucket_id = 'product-images');
  end if;
end $$;

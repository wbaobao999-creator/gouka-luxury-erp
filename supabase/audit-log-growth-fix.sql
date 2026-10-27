-- Future audit rows only. Existing history and business data are untouched.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create or replace function erp_access.audit_document(document jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb := document - 'updated_at'; payload jsonb;
begin
  if document ->> 'product_no' = '__GOUKA_ERP_GLOBAL_STATE__'
     and left(document ->> 'memo', length('__GOUKA_ERP_GLOBAL_STATE_JSON__')) = '__GOUKA_ERP_GLOBAL_STATE_JSON__' then
    begin
      payload := substring(document ->> 'memo' from length('__GOUKA_ERP_GLOBAL_STATE_JSON__') + 1)::jsonb;
      if jsonb_typeof(payload) = 'object' then
        result := jsonb_set(result, '{memo}', payload - 'savedAt');
      end if;
    exception when invalid_text_representation then
      -- Malformed legacy metadata is still audited as text.
      null;
    end;
  end if;
  return result;
end $$;

create or replace function erp_access.audit_value(value jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare bytes integer := octet_length(value::text);
begin
  if bytes > 4096 or (jsonb_typeof(value) = 'string' and left(value #>> '{}', 5) = 'data:') then
    return jsonb_build_object('_audit_summary', true, 'type', jsonb_typeof(value),
      'bytes', bytes, 'md5', md5(value::text));
  end if;
  return value;
end $$;

-- Stop no-op updates before PostgreSQL rewrites large TOAST values or emits WAL.
create or replace function erp_access.skip_unchanged_item_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if erp_access.audit_document(to_jsonb(old)) is not distinct from erp_access.audit_document(to_jsonb(new)) then
    return null;
  end if;
  return new;
end $$;

create or replace trigger erp_skip_unchanged_item_write before update on public.items
  for each row execute function erp_access.skip_unchanged_item_write();

create or replace function erp_access.audit_changes(previous jsonb, current_doc jsonb, path text[] default '{}')
returns setof jsonb language plpgsql immutable set search_path = '' as $$
declare key text; idx integer; count_items integer;
begin
  if previous is not distinct from current_doc then return; end if;
  if cardinality(path) < 32 and jsonb_typeof(previous) = 'object' and jsonb_typeof(current_doc) = 'object' then
    for key in select jsonb_object_keys(previous) union select jsonb_object_keys(current_doc) loop
      return query select * from erp_access.audit_changes(previous -> key, current_doc -> key, path || key);
    end loop;
  elsif cardinality(path) < 32 and jsonb_typeof(previous) = 'array' and jsonb_typeof(current_doc) = 'array' then
    count_items := greatest(jsonb_array_length(previous), jsonb_array_length(current_doc));
    for idx in 0..count_items - 1 loop
      return query select * from erp_access.audit_changes(previous -> idx, current_doc -> idx, path || idx::text);
    end loop;
  else
    return next jsonb_build_object('path', path,
      'before_exists', previous is not null, 'after_exists', current_doc is not null,
      'before', erp_access.audit_value(previous), 'after', erp_access.audit_value(current_doc));
  end if;
end $$;

create or replace function erp_access.record_item_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb; current_doc jsonb; delta jsonb; before_record jsonb; after_record jsonb;
begin
  if TG_OP <> 'INSERT' then previous := erp_access.audit_document(to_jsonb(old)); end if;
  if TG_OP <> 'DELETE' then current_doc := erp_access.audit_document(to_jsonb(new)); end if;
  if TG_OP = 'UPDATE' and previous is not distinct from current_doc then return new; end if;

  select coalesce(jsonb_agg(change), '[]'::jsonb) into delta
    from erp_access.audit_changes(previous, current_doc) change;
  select jsonb_build_object('format', 'delta_v2', 'changes', jsonb_agg(jsonb_build_object(
      'path', change -> 'path', 'exists', change -> 'before_exists', 'value', change -> 'before'))),
    jsonb_build_object('format', 'delta_v2', 'changes', jsonb_agg(jsonb_build_object(
      'path', change -> 'path', 'exists', change -> 'after_exists', 'value', change -> 'after')))
    into before_record, after_record from jsonb_array_elements(delta) change;

  -- Large bulk edits retain a fingerprint and change count, never duplicate files.
  if octet_length(before_record::text) + octet_length(after_record::text) > 65536 then
    before_record := jsonb_build_object('format', 'summary_v2', 'changes', jsonb_array_length(delta),
      'bytes', octet_length(previous::text), 'md5', md5(previous::text));
    after_record := jsonb_build_object('format', 'summary_v2', 'changes', jsonb_array_length(delta),
      'bytes', octet_length(current_doc::text), 'md5', md5(current_doc::text));
  end if;
  insert into public.erp_audit_log(actor_id, operation, product_no, before_data, after_data)
    values(auth.uid(), TG_OP, case when TG_OP = 'DELETE' then old.product_no else new.product_no end,
      case when TG_OP <> 'INSERT' then before_record end,
      case when TG_OP <> 'DELETE' then after_record end);
  if TG_OP = 'DELETE' then return old; else return new; end if;
end $$;

alter function erp_access.audit_document(jsonb) owner to postgres;
alter function erp_access.audit_value(jsonb) owner to postgres;
alter function erp_access.skip_unchanged_item_write() owner to postgres;
alter function erp_access.audit_changes(jsonb,jsonb,text[]) owner to postgres;
alter function erp_access.record_item_change() owner to postgres;
revoke all on function erp_access.audit_document(jsonb), erp_access.audit_value(jsonb),
  erp_access.audit_changes(jsonb,jsonb,text[]), erp_access.skip_unchanged_item_write(),
  erp_access.record_item_change() from public, anon, authenticated;
commit;

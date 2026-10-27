export const AUDIT_MARKER = '"__GOUKA_AUDIT_ARCHIVE_47f7f164_20261028__"';

export function snapshotCte(cutoff, id = null, side = null) {
  if (!Number.isSafeInteger(cutoff) || cutoff < 1 ||
      (id !== null && (!Number.isSafeInteger(id) || id < 1)) ||
      (side !== null && !['before','after'].includes(side))) throw new Error('Invalid snapshot bounds');
  return `with snapshots as (
    select l.id, s.side, s.value from public.erp_audit_log l
    cross join lateral (values ('before', l.before_data), ('after', l.after_data)) s(side,value)
    where l.id <= ${cutoff} ${id === null ? '' : `and l.id = ${id}`} ${side === null ? '' : `and s.side = '${side}'`}
  ), tokens as (
    select *, case when value->>'product_no'='__GOUKA_ERP_GLOBAL_STATE__'
      and left(value->>'memo',length('__GOUKA_ERP_GLOBAL_STATE_JSON__'))='__GOUKA_ERP_GLOBAL_STATE_JSON__'
      then ((substring(value->>'memo' from length('__GOUKA_ERP_GLOBAL_STATE_JSON__')+1)::jsonb)->'savedAt')::text end saved_token
    from snapshots
  ), templates as (
    select *, case when saved_token is not null and saved_token <> 'null' then
      jsonb_set(value - 'updated_at','{memo}',to_jsonb(replace(value->>'memo',saved_token,'${AUDIT_MARKER}')))
      else value - 'updated_at' end template from tokens
  )`;
}

export function auditIndexQuery(cutoff, from = 1) {
  if (!Number.isSafeInteger(from) || from < 1 || from > cutoff) throw new Error('Invalid lower bound');
  return `set statement_timeout = '60s'; ${snapshotCte(cutoff).replace(`where l.id <= ${cutoff}`, `where l.id between ${from} and ${cutoff}`)} select jsonb_build_object(
    'cutoff',${cutoff}, 'marker','${AUDIT_MARKER}',
    'rows',(select jsonb_agg(jsonb_build_object('id',id,'happened_at',happened_at,
      'actor_id',actor_id,'operation',operation,'product_no',product_no) order by id)
      from public.erp_audit_log where id between ${from} and ${cutoff}),
    'snapshots',(select jsonb_agg(jsonb_build_object('id',id,'side',side,
      'hash',md5(value::text),'template_hash',md5(template::text),
      'has_updated_at',value ? 'updated_at','updated_at',value->'updated_at','saved_token',saved_token,
      'marker_collision',coalesce(position('${AUDIT_MARKER}' in (value->>'memo'))>0,false)) order by id,side)
      from templates)) as archive_index;`;
}

export function auditTemplateQuery(cutoff, id, side) {
  return `${snapshotCte(cutoff,id,side)} select template::text as template_text,md5(template::text) as hash from templates;`;
}

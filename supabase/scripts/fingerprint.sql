-- Per-object fingerprints (kind, name, md5 of the definition) of the schema, for comparing production with a database loaded from baseline.sql.
-- Grantors are left out (they differ between Supabase and a local load); everything else is compared.
set search_path = '';
with sch as (select oid, nspname from pg_namespace where nspname in ('public','mahjong','ctf','trpg','smp','plazmaburst')),
items(kind, name, def) as (
  select 'table', s.nspname||'.'||c.relname,
    (select string_agg(a.attname||' '||format_type(a.atttypid,a.atttypmod)||' '||a.attnotnull||' '||a.attidentity::text||' '||coalesce(pg_get_expr(ad.adbin,ad.adrelid),''), ',' order by a.attnum)
       from pg_attribute a left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)
    ||' rls='||c.relrowsecurity||c.relforcerowsecurity
  from pg_class c join sch s on s.oid=c.relnamespace where c.relkind='r'
  union all select 'constraint', s.nspname||'.'||c.relname||'.'||k.conname, pg_get_constraintdef(k.oid)
  from pg_constraint k join pg_class c on c.oid=k.conrelid join sch s on s.oid=c.relnamespace
  union all select 'index', s.nspname||'.'||ic.relname, pg_get_indexdef(i.indexrelid)
  from pg_index i join pg_class ic on ic.oid=i.indexrelid join sch s on s.oid=ic.relnamespace
  union all select 'sequence', s.nspname||'.'||c.relname, format_type(q.seqtypid,null)||q.seqstart||'/'||q.seqincrement||'/'||q.seqmin||'/'||q.seqmax||'/'||q.seqcache||q.seqcycle
  from pg_class c join sch s on s.oid=c.relnamespace join pg_sequence q on q.seqrelid=c.oid
  union all select 'function', s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', pg_get_functiondef(p.oid)
  from pg_proc p join sch s on s.oid=p.pronamespace
  union all select 'view', s.nspname||'.'||c.relname, coalesce(array_to_string(c.reloptions,','),'')||pg_get_viewdef(c.oid)
  from pg_class c join sch s on s.oid=c.relnamespace where c.relkind='v'
  union all select 'type', s.nspname||'.'||t.typname, t.typtype::text||coalesce((select string_agg(enumlabel,',' order by enumsortorder) from pg_enum where enumtypid=t.oid),'')
  from pg_type t join sch s on s.oid=t.typnamespace where t.typtype in ('e','d')
  union all select 'trigger', s.nspname||'.'||c.relname||'.'||t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join sch s on s.oid=c.relnamespace where not t.tgisinternal
  union all select 'policy', schemaname||'.'||tablename||'.'||policyname, permissive||cmd||array_to_string(roles,',')||coalesce(qual,'')||'|'||coalesce(with_check,'')
  from pg_policies where schemaname in (select nspname from sch)
  union all select 'comment', d.classoid::regclass::text||':'||coalesce((select s.nspname||'.'||c.relname from pg_class c join sch s on s.oid=c.relnamespace where c.oid=d.objoid and d.classoid='pg_class'::regclass),'?')||'.'||coalesce((select attname from pg_attribute where attrelid=d.objoid and attnum=d.objsubid and d.objsubid>0), ''), d.description
  from pg_description d where d.classoid='pg_class'::regclass and d.objoid in (select c.oid from pg_class c join sch s on s.oid=c.relnamespace)
  union all select 'acl_rel', s.nspname||'.'||c.relname,
    coalesce(nullif(array_to_string(array(select distinct lower((case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end)||':'||a.privilege_type) from aclexplode(c.relacl) a where a.grantee <> c.relowner order by 1), ','), ''), '')
  from pg_class c join sch s on s.oid=c.relnamespace where c.relkind in ('r','v','S')
  union all select 'acl_fn', s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
    coalesce(nullif(array_to_string(array(select distinct lower((case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end)||':'||a.privilege_type) from aclexplode(p.proacl) a where a.grantee <> p.proowner order by 1), ','), ''), 'DEFAULT')
  from pg_proc p join sch s on s.oid=p.pronamespace
  union all select 'acl_schema', s.nspname,
    coalesce(nullif(array_to_string(array(select distinct lower((case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end)||':'||a.privilege_type) from aclexplode(n.nspacl) a where a.grantee <> n.nspowner order by 1), ','), ''), '')
  from pg_namespace n join sch s on s.oid=n.oid
  union all select 'acl_default', pg_get_userbyid(d.defaclrole)||'.'||s.nspname||'.'||d.defaclobjtype::text,
    array_to_string(array(select distinct lower((case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end)||':'||a.privilege_type) from aclexplode(d.defaclacl) a order by 1), ',')
  from pg_default_acl d join sch s on s.oid=d.defaclnamespace
)
select kind, name, md5(coalesce(def,'')) as h from items;

set search_path = '';
with sch as (select oid, nspname from pg_namespace where nspname in ('public','mahjong','ctf','trpg','smp','plazmaburst')),
acl_tbl as (
  select s.nspname, c.relname, c.relkind, case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee,
         string_agg(a.privilege_type, ', ' order by a.privilege_type) as privs
  from pg_class c join sch s on s.oid=c.relnamespace, aclexplode(c.relacl) a
  where c.relkind in ('r','v','S') and a.grantee <> c.relowner
  group by 1,2,3,4),
acl_col as (
  select s.nspname, c.relname, at.attname, case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee, a.privilege_type
  from pg_attribute at join pg_class c on c.oid=at.attrelid join sch s on s.oid=c.relnamespace, aclexplode(at.attacl) a
  where at.attacl is not null and at.attnum>0 and not at.attisdropped and a.grantee <> c.relowner),
acl_fn as (
  select p.oid, s.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
         case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee
  from pg_proc p join sch s on s.oid=p.pronamespace, aclexplode(p.proacl) a
  where p.proacl is not null and a.grantee <> p.proowner and a.privilege_type='EXECUTE'),
acl_sch as (
  select s.nspname, case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee,
         string_agg(a.privilege_type, ', ' order by a.privilege_type) as privs
  from pg_namespace n join sch s on s.oid=n.oid, aclexplode(n.nspacl) a
  where a.grantee <> n.nspowner group by 1,2),
acl_def as (
  select pg_get_userbyid(d.defaclrole) as forrole, s.nspname,
         case d.defaclobjtype when 'r' then 'TABLES' when 'S' then 'SEQUENCES' when 'f' then 'FUNCTIONS' when 'T' then 'TYPES' when 'n' then 'SCHEMAS' end as objtype,
         case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee,
         string_agg(a.privilege_type, ', ' order by a.privilege_type) as privs
  from pg_default_acl d join sch s on s.oid=d.defaclnamespace, aclexplode(d.defaclacl) a
  group by 1,2,3,4)
select concat_ws(E'\n\n',
'-- ForestWork database schema baseline (structure only, no data).
-- Generated from the production catalog on ' || to_char(now(), 'YYYY-MM-DD') || ', Postgres ' || current_setting('server_version') || '.
-- Schemas: public, mahjong, ctf, trpg, smp, plazmaburst. All objects are owned by postgres.
-- Not included: data, sequence positions, cron jobs, Supabase-managed schemas (auth, storage, extensions, vault, ...).

SET check_function_bodies = false;
SET client_min_messages = warning;',
'-- Schemas' || E'\n' || (select string_agg(format('CREATE SCHEMA IF NOT EXISTS %I;', nspname), E'\n' order by nspname) from sch where nspname <> 'public'),
'-- Extensions used by column defaults and functions (managed by Supabase)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;',
'-- Types' || E'\n' || (select string_agg(case t.typtype
   when 'e' then format('CREATE TYPE %I.%I AS ENUM (%s);', s.nspname, t.typname, (select string_agg(quote_literal(enumlabel), ', ' order by enumsortorder) from pg_enum where enumtypid=t.oid))
   when 'd' then format('CREATE DOMAIN %I.%I AS %s%s%s;', s.nspname, t.typname, format_type(t.typbasetype, t.typtypmod), case when t.typnotnull then ' NOT NULL' else '' end, coalesce((select ' '||string_agg(pg_get_constraintdef(c.oid), ' ') from pg_constraint c where c.contypid=t.oid),''))
   when 'c' then format('CREATE TYPE %I.%I AS (%s);', s.nspname, t.typname, (select string_agg(format('%I %s', a.attname, format_type(a.atttypid, a.atttypmod)), ', ' order by a.attnum) from pg_attribute a where a.attrelid=t.typrelid and a.attnum>0 and not a.attisdropped))
 end, E'\n' order by s.nspname, t.typname)
 from pg_type t join sch s on s.oid=t.typnamespace
 where t.typtype in ('e','d') or (t.typtype='c' and exists (select 1 from pg_class c where c.oid=t.typrelid and c.relkind='c'))),
'-- Sequences' || E'\n' || (select string_agg(format('CREATE SEQUENCE %I.%I AS %s START WITH %s INCREMENT BY %s MINVALUE %s MAXVALUE %s CACHE %s%s;', s.nspname, c.relname, format_type(q.seqtypid, null), q.seqstart, q.seqincrement, q.seqmin, q.seqmax, q.seqcache, case when q.seqcycle then ' CYCLE' else '' end), E'\n' order by s.nspname, c.relname)
 from pg_class c join sch s on s.oid=c.relnamespace join pg_sequence q on q.seqrelid=c.oid
 where c.relkind='S' and not exists (select 1 from pg_depend d where d.objid=c.oid and d.deptype='i')),
'-- Tables' || E'\n' || (select string_agg(format(E'CREATE TABLE %I.%I (\n%s\n);', s.nspname, c.relname,
   (select string_agg(format('  %I %s%s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
      case when a.attcollation <> 0 and a.attcollation <> (select typcollation from pg_type where oid=a.atttypid) then ' COLLATE '||(select quote_ident(collname) from pg_collation where oid=a.attcollation) else '' end,
      case when a.attidentity='a' then ' GENERATED ALWAYS AS IDENTITY' when a.attidentity='d' then ' GENERATED BY DEFAULT AS IDENTITY' when ad.adbin is not null then ' DEFAULT '||pg_get_expr(ad.adbin, ad.adrelid) else '' end,
      case when a.attnotnull then ' NOT NULL' else '' end), E',\n' order by a.attnum)
    from pg_attribute a left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
    where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)), E'\n\n' order by s.nspname, c.relname)
 from pg_class c join sch s on s.oid=c.relnamespace where c.relkind='r'),
'-- Sequence ownership' || E'\n' || (select string_agg(format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.%I;', s.nspname, sc.relname, s2.nspname, tc.relname, a.attname), E'\n' order by s.nspname, sc.relname)
  from pg_depend d join pg_class sc on sc.oid=d.objid and sc.relkind='S' join sch s on s.oid=sc.relnamespace
  join pg_class tc on tc.oid=d.refobjid join pg_namespace s2 on s2.oid=tc.relnamespace join pg_attribute a on a.attrelid=tc.oid and a.attnum=d.refobjsubid
  where d.deptype='a' and d.classid='pg_class'::regclass),
'-- Primary keys, unique and check constraints' || E'\n' || (select string_agg(format('ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I %s;', s.nspname, c.relname, k.conname, pg_get_constraintdef(k.oid)), E'\n' order by s.nspname, c.relname, k.contype desc, k.conname)
  from pg_constraint k join pg_class c on c.oid=k.conrelid join sch s on s.oid=c.relnamespace where k.contype in ('p','u','c','x')),
'-- Foreign keys' || E'\n' || (select string_agg(format('ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I %s;', s.nspname, c.relname, k.conname, pg_get_constraintdef(k.oid)), E'\n' order by s.nspname, c.relname, k.conname)
  from pg_constraint k join pg_class c on c.oid=k.conrelid join sch s on s.oid=c.relnamespace where k.contype='f'),
'-- Indexes' || E'\n' || (select string_agg(pg_get_indexdef(i.indexrelid)||';', E'\n' order by s.nspname, ic.relname)
  from pg_index i join pg_class ic on ic.oid=i.indexrelid join sch s on s.oid=ic.relnamespace
  where not exists (select 1 from pg_constraint k where k.conindid=i.indexrelid and k.contype in ('p','u','x'))),
'-- Functions' || E'\n' || (select string_agg(pg_get_functiondef(p.oid)||';', E'\n\n' order by s.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
  from pg_proc p join sch s on s.oid=p.pronamespace where p.prokind in ('f','p')),
'-- Views' || E'\n' || (select string_agg(format(E'CREATE VIEW %I.%I%s AS\n%s', s.nspname, c.relname, case when c.reloptions is not null then ' WITH ('||array_to_string(c.reloptions, ', ')||')' else '' end, pg_get_viewdef(c.oid)), E'\n\n' order by s.nspname, c.relname)
  from pg_class c join sch s on s.oid=c.relnamespace where c.relkind='v'),
'-- Triggers' || E'\n' || (select string_agg(pg_get_triggerdef(t.oid)||';', E'\n') from pg_trigger t join pg_class c on c.oid=t.tgrelid join sch s on s.oid=c.relnamespace where not t.tgisinternal),
'-- Row level security' || E'\n' || (select string_agg(format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', s.nspname, c.relname)||case when c.relforcerowsecurity then format(E'\nALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', s.nspname, c.relname) else '' end, E'\n' order by s.nspname, c.relname)
   from pg_class c join sch s on s.oid=c.relnamespace where c.relkind='r' and c.relrowsecurity),
'-- Policies' || E'\n' || (select string_agg(format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename, permissive, cmd, array_to_string(roles, ', '), case when qual is not null then ' USING ('||qual||')' else '' end, case when with_check is not null then ' WITH CHECK ('||with_check||')' else '' end), E'\n' order by schemaname, tablename, policyname)
   from pg_policies where schemaname in (select nspname from sch)),
'-- Comments' || E'\n' || (select string_agg(format('COMMENT ON %s %s IS %s;', case when d.objsubid=0 then case c.relkind when 'v' then 'VIEW' else 'TABLE' end else 'COLUMN' end,
     case when d.objsubid=0 then format('%I.%I', s.nspname, c.relname) else format('%I.%I.%I', s.nspname, c.relname, (select attname from pg_attribute where attrelid=c.oid and attnum=d.objsubid)) end, quote_literal(d.description)), E'\n' order by s.nspname, c.relname, d.objsubid)
   from pg_description d join pg_class c on c.oid=d.objoid and d.classoid='pg_class'::regclass join sch s on s.oid=c.relnamespace),
'-- Schema privileges' || E'\n' || (select string_agg(format('GRANT %s ON SCHEMA %I TO %s;', privs, nspname, grantee), E'\n' order by nspname, grantee) from acl_sch),
'-- Table, view and sequence privileges' || E'\n' || (select string_agg(format('GRANT %s ON %s %I.%I TO %s;', privs, case relkind when 'S' then 'SEQUENCE' else 'TABLE' end, nspname, relname, grantee), E'\n' order by nspname, relname, grantee) from acl_tbl),
'-- Column privileges' || E'\n' || coalesce((select string_agg(format('GRANT %s (%I) ON TABLE %I.%I TO %s;', privilege_type, attname, nspname, relname, grantee), E'\n' order by nspname, relname, attname, grantee, privilege_type) from acl_col), '-- none'),
'-- Function privileges (EXECUTE is revoked from PUBLIC first, then granted back as on production)' || E'\n' || (select string_agg(stmt, E'\n' order by nspname, proname, args, ord) from (
   select distinct p.oid, s.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args, 0 as ord, format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC;', s.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as stmt
   from pg_proc p join sch s on s.oid=p.pronamespace where p.proacl is not null and p.prokind in ('f','p')
   union all
   select oid, nspname, proname, args, 1, format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %s;', nspname, proname, args, grantee) from acl_fn) f),
'-- Default privileges for new objects' || E'\n' || (select string_agg(format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT %s ON %s TO %s;', forrole, nspname, privs, objtype, grantee), E'\n' order by forrole, nspname, objtype, grantee) from acl_def)
) || E'\n' as baseline;

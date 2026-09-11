-- Rollback de Fase 4: revierte phase4_crear_turno_atomico.sql
-- Proyecto Supabase: vcgyiyrboumimwgdsitf

DROP FUNCTION IF EXISTS public.crear_turno(bigint, timestamp without time zone, text, text, text, numeric);

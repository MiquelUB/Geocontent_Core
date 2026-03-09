-- Neteja profunda de dades d'activitat i mètriques
-- Això posa tots els comptadors de l'Informe Executiu a zero

-- 1. Activitat d'usuaris
TRUNCATE TABLE public.poi_visits CASCADE;
TRUNCATE TABLE public.user_unlocks CASCADE;
TRUNCATE TABLE public.user_route_progress CASCADE;
TRUNCATE TABLE public.user_telemetry CASCADE;

-- 2. Informes i captures històriques
TRUNCATE TABLE public.reports CASCADE;
TRUNCATE TABLE public.executive_report_snapshots CASCADE;
TRUNCATE TABLE public.ai_usage_logs CASCADE;

-- 3. Reseteig de progressió (mantenint els usuaris/admins però a zero XP)
UPDATE public.profiles SET xp = 0, level = 1;

-- 4. Esborrat d'usuaris de prova (nomes mantenim els que tenen rol 'admin')
DELETE FROM public.profiles WHERE role IS NULL OR role != 'admin';

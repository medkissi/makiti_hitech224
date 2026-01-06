-- Fix: Change view to SECURITY INVOKER (default, safe behavior)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  nom_complet,
  telephone,
  created_at,
  updated_at,
  (pin_code_hash IS NOT NULL) as has_pin_code
FROM public.profiles;
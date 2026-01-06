-- Add the pin_code_hash column first
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code_hash TEXT;

-- Migrate existing plaintext PINs to hashed format using direct pgcrypto call
UPDATE public.profiles
SET pin_code_hash = extensions.crypt(pin_code, extensions.gen_salt('bf', 8))
WHERE pin_code IS NOT NULL AND pin_code != '' AND pin_code_hash IS NULL;

-- Clear all plaintext PIN codes  
UPDATE public.profiles SET pin_code = NULL;

-- Recreate hash_pin_code function with correct schema reference
CREATE OR REPLACE FUNCTION public.hash_pin_code(pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pin IS NULL OR pin = '' THEN
    RETURN NULL;
  END IF;
  RETURN extensions.crypt(pin, extensions.gen_salt('bf', 8));
END;
$$;

-- Recreate verify_pin_code function
CREATE OR REPLACE FUNCTION public.verify_pin_code(user_id_param UUID, pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  IF pin IS NULL OR pin = '' THEN
    RETURN FALSE;
  END IF;
  
  SELECT pin_code_hash INTO stored_hash
  FROM public.profiles
  WHERE user_id = user_id_param;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(pin, stored_hash);
END;
$$;

-- Recreate set_pin_code function
CREATE OR REPLACE FUNCTION public.set_pin_code(user_id_param UUID, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET pin_code_hash = extensions.crypt(new_pin, extensions.gen_salt('bf', 8)),
      pin_code = NULL,
      updated_at = now()
  WHERE user_id = user_id_param;
  
  RETURN FOUND;
END;
$$;

-- Create a view that excludes sensitive fields
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT 
  id,
  user_id,
  nom_complet,
  telephone,
  created_at,
  updated_at,
  (pin_code_hash IS NOT NULL) as has_pin_code
FROM public.profiles;
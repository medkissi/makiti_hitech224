-- Create enum for activity types
CREATE TYPE public.activity_type AS ENUM (
  'login',
  'logout',
  'user_created',
  'user_updated',
  'user_deleted',
  'user_banned',
  'user_unbanned',
  'password_changed',
  'product_created',
  'product_updated',
  'product_deleted',
  'sale_created',
  'sale_deleted',
  'stock_updated',
  'category_created',
  'category_updated',
  'category_deleted'
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action_type activity_type NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only proprietaire can view activity logs
CREATE POLICY "Proprietaire can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'proprietaire'::app_role));

-- Allow authenticated users to insert their own activity logs
CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert any logs (for edge functions)
CREATE POLICY "Service role can insert all logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_user_name TEXT,
  p_action_type activity_type,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, user_name, action_type, entity_type, entity_id, entity_name, details
  ) VALUES (
    p_user_id, p_user_name, p_action_type, p_entity_type, p_entity_id, p_entity_name, p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
import { supabase } from "@/integrations/supabase/client";

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_banned'
  | 'user_unbanned'
  | 'password_changed'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'sale_created'
  | 'sale_deleted'
  | 'stock_updated'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted';

interface LogActivityParams {
  action_type: ActivityType;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session?.access_token) {
      console.warn('No session available for logging activity');
      return false;
    }

    const response = await supabase.functions.invoke('activity-logs', {
      body: { 
        action: 'log',
        ...params
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (response.error) {
      console.error('Error logging activity:', response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

export function useActivityLogger() {
  return { logActivity };
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogActivityPayload {
  action: 'log'
  action_type: string
  entity_type?: string
  entity_id?: string
  entity_name?: string
  details?: Record<string, any>
}

interface FetchLogsPayload {
  action: 'fetch'
  page?: number
  limit?: number
  action_type?: string
  user_id?: string
  start_date?: string
  end_date?: string
}

interface ExportLogsPayload {
  action: 'export'
  start_date?: string
  end_date?: string
  format?: 'csv' | 'json'
}

type RequestPayload = LogActivityPayload | FetchLogsPayload | ExportLogsPayload

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !currentUser) {
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nom_complet')
      .eq('user_id', currentUser.id)
      .single()

    const userName = profile?.nom_complet || currentUser.email || 'Utilisateur inconnu'

    const payload: RequestPayload = await req.json()
    console.log('Activity logs action:', payload.action)

    switch (payload.action) {
      case 'log': {
        const { action_type, entity_type, entity_id, entity_name, details } = payload as LogActivityPayload

        if (!action_type) {
          return new Response(
            JSON.stringify({ error: 'Missing action_type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabaseAdmin
          .from('activity_logs')
          .insert({
            user_id: currentUser.id,
            user_name: userName,
            action_type,
            entity_type,
            entity_id,
            entity_name,
            details
          })
          .select()
          .single()

        if (error) {
          console.error('Error logging activity:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, log: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'fetch': {
        // Check if user is proprietaire
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single()

        if (!roleData || roleData.role !== 'proprietaire') {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { page = 1, limit = 50, action_type, user_id, start_date, end_date } = payload as FetchLogsPayload
        const offset = (page - 1) * limit

        let query = supabaseAdmin
          .from('activity_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (action_type) {
          query = query.eq('action_type', action_type)
        }
        if (user_id) {
          query = query.eq('user_id', user_id)
        }
        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data, error, count } = await query

        if (error) {
          console.error('Error fetching logs:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            logs: data, 
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'export': {
        // Check if user is proprietaire
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single()

        if (!roleData || roleData.role !== 'proprietaire') {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { start_date, end_date, format = 'csv' } = payload as ExportLogsPayload

        let query = supabaseAdmin
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000)

        if (start_date) {
          query = query.gte('created_at', start_date)
        }
        if (end_date) {
          query = query.lte('created_at', end_date)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error exporting logs:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (format === 'json') {
          return new Response(
            JSON.stringify({ logs: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate CSV
        const headers = ['Date', 'Utilisateur', 'Action', 'Type entité', 'Nom entité', 'Détails']
        const actionLabels: Record<string, string> = {
          'login': 'Connexion',
          'logout': 'Déconnexion',
          'user_created': 'Utilisateur créé',
          'user_updated': 'Utilisateur modifié',
          'user_deleted': 'Utilisateur supprimé',
          'user_banned': 'Utilisateur désactivé',
          'user_unbanned': 'Utilisateur réactivé',
          'password_changed': 'Mot de passe changé',
          'product_created': 'Produit créé',
          'product_updated': 'Produit modifié',
          'product_deleted': 'Produit supprimé',
          'sale_created': 'Vente créée',
          'sale_deleted': 'Vente supprimée',
          'stock_updated': 'Stock modifié',
          'category_created': 'Catégorie créée',
          'category_updated': 'Catégorie modifiée',
          'category_deleted': 'Catégorie supprimée'
        }

        const rows = data?.map(log => {
          const date = new Date(log.created_at).toLocaleString('fr-FR')
          const action = actionLabels[log.action_type] || log.action_type
          const details = log.details ? JSON.stringify(log.details) : ''
          return [
            date,
            log.user_name,
            action,
            log.entity_type || '',
            log.entity_name || '',
            details
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        }) || []

        const csv = [headers.join(','), ...rows].join('\n')

        return new Response(
          JSON.stringify({ csv }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

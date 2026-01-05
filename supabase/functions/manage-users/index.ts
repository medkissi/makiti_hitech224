import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserPayload {
  action: 'create'
  email: string
  password: string
  nom_complet: string
  role: 'proprietaire' | 'employe'
}

interface DeleteUserPayload {
  action: 'delete'
  user_id: string
}

interface UpdateRolePayload {
  action: 'update_role'
  user_id: string
  new_role: 'proprietaire' | 'employe'
}

interface UpdateProfilePayload {
  action: 'update_profile'
  user_id: string
  nom_complet?: string
  telephone?: string
  new_role?: 'proprietaire' | 'employe'
}

interface ListUsersPayload {
  action: 'list'
}

type RequestPayload = CreateUserPayload | DeleteUserPayload | UpdateRolePayload | UpdateProfilePayload | ListUsersPayload

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for admin operations
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

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !currentUser) {
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Current user:', currentUser.id, currentUser.email)

    // Check if current user is proprietaire
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'proprietaire') {
      console.error('Permission denied - not a proprietaire:', roleError, roleData)
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only proprietaire can manage users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User role verified: proprietaire')

    // Parse request body
    const payload: RequestPayload = await req.json()
    console.log('Action requested:', payload.action)

    switch (payload.action) {
      case 'list': {
        // List all users with their profiles and roles
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all profiles
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('*')

        // Get all roles
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('*')

        // Combine data
        const usersWithData = users.users.map(user => {
          const profile = profiles?.find(p => p.user_id === user.id)
          const role = roles?.find(r => r.user_id === user.id)
          return {
            id: user.id,
            email: user.email,
            nom_complet: profile?.nom_complet || user.email,
            telephone: profile?.telephone,
            role: role?.role || 'employe',
            created_at: user.created_at
          }
        })

        console.log('Listed', usersWithData.length, 'users')
        return new Response(
          JSON.stringify({ users: usersWithData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create': {
        const { email, password, nom_complet, role } = payload as CreateUserPayload

        if (!email || !password || !nom_complet || !role) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Creating user:', email, 'with role:', role)

        // Create user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            nom_complet
          }
        })

        if (createError) {
          console.error('Error creating user:', createError)
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('User created:', newUser.user.id)

        // The profile is created automatically via trigger, but let's assign the role
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role })

        if (roleInsertError) {
          console.error('Error assigning role:', roleInsertError)
          // Don't fail - user was created successfully
        }

        console.log('Role assigned successfully')
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: { 
              id: newUser.user.id, 
              email: newUser.user.email,
              nom_complet,
              role 
            } 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        const { user_id } = payload as DeleteUserPayload

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'Missing user_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prevent deleting yourself
        if (user_id === currentUser.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Deleting user:', user_id)

        // Delete user (this will cascade to profiles and user_roles)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

        if (deleteError) {
          console.error('Error deleting user:', deleteError)
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('User deleted successfully')
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_role': {
        const { user_id, new_role } = payload as UpdateRolePayload

        if (!user_id || !new_role) {
          return new Response(
            JSON.stringify({ error: 'Missing user_id or new_role' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Updating role for user:', user_id, 'to:', new_role)

        // Update or insert role
        const { error: upsertError } = await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id, role: new_role }, { onConflict: 'user_id' })

        if (upsertError) {
          console.error('Error updating role:', upsertError)
          return new Response(
            JSON.stringify({ error: upsertError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Role updated successfully')
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_profile': {
        const { user_id, nom_complet, telephone, new_role } = payload as UpdateProfilePayload

        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'Missing user_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Updating profile for user:', user_id)

        // Update profile if nom_complet or telephone provided
        if (nom_complet !== undefined || telephone !== undefined) {
          const updateData: { nom_complet?: string; telephone?: string } = {}
          if (nom_complet !== undefined) updateData.nom_complet = nom_complet
          if (telephone !== undefined) updateData.telephone = telephone

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('user_id', user_id)

          if (profileError) {
            console.error('Error updating profile:', profileError)
            return new Response(
              JSON.stringify({ error: profileError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          console.log('Profile updated successfully')
        }

        // Update role if provided
        if (new_role) {
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .upsert({ user_id, role: new_role }, { onConflict: 'user_id' })

          if (roleError) {
            console.error('Error updating role:', roleError)
            return new Response(
              JSON.stringify({ error: roleError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          console.log('Role updated successfully')
        }

        return new Response(
          JSON.stringify({ success: true }),
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

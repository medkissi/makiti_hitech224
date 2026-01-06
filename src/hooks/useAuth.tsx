import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  profile: {
    id: string;
    nom_complet: string;
    has_pin_code: boolean;
    telephone: string | null;
  } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nomComplet: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithPin: (pin: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const loginLoggedRef = useRef(false);

  const logLoginActivity = async (userId: string) => {
    if (loginLoggedRef.current) return;
    loginLoggedRef.current = true;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        await supabase.functions.invoke('activity-logs', {
          body: { 
            action: 'log',
            action_type: 'login'
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
          }
        });
      }
    } catch (error) {
      console.error('Error logging login activity:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile/role fetch
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
            // Log login on SIGNED_IN event
            if (event === 'SIGNED_IN') {
              logLoginActivity(session.user.id);
            }
          }, 0);
        } else {
          setUserRole(null);
          setProfile(null);
          setLoading(false);
          loginLoggedRef.current = false;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile using the safe view that excludes sensitive fields
      const { data: profileData } = await supabase
        .from("profiles_safe")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          nom_complet: profileData.nom_complet,
          has_pin_code: profileData.has_pin_code || false,
          telephone: profileData.telephone,
        });
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData) {
        setUserRole(roleData.role as AppRole);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nomComplet: string, role: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nom_complet: nomComplet,
        },
      },
    });

    if (error) {
      return { error: error as Error };
    }

    // Assign role
    if (data.user) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role });

      if (roleError) {
        console.error("Error assigning role:", roleError);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setProfile(null);
  };

  const signInWithPin = async (pin: string) => {
    // PIN verification is now done server-side via the verify_pin_code function
    // This method is deprecated - PIN codes are hashed and cannot be searched directly
    return { error: new Error("Connexion PIN non disponible - utilisez email/mot de passe") };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

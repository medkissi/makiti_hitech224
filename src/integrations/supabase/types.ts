export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      daily_work_plans: {
        Row: {
          cloture: boolean
          created_at: string
          date_travail: string
          employe_id: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          cloture?: boolean
          created_at?: string
          date_travail: string
          employe_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          cloture?: boolean
          created_at?: string
          date_travail?: string
          employe_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          actif: boolean
          categorie_id: string | null
          code_modele: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          nom: string
          prix_unitaire: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie_id?: string | null
          code_modele: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          nom: string
          prix_unitaire?: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie_id?: string | null
          code_modele?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          nom?: string
          prix_unitaire?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nom_complet: string
          pin_code: string | null
          pin_code_hash: string | null
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom_complet: string
          pin_code?: string | null
          pin_code_hash?: string | null
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nom_complet?: string
          pin_code?: string | null
          pin_code_hash?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          prix_total: number | null
          prix_unitaire: number
          product_id: string
          quantite: number
          sale_id: string
          taille: Database["public"]["Enums"]["taille_vetement"]
        }
        Insert: {
          created_at?: string
          id?: string
          prix_total?: number | null
          prix_unitaire?: number
          product_id: string
          quantite?: number
          sale_id: string
          taille: Database["public"]["Enums"]["taille_vetement"]
        }
        Update: {
          created_at?: string
          id?: string
          prix_total?: number | null
          prix_unitaire?: number
          product_id?: string
          quantite?: number
          sale_id?: string
          taille?: Database["public"]["Enums"]["taille_vetement"]
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          date_vente: string
          employe_id: string | null
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          montant_total: number
          notes: string | null
          work_plan_id: string | null
        }
        Insert: {
          created_at?: string
          date_vente?: string
          employe_id?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          montant_total?: number
          notes?: string | null
          work_plan_id?: string | null
        }
        Update: {
          created_at?: string
          date_vente?: string
          employe_id?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          montant_total?: number
          notes?: string | null
          work_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_work_plan_id_fkey"
            columns: ["work_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_work_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantite_actuelle: number
          quantite_initiale: number
          seuil_alerte: number
          taille: Database["public"]["Enums"]["taille_vetement"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantite_actuelle?: number
          quantite_initiale?: number
          seuil_alerte?: number
          taille: Database["public"]["Enums"]["taille_vetement"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantite_actuelle?: number
          quantite_initiale?: number
          seuil_alerte?: number
          taille?: Database["public"]["Enums"]["taille_vetement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_plan_lines: {
        Row: {
          created_at: string
          id: string
          prix_total: number | null
          prix_unitaire: number
          product_id: string
          quantite_initiale: number
          quantite_restante: number | null
          quantite_vendue: number
          taille: Database["public"]["Enums"]["taille_vetement"]
          updated_at: string
          work_plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prix_total?: number | null
          prix_unitaire?: number
          product_id: string
          quantite_initiale?: number
          quantite_restante?: number | null
          quantite_vendue?: number
          taille: Database["public"]["Enums"]["taille_vetement"]
          updated_at?: string
          work_plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prix_total?: number | null
          prix_unitaire?: number
          product_id?: string
          quantite_initiale?: number
          quantite_restante?: number | null
          quantite_vendue?: number
          taille?: Database["public"]["Enums"]["taille_vetement"]
          updated_at?: string
          work_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_plan_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_plan_lines_work_plan_id_fkey"
            columns: ["work_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_work_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          created_at: string | null
          has_pin_code: boolean | null
          id: string | null
          nom_complet: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          has_pin_code?: never
          id?: string | null
          nom_complet?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          has_pin_code?: never
          id?: string | null
          nom_complet?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_pin_code: { Args: { pin: string }; Returns: string }
      is_authenticated: { Args: never; Returns: boolean }
      set_pin_code: {
        Args: { new_pin: string; user_id_param: string }
        Returns: boolean
      }
      verify_pin_code: {
        Args: { pin: string; user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "proprietaire" | "employe"
      mode_paiement: "especes" | "mobile_money" | "carte" | "credit"
      taille_vetement:
        | "XS"
        | "S"
        | "M"
        | "L"
        | "XL"
        | "XXL"
        | "3XL"
        | "4XL"
        | "5XL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["proprietaire", "employe"],
      mode_paiement: ["especes", "mobile_money", "carte", "credit"],
      taille_vetement: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      Cliente: {
        Row: {
          created_at: string | null
          id: number
          nombre: string
          notas: string | null
          telefono: number
          ultima_visita: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nombre: string
          notas?: string | null
          telefono: number
          ultima_visita?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nombre?: string
          notas?: string | null
          telefono?: number
          ultima_visita?: string | null
        }
        Relationships: []
      }
      Emprendedor: {
        Row: {
          activo: boolean | null
          alias: string | null
          created_at: string
          descripcion: string | null
          duracion_default: number | null
          foto_url: string | null
          id: number
          nombre: string
          precio_base: number | null
          users_id: string
        }
        Insert: {
          activo?: boolean | null
          alias?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_default?: number | null
          foto_url?: string | null
          id?: number
          nombre: string
          precio_base?: number | null
          users_id: string
        }
        Update: {
          activo?: boolean | null
          alias?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_default?: number | null
          foto_url?: string | null
          id?: number
          nombre?: string
          precio_base?: number | null
          users_id?: string
        }
        Relationships: []
      }
      Servicio: {
        Row: {
          duracion: number | null
          id: number
          nombre: string | null
          precio: number | null
        }
        Insert: {
          duracion?: number | null
          id?: number
          nombre?: string | null
          precio?: number | null
        }
        Update: {
          duracion?: number | null
          id?: number
          nombre?: string | null
          precio?: number | null
        }
        Relationships: []
      }
      Turno: {
        Row: {
          cliente_id: number | null
          created_at: string
          emprendedor_id: number | null
          estado: Database["public"]["Enums"]["estado_turno"] | null
          id: number
          inicio: string | null
          servicio_id: number | null
          update_at: string | null
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string
          emprendedor_id?: number | null
          estado?: Database["public"]["Enums"]["estado_turno"] | null
          id?: number
          inicio?: string | null
          servicio_id?: number | null
          update_at?: string | null
        }
        Update: {
          cliente_id?: number | null
          created_at?: string
          emprendedor_id?: number | null
          estado?: Database["public"]["Enums"]["estado_turno"] | null
          id?: number
          inicio?: string | null
          servicio_id?: number | null
          update_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Turno_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "Cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Turno_emprendedor_id_fkey"
            columns: ["emprendedor_id"]
            isOneToOne: false
            referencedRelation: "Emprendedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Turno_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "Servicio"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_turno:
        | "pendiente"
        | "confirmado"
        | "completado"
        | "cancelado"
        | "ausente"
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
      estado_turno: [
        "pendiente",
        "confirmado",
        "completado",
        "cancelado",
        "ausente",
      ],
    },
  },
} as const

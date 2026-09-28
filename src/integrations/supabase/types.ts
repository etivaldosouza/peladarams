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
      attendance: {
        Row: {
          created_at: string
          id: string
          jogador_id: string
          match_id: string
          presente: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          jogador_id: string
          match_id: string
          presente?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          jogador_id?: string
          match_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      jogadores: {
        Row: {
          criado_em: string
          dispositivo_id: string | null
          id: string
          nome: string
          pelada_id: string
          status: string
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          criado_em?: string
          dispositivo_id?: string | null
          id?: string
          nome: string
          pelada_id?: string
          status?: string
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          criado_em?: string
          dispositivo_id?: string | null
          id?: string
          nome?: string
          pelada_id?: string
          status?: string
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jogadores_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          assistencias: number
          created_at: string
          gols: number
          id: string
          jogador_id: string
          match_id: string
          time: string | null
        }
        Insert: {
          assistencias?: number
          created_at?: string
          gols?: number
          id?: string
          jogador_id: string
          match_id: string
          time?: string | null
        }
        Update: {
          assistencias?: number
          created_at?: string
          gols?: number
          id?: string
          jogador_id?: string
          match_id?: string
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          data: string | null
          id: string
          local: string | null
          pelada_id: string
          sorteio: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: string | null
          id?: string
          local?: string | null
          pelada_id: string
          sorteio?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string | null
          id?: string
          local?: string | null
          pelada_id?: string
          sorteio?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          id: string
          jogador_id: string
          match_id: string | null
          pago_em: string
          pelada_id: string
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          jogador_id: string
          match_id?: string | null
          pago_em?: string
          pelada_id: string
          status?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          jogador_id?: string
          match_id?: string | null
          pago_em?: string
          pelada_id?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_jogador_id_fkey"
            columns: ["jogador_id"]
            isOneToOne: false
            referencedRelation: "jogadores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_config: {
        Row: {
          chave: string
          id: string
          pelada_id: string
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          pelada_id?: string
          valor: string
        }
        Update: {
          chave?: string
          id?: string
          pelada_id?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_config_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_members: {
        Row: {
          created_at: string
          id: string
          papel: string
          pelada_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          papel?: string
          pelada_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          papel?: string
          pelada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_members_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      peladas: {
        Row: {
          created_at: string
          id: string
          nome: string
          owner_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          owner_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      jogadores_public: {
        Row: {
          criado_em: string | null
          dispositivo_id: string | null
          id: string | null
          nome: string | null
          pelada_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          criado_em?: string | null
          dispositivo_id?: string | null
          id?: string | null
          nome?: string | null
          pelada_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          criado_em?: string | null
          dispositivo_id?: string | null
          id?: string | null
          nome?: string | null
          pelada_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jogadores_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_legacy_pelada: { Args: { _user: string }; Returns: undefined }
      delete_my_registration: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      is_my_jogador: { Args: { _jogador: string }; Returns: boolean }
      is_pelada_member: {
        Args: { _pelada: string; _user: string }
        Returns: boolean
      }
      is_pelada_owner: {
        Args: { _pelada: string; _user: string }
        Returns: boolean
      }
      match_pelada: { Args: { _match: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

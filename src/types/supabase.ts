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
      exercises: {
        Row: {
          attention_points: string | null
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          labels: Json | null
          level: string | null
          name: string
          orientation: string | null
          photos: string[] | null
          players_count: number | null
          source: string | null
          user_id: string | null
          variant_easier: string | null
          variant_harder: string | null
        }
        Insert: {
          attention_points?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id: string
          labels?: Json | null
          level?: string | null
          name: string
          orientation?: string | null
          photos?: string[] | null
          players_count?: number | null
          source?: string | null
          user_id?: string | null
          variant_easier?: string | null
          variant_harder?: string | null
        }
        Update: {
          attention_points?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          labels?: Json | null
          level?: string | null
          name?: string
          orientation?: string | null
          photos?: string[] | null
          players_count?: number | null
          source?: string | null
          user_id?: string | null
          variant_easier?: string | null
          variant_harder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          mode: string | null
          opponent: string | null
          opponent_id: string | null
          opponent_ids: string[] | null
          partner: string | null
          partner_id: string | null
          partner_ids: string[] | null
          result: string | null
          session_id: string | null
          sets: Json | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id: string
          mode?: string | null
          opponent?: string | null
          opponent_id?: string | null
          opponent_ids?: string[] | null
          partner?: string | null
          partner_id?: string | null
          partner_ids?: string[] | null
          result?: string | null
          session_id?: string | null
          sets?: Json | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          mode?: string | null
          opponent?: string | null
          opponent_id?: string | null
          opponent_ids?: string[] | null
          partner?: string | null
          partner_id?: string | null
          partner_ids?: string[] | null
          result?: string | null
          session_id?: string | null
          sets?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          family: string
          hour: number
          id: string
          minute: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          family: string
          hour: number
          id: string
          minute: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          family?: string
          hour?: number
          id?: string
          minute?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_color: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string | null
          id: string
          name: string
          notes?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          beta_access: boolean | null
          created_at: string | null
          id: string
          photo_url: string | null
          premium_access: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          beta_access?: boolean | null
          created_at?: string | null
          id: string
          photo_url?: string | null
          premium_access?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          beta_access?: boolean | null
          created_at?: string | null
          id?: string
          photo_url?: string | null
          premium_access?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          date: string
          exercise_ids: string[] | null
          free_notes: string | null
          id: string
          next_intention: string | null
          notification_ids: string[] | null
          notification_scheduled_at: string | null
          rating: number | null
          title: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          went_well: string | null
          went_wrong: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          exercise_ids?: string[] | null
          free_notes?: string | null
          id: string
          next_intention?: string | null
          notification_ids?: string[] | null
          notification_scheduled_at?: string | null
          rating?: number | null
          title?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          went_well?: string | null
          went_wrong?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          exercise_ids?: string[] | null
          free_notes?: string | null
          id?: string
          next_intention?: string | null
          notification_ids?: string[] | null
          notification_scheduled_at?: string | null
          rating?: number | null
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          went_well?: string | null
          went_wrong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
    Enums: {},
  },
} as const

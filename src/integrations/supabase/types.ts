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
      case_registry: {
        Row: {
          age: number | null
          chief_complaint: string | null
          consultation_id: string | null
          created_at: string
          diagnosis: string | null
          difficulty: string | null
          id: string
          pathology_key: string
          pathology_label: string
          presentation_angle: string | null
          sex: string | null
          specialty: string
          subspecialty: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          chief_complaint?: string | null
          consultation_id?: string | null
          created_at?: string
          diagnosis?: string | null
          difficulty?: string | null
          id?: string
          pathology_key: string
          pathology_label: string
          presentation_angle?: string | null
          sex?: string | null
          specialty: string
          subspecialty?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          chief_complaint?: string | null
          consultation_id?: string | null
          created_at?: string
          diagnosis?: string | null
          difficulty?: string | null
          id?: string
          pathology_key?: string
          pathology_label?: string
          presentation_angle?: string | null
          sex?: string | null
          specialty?: string
          subspecialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_registry_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          case_data: Json
          completed_at: string | null
          course: string | null
          created_at: string
          cycle: string
          diagnosis: Json | null
          exams: Json
          id: string
          language: string
          mentor_log: Json
          mentor_messages: Json
          messages: Json
          mode: string
          report: Json | null
          score: number | null
          specialty: string
          status: string
          subspecialty: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_data?: Json
          completed_at?: string | null
          course?: string | null
          created_at?: string
          cycle?: string
          diagnosis?: Json | null
          exams?: Json
          id?: string
          language?: string
          mentor_log?: Json
          mentor_messages?: Json
          messages?: Json
          mode?: string
          report?: Json | null
          score?: number | null
          specialty: string
          status?: string
          subspecialty?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_data?: Json
          completed_at?: string | null
          course?: string | null
          created_at?: string
          cycle?: string
          diagnosis?: Json | null
          exams?: Json
          id?: string
          language?: string
          mentor_log?: Json
          mentor_messages?: Json
          messages?: Json
          mode?: string
          report?: Json | null
          score?: number | null
          specialty?: string
          status?: string
          subspecialty?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jury_participants: {
        Row: {
          id: string
          reserved_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          reserved_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          reserved_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jury_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_sessions: {
        Row: {
          case_data: Json | null
          closes_at: string | null
          created_at: string
          edition_key: string | null
          ends_at: string | null
          id: string
          opens_at: string | null
          results_published_at: string | null
          scheduled_at: string
          specialty: string | null
          starts_at: string | null
          status: string
          time_limit_minutes: number
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          case_data?: Json | null
          closes_at?: string | null
          created_at?: string
          edition_key?: string | null
          ends_at?: string | null
          id?: string
          opens_at?: string | null
          results_published_at?: string | null
          scheduled_at: string
          specialty?: string | null
          starts_at?: string | null
          status?: string
          time_limit_minutes?: number
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          case_data?: Json | null
          closes_at?: string | null
          created_at?: string
          edition_key?: string | null
          ends_at?: string | null
          id?: string
          opens_at?: string | null
          results_published_at?: string | null
          scheduled_at?: string
          specialty?: string | null
          starts_at?: string | null
          status?: string
          time_limit_minutes?: number
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      jury_submissions: {
        Row: {
          auto_submitted: boolean
          copy_quality_score: number | null
          deadline_at: string | null
          diagnosis: Json
          draft: Json
          duration_sec: number | null
          exams: Json
          id: string
          investigation_score: number | null
          is_finalized: boolean
          language: string
          reasoning_justification: string | null
          reasoning_score: number | null
          report: Json | null
          score: number | null
          session_id: string
          started_at: string | null
          submitted_at: string | null
          transcript: Json
          user_id: string
        }
        Insert: {
          auto_submitted?: boolean
          copy_quality_score?: number | null
          deadline_at?: string | null
          diagnosis: Json
          draft?: Json
          duration_sec?: number | null
          exams?: Json
          id?: string
          investigation_score?: number | null
          is_finalized?: boolean
          language?: string
          reasoning_justification?: string | null
          reasoning_score?: number | null
          report?: Json | null
          score?: number | null
          session_id: string
          started_at?: string | null
          submitted_at?: string | null
          transcript?: Json
          user_id: string
        }
        Update: {
          auto_submitted?: boolean
          copy_quality_score?: number | null
          deadline_at?: string | null
          diagnosis?: Json
          draft?: Json
          duration_sec?: number | null
          exams?: Json
          id?: string
          investigation_score?: number | null
          is_finalized?: boolean
          language?: string
          reasoning_justification?: string | null
          reasoning_score?: number | null
          report?: Json | null
          score?: number | null
          session_id?: string
          started_at?: string | null
          submitted_at?: string | null
          transcript?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jury_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consultations_count: number
          country: string | null
          created_at: string
          display_name: string
          first_name: string | null
          free_trial_used: number
          id: string
          is_suspended: boolean
          jury_wins: Json
          kymia_gold_count: number
          language: string
          last_name: string | null
          level: string
          profession: string | null
          total_score: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          consultations_count?: number
          country?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          free_trial_used?: number
          id: string
          is_suspended?: boolean
          jury_wins?: Json
          kymia_gold_count?: number
          language?: string
          last_name?: string | null
          level?: string
          profession?: string | null
          total_score?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          consultations_count?: number
          country?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          free_trial_used?: number
          id?: string
          is_suspended?: boolean
          jury_wins?: Json
          kymia_gold_count?: number
          language?: string
          last_name?: string | null
          level?: string
          profession?: string | null
          total_score?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_case_diversity: {
        Args: { _specialty?: string }
        Returns: {
          last_seen: string
          pathology_key: string
          pathology_label: string
          share: number
          specialty: string
          subspecialty: string
          times_generated: number
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          consultations_count: number
          country: string
          created_at: string
          display_name: string
          email: string
          free_trial_used: number
          id: string
          is_suspended: boolean
          kymia_gold_count: number
          last_sign_in_at: string
          level: string
          profession: string
          sub_expires_at: string
          sub_plan: string
          sub_status: string
          total_score: number
          whatsapp: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      get_leaderboard_v2: {
        Args: never
        Returns: {
          avg_score: number
          consultations_count: number
          country: string
          display_name: string
          id: string
          kymia_gold_count: number
          total_score: number
        }[]
      }
      global_pathology_usage: {
        Args: { _specialty: string; _subspecialty?: string }
        Returns: {
          last_seen: string
          pathology_key: string
          uses: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

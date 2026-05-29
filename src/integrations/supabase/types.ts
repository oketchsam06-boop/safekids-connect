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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: []
      }
      case_updates: {
        Row: {
          author_id: string
          child_id: string
          created_at: string
          id: string
          message: string
        }
        Insert: {
          author_id: string
          child_id: string
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          child_id?: string
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "missing_children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_photos: {
        Row: {
          child_id: string
          created_at: string
          id: string
          is_primary: boolean
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          storage_path: string
          uploaded_by: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_photos_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "missing_children"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          id: string
          ip_address: string | null
          purpose: string
          revoked_at: string | null
          signed_at: string
          user_id: string
          version: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          purpose: string
          revoked_at?: string | null
          signed_at?: string
          user_id: string
          version: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          purpose?: string
          revoked_at?: string | null
          signed_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          child_id: string
          id: string
          name: string
          phone: string
          priority: number
          relation: string | null
        }
        Insert: {
          child_id: string
          id?: string
          name: string
          phone: string
          priority?: number
          relation?: string | null
        }
        Update: {
          child_id?: string
          id?: string
          name?: string
          phone?: string
          priority?: number
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "missing_children"
            referencedColumns: ["id"]
          },
        ]
      }
      match_candidates: {
        Row: {
          ai_rationale: string | null
          ai_score: number
          child_id: string
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["match_decision"]
          id: string
          reviewer_id: string | null
          reviewer_reason: string | null
          sighting_id: string
        }
        Insert: {
          ai_rationale?: string | null
          ai_score: number
          child_id: string
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["match_decision"]
          id?: string
          reviewer_id?: string | null
          reviewer_reason?: string | null
          sighting_id: string
        }
        Update: {
          ai_rationale?: string | null
          ai_score?: number
          child_id?: string
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["match_decision"]
          id?: string
          reviewer_id?: string | null
          reviewer_reason?: string | null
          sighting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_candidates_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "missing_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_sighting_id_fkey"
            columns: ["sighting_id"]
            isOneToOne: false
            referencedRelation: "sightings"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_children: {
        Row: {
          age: number
          county: string | null
          created_at: string
          description: string | null
          first_name: string
          gender: string | null
          id: string
          last_initial: string | null
          last_seen_at: string | null
          last_seen_lat: number | null
          last_seen_lng: number | null
          last_seen_location_text: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
        }
        Insert: {
          age: number
          county?: string | null
          created_at?: string
          description?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_initial?: string | null
          last_seen_at?: string | null
          last_seen_lat?: number | null
          last_seen_lng?: number | null
          last_seen_location_text?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Update: {
          age?: number
          county?: string | null
          created_at?: string
          description?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_initial?: string | null
          last_seen_at?: string | null
          last_seen_lat?: number | null
          last_seen_lng?: number | null
          last_seen_location_text?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          county: string | null
          created_at: string
          id: string
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          verified: boolean
        }
        Insert: {
          county?: string | null
          created_at?: string
          id?: string
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          verified?: boolean
        }
        Update: {
          county?: string | null
          created_at?: string
          id?: string
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      sightings: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          location_text: string | null
          notes: string | null
          reporter_id: string
          seen_at: string
          status: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string | null
          notes?: string | null
          reporter_id: string
          seen_at?: string
          status?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string | null
          notes?: string | null
          reporter_id?: string
          seen_at?: string
          status?: string
          storage_path?: string
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
      ensure_user_account_defaults: {
        Args: { _full_name?: string; _phone?: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "parent_guardian"
        | "school_shelter"
        | "police_admin"
        | "super_admin"
      case_status: "open" | "under_review" | "matched" | "closed"
      match_decision: "pending" | "confirmed" | "rejected" | "escalated"
      org_type: "police" | "school" | "shelter" | "hospital" | "ngo"
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
      app_role: [
        "parent_guardian",
        "school_shelter",
        "police_admin",
        "super_admin",
      ],
      case_status: ["open", "under_review", "matched", "closed"],
      match_decision: ["pending", "confirmed", "rejected", "escalated"],
      org_type: ["police", "school", "shelter", "hospital", "ngo"],
    },
  },
} as const

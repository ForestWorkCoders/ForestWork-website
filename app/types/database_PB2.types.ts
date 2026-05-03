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
  plazmaburst: {
    Tables: {
      maps: {
        Row: {
          category: Database["plazmaburst"]["Enums"]["map_category"]
          id: string
          name: string
          pb2_map_id: string
          thumbnail_url: string
        }
        Insert: {
          category: Database["plazmaburst"]["Enums"]["map_category"]
          id?: string
          name: string
          pb2_map_id: string
          thumbnail_url: string
        }
        Update: {
          category?: Database["plazmaburst"]["Enums"]["map_category"]
          id?: string
          name?: string
          pb2_map_id?: string
          thumbnail_url?: string
        }
        Relationships: []
      }
      match_game_stats: {
        Row: {
          aces: number
          deaths: number
          double_kills: number
          headshots: number
          id: string
          kills: number
          match_game_id: string
          penta_kills: number
          player_id: string
          quad_kills: number
          team_id: string
          triple_kills: number
        }
        Insert: {
          aces?: number
          deaths?: number
          double_kills?: number
          headshots?: number
          id?: string
          kills?: number
          match_game_id: string
          penta_kills?: number
          player_id: string
          quad_kills?: number
          team_id: string
          triple_kills?: number
        }
        Update: {
          aces?: number
          deaths?: number
          double_kills?: number
          headshots?: number
          id?: string
          kills?: number
          match_game_id?: string
          penta_kills?: number
          player_id?: string
          quad_kills?: number
          team_id?: string
          triple_kills?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_game_stats_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          blue_team_score: number
          game_number: number
          id: string
          map_id: string
          match_id: string
          red_team_score: number
          round_history: number[]
          status: Database["plazmaburst"]["Enums"]["match_status"]
        }
        Insert: {
          blue_team_score: number
          game_number: number
          id?: string
          map_id: string
          match_id: string
          red_team_score: number
          round_history: number[]
          status?: Database["plazmaburst"]["Enums"]["match_status"]
        }
        Update: {
          blue_team_score?: number
          game_number?: number
          id?: string
          map_id?: string
          match_id?: string
          red_team_score?: number
          round_history?: number[]
          status?: Database["plazmaburst"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "match_games_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          blue_team_id: string
          blue_team_score: number | null
          bracket_position: string | null
          completed_at: string | null
          format: Database["plazmaburst"]["Enums"]["match_format"]
          id: string
          next_loser_match_id: string | null
          next_match_id: string | null
          phase_tag: string
          red_team_id: string
          red_team_score: number | null
          scheduled_at: string | null
          status: Database["plazmaburst"]["Enums"]["match_status"]
          tournament_id: string
        }
        Insert: {
          blue_team_id: string
          blue_team_score?: number | null
          bracket_position?: string | null
          completed_at?: string | null
          format?: Database["plazmaburst"]["Enums"]["match_format"]
          id?: string
          next_loser_match_id?: string | null
          next_match_id?: string | null
          phase_tag: string
          red_team_id: string
          red_team_score?: number | null
          scheduled_at?: string | null
          status?: Database["plazmaburst"]["Enums"]["match_status"]
          tournament_id: string
        }
        Update: {
          blue_team_id?: string
          blue_team_score?: number | null
          bracket_position?: string | null
          completed_at?: string | null
          format?: Database["plazmaburst"]["Enums"]["match_format"]
          id?: string
          next_loser_match_id?: string | null
          next_match_id?: string | null
          phase_tag?: string
          red_team_id?: string
          red_team_score?: number | null
          scheduled_at?: string | null
          status?: Database["plazmaburst"]["Enums"]["match_status"]
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_blue_team_id_fkey"
            columns: ["blue_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_loser_match_id_fkey"
            columns: ["next_loser_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_red_team_id_fkey"
            columns: ["red_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          discord_id: number | null
          id: string
          nickname: string
          profile_img: string | null
          profile_url: string | null
        }
        Insert: {
          created_at?: string
          discord_id?: number | null
          id?: string
          nickname: string
          profile_img?: string | null
          profile_url?: string | null
        }
        Update: {
          created_at?: string
          discord_id?: number | null
          id?: string
          nickname?: string
          profile_img?: string | null
          profile_url?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: number
          joined_at: string | null
          left_at: string | null
          player_id: string
          role: Database["plazmaburst"]["Enums"]["role"]
          status: Database["plazmaburst"]["Enums"]["status"] | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          joined_at?: string | null
          left_at?: string | null
          player_id: string
          role?: Database["plazmaburst"]["Enums"]["role"]
          status?: Database["plazmaburst"]["Enums"]["status"] | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: number
          joined_at?: string | null
          left_at?: string | null
          player_id?: string
          role?: Database["plazmaburst"]["Enums"]["role"]
          status?: Database["plazmaburst"]["Enums"]["status"] | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          colour: string
          created_at: string
          id: string
          logo: string | null
          name: string
          notes: string | null
          short_sign: string
          tournament_id: string
        }
        Insert: {
          colour: string
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          notes?: string | null
          short_sign: string
          tournament_id: string
        }
        Update: {
          colour?: string
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          notes?: string | null
          short_sign?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tourney_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          content_url: string | null
          created_at: string | null
          format: string
          icon: string
          id: string
          organizer: string | null
          phase_configs: Json | null
          region: string | null
          tier: string | null
          title: string
          updates_at: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string | null
          format?: string
          icon?: string
          id?: string
          organizer?: string | null
          phase_configs?: Json | null
          region?: string | null
          tier?: string | null
          title: string
          updates_at: string
        }
        Update: {
          content_url?: string | null
          created_at?: string | null
          format?: string
          icon?: string
          id?: string
          organizer?: string | null
          phase_configs?: Json | null
          region?: string | null
          tier?: string | null
          title?: string
          updates_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      map_category: "arena" | "rails" | "snipers" | "rockets" | "rays" | "snd"
      match_format: "BO1" | "BO3" | "BO5" | "BO7"
      match_status:
        | "Upcoming"
        | "Completed"
        | "Walkover_Red"
        | "Walkover_Blue"
        | "Draw"
        | "Cancelled"
      role: "manager" | "player" | "substitute"
      status: "active" | "inactive" | "retired" | "traded" | "released"
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
  plazmaburst: {
    Enums: {
      map_category: ["arena", "rails", "snipers", "rockets", "rays", "snd"],
      match_format: ["BO1", "BO3", "BO5", "BO7"],
      match_status: [
        "Upcoming",
        "Completed",
        "Walkover_Red",
        "Walkover_Blue",
        "Draw",
        "Cancelled",
      ],
      role: ["manager", "player", "substitute"],
      status: ["active", "inactive", "retired", "traded", "released"],
    },
  },
} as const

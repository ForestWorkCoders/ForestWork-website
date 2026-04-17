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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  mahjong: {
    Tables: {
      matches: {
        Row: {
          east_id: number
          east_score: number
          end_time: string
          id: number
          north_id: number | null
          north_score: number | null
          south_id: number
          south_score: number
          start_time: string
          tag: number
          tournament_bind_id: string
          uuid: string
          west_id: number
          west_score: number
        }
        Insert: {
          east_id: number
          east_score: number
          end_time: string
          id?: number
          north_id?: number | null
          north_score?: number | null
          south_id: number
          south_score: number
          start_time: string
          tag: number
          tournament_bind_id: string
          uuid: string
          west_id: number
          west_score: number
        }
        Update: {
          east_id?: number
          east_score?: number
          end_time?: string
          id?: number
          north_id?: number | null
          north_score?: number | null
          south_id?: number
          south_score?: number
          start_time?: string
          tag?: number
          tournament_bind_id?: string
          uuid?: string
          west_id?: number
          west_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_east_id_fkey"
            columns: ["east_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "matches_south_id_fkey"
            columns: ["south_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "matches_tournament_bind_id_fkey"
            columns: ["tournament_bind_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_west_id_fkey"
            columns: ["west_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["account_id"]
          },
        ]
      }
      participants: {
        Row: {
          account_id: number
          discord_id: number | null
          id: number
          nickname: string
        }
        Insert: {
          account_id: number
          discord_id?: number | null
          id?: number
          nickname: string
        }
        Update: {
          account_id?: number
          discord_id?: number | null
          id?: number
          nickname?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string | null
          dnfThreshold: number
          icon: string | null
          id: string
          organizer: string | null
          region: string | null
          tier: string | null
          title: string
          updates_at: string
        }
        Insert: {
          created_at?: string | null
          dnfThreshold?: number
          icon?: string | null
          id?: string
          organizer?: string | null
          region?: string | null
          tier?: string | null
          title: string
          updates_at: string
        }
        Update: {
          created_at?: string | null
          dnfThreshold?: number
          icon?: string | null
          id?: string
          organizer?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      mahjong_data: {
        Row: {
          account_id: number
          discord_id: number
          username: string
        }
        Insert: {
          account_id: number
          discord_id: number
          username: string
        }
        Update: {
          account_id?: number
          discord_id?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "mahjong_data_discord_id_fkey"
            columns: ["discord_id"]
            isOneToOne: true
            referencedRelation: "participant_data"
            referencedColumns: ["discord_id"]
          },
        ]
      }
      participant_data: {
        Row: {
          discord_id: number
          discord_username: string
          id: number
          profile_img: string | null
        }
        Insert: {
          discord_id: number
          discord_username: string
          id?: number
          profile_img?: string | null
        }
        Update: {
          discord_id?: number
          discord_username?: string
          id?: number
          profile_img?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      overall_rankings_2023: {
        Row: {
          account_id: number | null
          first_place_count: number | null
          first_place_percentage: number | null
          nickname: string | null
          second_place_count: number | null
          second_place_percentage: number | null
          third_place_count: number | null
          third_place_percentage: number | null
        }
        Relationships: []
      }
      overall_rankings_2024: {
        Row: {
          account_id: number | null
          first_place_count: number | null
          first_place_percentage: number | null
          nickname: string | null
          second_place_count: number | null
          second_place_percentage: number | null
          third_place_count: number | null
          third_place_percentage: number | null
        }
        Relationships: []
      }
      overall_rankings_2025: {
        Row: {
          account_id: number | null
          first_place_count: number | null
          first_place_percentage: number | null
          nickname: string | null
          second_place_count: number | null
          second_place_percentage: number | null
          third_place_count: number | null
          third_place_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      available_months: { Args: { league: string }; Returns: string[] }
      count_tables: { Args: { league: string }; Returns: number }
      fetch_game_results: {
        Args: { game_id: number; league_month: string; league_year: string }
        Returns: {
          adjusted_east_point_diff: number
          adjusted_south_point_diff: number
          adjusted_west_point_diff: number
          east_nickname: string
          east_score: number
          game_end_time: string
          south_nickname: string
          south_score: number
          uuid: string
          west_nickname: string
          west_score: number
        }[]
      }
      fetch_group_season: {
        Args: { season_param: number }
        Returns: {
          defender_name: string
          defender_score: number
          diff_100000_striker: number
          diff_midfield_defender: number
          diff_striker_midfield: number
          finals: boolean
          match: string
          midfield_name: string
          midfield_score: number
          season: number
          striker_name: string
          striker_score: number
          team_name: string
        }[]
      }
      fetch_league_participants: {
        Args: { league_month: string; league_year: string }
        Returns: {
          discord_id: number
          discord_username: string
          game_1: number
          game_10: number
          game_11: number
          game_12: number
          game_13: number
          game_14: number
          game_15: number
          game_16: number
          game_2: number
          game_3: number
          game_4: number
          game_5: number
          game_6: number
          game_7: number
          game_8: number
          game_9: number
          profile_img: string
          rank: number
          rank_label: string
          total: number
        }[]
      }
      fetch_league_participants_new: {
        Args: { league_month: string; league_year: number }
        Returns: {
          discord_username: string
          game_1: number
          game_10: number
          game_11: number
          game_12: number
          game_13: number
          game_14: number
          game_15: number
          game_16: number
          game_2: number
          game_3: number
          game_4: number
          game_5: number
          game_6: number
          game_7: number
          game_8: number
          game_9: number
          participation_count: number
          profile_img: string
          rank: number
          rank_label: string
          total: number
        }[]
      }
      fwmp_rankings: {
        Args: { league_schema: string }
        Returns: {
          april: number
          august: number
          discord_username: string
          february: number
          january: number
          july: number
          june: number
          march: number
          may: number
          november: number
          october: number
          profile_img: string
          rank: number
          september: number
          total: number
        }[]
      }
      get_adjusted_point_diff: {
        Args: {
          east_score: number
          south_score: number
          team: string
          west_score: number
        }
        Returns: number
      }
      get_available_months: {
        Args: { year: number }
        Returns: {
          month: string
          month_number: number
        }[]
      }
      get_discord_ids: { Args: never; Returns: string[] }
      get_individual_records_new: {
        Args: never
        Returns: {
          month: number
          year: number
        }[]
      }
      get_participants: {
        Args: never
        Returns: {
          discord_id: number
          discord_username: string
          mahjongsoul_id: number
          mahjongsoul_name: string
          profile_img: string
        }[]
      }
      get_player_meetup_frequency: {
        Args: never
        Returns: {
          meet_up_count: number
          player1: number
          player1_name: string
          player2: number
          player2_name: string
        }[]
      }
      get_player_recent_ranks: {
        Args: { matches_count: number; p_player_id: number }
        Returns: number[]
      }
      get_seat_frequency: {
        Args: never
        Returns: {
          account_id: number
          east: number
          mahjong_username: string
          south: number
          west: number
        }[]
      }
      get_team_data: {
        Args: { season_param: string }
        Returns: {
          defender: string
          hex_color: number
          leader: number
          midfield: string
          season: number
          striker: string
          substitude: string
          team_name: string
        }[]
      }
      update_user_data: {
        Args: { new_pfp: string; new_username: string; user_id: number }
        Returns: undefined
      }
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
  mahjong: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

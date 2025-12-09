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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_download_links: {
        Row: {
          app_store_url: string | null
          google_play_url: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          app_store_url?: string | null
          google_play_url?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          app_store_url?: string | null
          google_play_url?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      app_session_events: {
        Row: {
          browser: string | null
          city: string | null
          country_code: string | null
          created_at: string
          device_info: Json | null
          device_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          os_version: string | null
          screen_size: string | null
          session_duration_seconds: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_info?: Json | null
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          os_version?: string | null
          screen_size?: string | null
          session_duration_seconds?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_info?: Json | null
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          os_version?: string | null
          screen_size?: string | null
          session_duration_seconds?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      bonus_claim_events: {
        Row: {
          bonus_type: string
          coins_amount: number | null
          created_at: string
          event_type: string
          id: string
          lives_amount: number | null
          metadata: Json | null
          session_id: string
          streak_day: number | null
          user_id: string
        }
        Insert: {
          bonus_type: string
          coins_amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          lives_amount?: number | null
          metadata?: Json | null
          session_id: string
          streak_day?: number | null
          user_id: string
        }
        Update: {
          bonus_type?: string
          coins_amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          lives_amount?: number | null
          metadata?: Json | null
          session_id?: string
          streak_day?: number | null
          user_id?: string
        }
        Relationships: []
      }
      booster_purchases: {
        Row: {
          booster_type_id: string
          created_at: string
          gold_spent: number
          iap_transaction_id: string | null
          id: string
          purchase_context: string | null
          purchase_source: string
          usd_cents_spent: number
          user_id: string
        }
        Insert: {
          booster_type_id: string
          created_at?: string
          gold_spent?: number
          iap_transaction_id?: string | null
          id?: string
          purchase_context?: string | null
          purchase_source: string
          usd_cents_spent?: number
          user_id: string
        }
        Update: {
          booster_type_id?: string
          created_at?: string
          gold_spent?: number
          iap_transaction_id?: string | null
          id?: string
          purchase_context?: string | null
          purchase_source?: string
          usd_cents_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booster_purchases_booster_type_id_fkey"
            columns: ["booster_type_id"]
            isOneToOne: false
            referencedRelation: "booster_types"
            referencedColumns: ["id"]
          },
        ]
      }
      booster_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_gold: number | null
          price_usd_cents: number | null
          reward_gold: number
          reward_lives: number
          reward_speed_count: number
          reward_speed_duration_min: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_gold?: number | null
          price_usd_cents?: number | null
          reward_gold?: number
          reward_lives?: number
          reward_speed_count?: number
          reward_speed_duration_min?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_gold?: number | null
          price_usd_cents?: number | null
          reward_gold?: number
          reward_lives?: number
          reward_speed_count?: number
          reward_speed_duration_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_interaction_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          target_user_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          target_user_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          target_user_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          product_type: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          product_type?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          product_type?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_leaderboard_snapshot: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string | null
          id: string
          rank: number
          snapshot_date: string
          total_correct_answers: number
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          rank: number
          snapshot_date: string
          total_correct_answers?: number
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          rank?: number
          snapshot_date?: string
          total_correct_answers?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      daily_prize_table: {
        Row: {
          created_at: string | null
          day_of_week: number
          gold: number
          lives: number
          rank: number
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number
          gold?: number
          lives?: number
          rank: number
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          gold?: number
          lives?: number
          rank?: number
        }
        Relationships: []
      }
      daily_rankings: {
        Row: {
          average_response_time: number | null
          category: string
          created_at: string | null
          day_date: string
          id: string
          rank: number | null
          total_correct_answers: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_response_time?: number | null
          category?: string
          created_at?: string | null
          day_date: string
          id?: string
          rank?: number | null
          total_correct_answers?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_response_time?: number | null
          category?: string
          created_at?: string | null
          day_date?: string
          id?: string
          rank?: number | null
          total_correct_answers?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_winner_awarded: {
        Row: {
          avatar_url: string | null
          awarded_at: string | null
          claimed_at: string | null
          country_code: string | null
          day_date: string
          dismissed_at: string | null
          gold_awarded: number
          id: string
          is_sunday_jackpot: boolean
          lives_awarded: number
          rank: number
          reward_payload: Json | null
          status: string
          total_correct_answers: number | null
          user_id: string
          user_timezone: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          awarded_at?: string | null
          claimed_at?: string | null
          country_code?: string | null
          day_date: string
          dismissed_at?: string | null
          gold_awarded?: number
          id?: string
          is_sunday_jackpot?: boolean
          lives_awarded?: number
          rank: number
          reward_payload?: Json | null
          status?: string
          total_correct_answers?: number | null
          user_id: string
          user_timezone?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          awarded_at?: string | null
          claimed_at?: string | null
          country_code?: string | null
          day_date?: string
          dismissed_at?: string | null
          gold_awarded?: number
          id?: string
          is_sunday_jackpot?: boolean
          lives_awarded?: number
          rank?: number
          reward_payload?: Json | null
          status?: string
          total_correct_answers?: number | null
          user_id?: string
          user_timezone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      daily_winner_popup_shown: {
        Row: {
          day_date: string
          shown_at: string | null
          user_id: string
        }
        Insert: {
          day_date: string
          shown_at?: string | null
          user_id: string
        }
        Update: {
          day_date?: string
          shown_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_winner_processing_log: {
        Row: {
          created_at: string | null
          last_processed_at: string
          last_processed_date: string
          timezone: string
        }
        Insert: {
          created_at?: string | null
          last_processed_at?: string
          last_processed_date: string
          timezone: string
        }
        Update: {
          created_at?: string | null
          last_processed_at?: string
          last_processed_date?: string
          timezone?: string
        }
        Relationships: []
      }
      daily_winners_popup_views: {
        Row: {
          created_at: string | null
          id: string
          last_shown_day: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_shown_day: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_shown_day?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_collection_metadata: {
        Row: {
          collection_start_date: string
          created_at: string
          description: string
          feature_name: string
          id: string
        }
        Insert: {
          collection_start_date: string
          created_at?: string
          description: string
          feature_name: string
          id?: string
        }
        Update: {
          collection_start_date?: string
          created_at?: string
          description?: string
          feature_name?: string
          id?: string
        }
        Relationships: []
      }
      device_geo_analytics: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          connection_type: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          device_model: string | null
          device_type: string | null
          device_vendor: string | null
          downlink_mbps: number | null
          effective_connection_type: string | null
          id: string
          is_touch_device: boolean | null
          os: string | null
          os_version: string | null
          pixel_ratio: number | null
          region: string | null
          rtt_ms: number | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          timezone: string | null
          user_id: string
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          connection_type?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          downlink_mbps?: number | null
          effective_connection_type?: string | null
          id?: string
          is_touch_device?: boolean | null
          os?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          region?: string | null
          rtt_ms?: number | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          timezone?: string | null
          user_id: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          connection_type?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          downlink_mbps?: number | null
          effective_connection_type?: string | null
          id?: string
          is_touch_device?: boolean | null
          os?: string | null
          os_version?: string | null
          pixel_ratio?: number | null
          region?: string | null
          rtt_ms?: number | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          timezone?: string | null
          user_id?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "device_geo_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_geo_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_deleted: boolean
          message_seq: number
          sender_id: string
          status: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_seq?: never
          sender_id: string
          status?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_seq?: never
          sender_id?: string
          status?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          archived_by_user_a: boolean | null
          archived_by_user_b: boolean | null
          created_at: string
          id: string
          last_message_at: string | null
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          archived_by_user_a?: boolean | null
          archived_by_user_b?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_id_a: string
          user_id_b: string
        }
        Update: {
          archived_by_user_a?: boolean | null
          archived_by_user_b?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      engagement_analytics: {
        Row: {
          avg_session_duration: number | null
          avg_sessions_per_user: number | null
          created_at: string | null
          date: string
          engagement_by_time: Json | null
          feature_usage: Json | null
          game_engagement: Json | null
          id: string
          most_active_users: Json | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          avg_session_duration?: number | null
          avg_sessions_per_user?: number | null
          created_at?: string | null
          date: string
          engagement_by_time?: Json | null
          feature_usage?: Json | null
          game_engagement?: Json | null
          id?: string
          most_active_users?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_session_duration?: number | null
          avg_sessions_per_user?: number | null
          created_at?: string | null
          date?: string
          engagement_by_time?: Json | null
          feature_usage?: Json | null
          game_engagement?: Json | null
          id?: string
          most_active_users?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          error_component: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          is_fatal: boolean | null
          metadata: Json | null
          page_route: string
          session_id: string
          severity: string
          user_action: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_component?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          is_fatal?: boolean | null
          metadata?: Json | null
          page_route: string
          session_id: string
          severity?: string
          user_action?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_component?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          is_fatal?: boolean | null
          metadata?: Json | null
          page_route?: string
          session_id?: string
          severity?: string
          user_action?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_events: {
        Row: {
          action: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_type: string
          feature_name: string
          id: string
          metadata: Json | null
          session_id: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          feature_name: string
          id?: string
          metadata?: Json | null
          session_id: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      friend_request_rate_limit: {
        Row: {
          last_request_at: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          last_request_at?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          last_request_at?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          requested_by: string | null
          source: string | null
          status: string
          updated_at: string
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      game_exit_events: {
        Row: {
          category: string
          correct_answers: number | null
          created_at: string
          event_type: string
          exit_reason: string | null
          id: string
          metadata: Json | null
          question_index: number
          session_id: string
          time_played_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          category: string
          correct_answers?: number | null
          created_at?: string
          event_type: string
          exit_reason?: string | null
          id?: string
          metadata?: Json | null
          question_index: number
          session_id: string
          time_played_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          category?: string
          correct_answers?: number | null
          created_at?: string
          event_type?: string
          exit_reason?: string | null
          id?: string
          metadata?: Json | null
          question_index?: number
          session_id?: string
          time_played_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      game_help_usage: {
        Row: {
          category: string
          created_at: string
          game_result_id: string | null
          help_type: string
          id: string
          question_index: number
          used_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          game_result_id?: string | null
          help_type: string
          id?: string
          question_index: number
          used_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          game_result_id?: string | null
          help_type?: string
          id?: string
          question_index?: number
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_help_usage_game_result_id_fkey"
            columns: ["game_result_id"]
            isOneToOne: false
            referencedRelation: "game_results"
            referencedColumns: ["id"]
          },
        ]
      }
      game_question_analytics: {
        Row: {
          category: string
          created_at: string
          difficulty_level: string | null
          game_result_id: string | null
          help_used: string | null
          id: string
          question_id: string | null
          question_index: number
          response_time_seconds: number
          session_id: string
          user_id: string
          was_correct: boolean
        }
        Insert: {
          category: string
          created_at?: string
          difficulty_level?: string | null
          game_result_id?: string | null
          help_used?: string | null
          id?: string
          question_id?: string | null
          question_index: number
          response_time_seconds: number
          session_id: string
          user_id: string
          was_correct: boolean
        }
        Update: {
          category?: string
          created_at?: string
          difficulty_level?: string | null
          game_result_id?: string | null
          help_used?: string | null
          id?: string
          question_id?: string | null
          question_index?: number
          response_time_seconds?: number
          session_id?: string
          user_id?: string
          was_correct?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_question_analytics_game_result_id_fkey"
            columns: ["game_result_id"]
            isOneToOne: false
            referencedRelation: "game_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_question_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_question_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          average_response_time: number | null
          category: string
          coins_earned: number
          completed: boolean | null
          completed_at: string | null
          correct_answers: number
          created_at: string | null
          id: string
          total_questions: number
          user_id: string
        }
        Insert: {
          average_response_time?: number | null
          category: string
          coins_earned?: number
          completed?: boolean | null
          completed_at?: string | null
          correct_answers?: number
          created_at?: string | null
          id?: string
          total_questions?: number
          user_id: string
        }
        Update: {
          average_response_time?: number | null
          category?: string
          coins_earned?: number
          completed?: boolean | null
          completed_at?: string | null
          correct_answers?: number
          created_at?: string | null
          id?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_session_pools: {
        Row: {
          id: string
          last_pool_order: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_pool_order: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_pool_order?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          category: string
          completed_at: string | null
          correct_answers: number
          created_at: string
          current_question: number
          expires_at: string
          id: string
          pending_rescue: boolean | null
          pending_rescue_session_id: string | null
          questions: Json
          rescue_completed_at: string | null
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          current_question?: number
          expires_at: string
          id?: string
          pending_rescue?: boolean | null
          pending_rescue_session_id?: string | null
          questions: Json
          rescue_completed_at?: string | null
          session_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          current_question?: number
          expires_at?: string
          id?: string
          pending_rescue?: boolean | null
          pending_rescue_session_id?: string | null
          questions?: Json
          rescue_completed_at?: string | null
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_leaderboard: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          rank: number | null
          total_correct_answers: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          rank?: number | null
          total_correct_answers?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          rank?: number | null
          total_correct_answers?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          created_at: string | null
          id: string
          invitation_code: string
          invited_email: string | null
          invited_user_id: string | null
          inviter_id: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_code: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_code?: string
          invited_email?: string | null
          invited_user_id?: string | null
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_cache: {
        Row: {
          avatar_url: string | null
          cached_at: string | null
          country_code: string
          rank: number
          total_correct_answers: number
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          cached_at?: string | null
          country_code: string
          rank: number
          total_correct_answers: number
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          cached_at?: string | null
          country_code?: string
          rank?: number
          total_correct_answers?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      leaderboard_public_cache: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          rank: number
          total_correct_answers: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          rank: number
          total_correct_answers?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          rank?: number
          total_correct_answers?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string
          document_key: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          document_key: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          document_key?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lives_ledger: {
        Row: {
          correlation_id: string
          created_at: string | null
          delta_lives: number
          id: string
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          correlation_id: string
          created_at?: string | null
          delta_lives: number
          id?: string
          metadata?: Json | null
          source: string
          user_id: string
        }
        Update: {
          correlation_id?: string
          created_at?: string | null
          delta_lives?: number
          id?: string
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      lives_ledger_archive: {
        Row: {
          archived_at: string | null
          correlation_id: string
          created_at: string | null
          delta_lives: number
          id: string
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          correlation_id: string
          created_at?: string | null
          delta_lives: number
          id?: string
          metadata?: Json | null
          source: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          correlation_id?: string
          created_at?: string | null
          delta_lives?: number
          id?: string
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          email: string
          failed_attempts: number
          last_attempt_at: string
          locked_until: string | null
        }
        Insert: {
          email: string
          failed_attempts?: number
          last_attempt_at?: string
          locked_until?: string | null
        }
        Update: {
          email?: string
          failed_attempts?: number
          last_attempt_at?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      login_attempts_pin: {
        Row: {
          failed_attempts: number | null
          last_attempt_at: string | null
          locked_until: string | null
          username: string
        }
        Insert: {
          failed_attempts?: number | null
          last_attempt_at?: string | null
          locked_until?: string | null
          username: string
        }
        Update: {
          failed_attempts?: number | null
          last_attempt_at?: string | null
          locked_until?: string | null
          username?: string
        }
        Relationships: []
      }
      message_media: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          file_name: string | null
          file_size: number | null
          height: number | null
          id: string
          media_type: string
          media_url: string
          message_id: string
          mime_type: string | null
          thumbnail_url: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          media_type: string
          media_url: string
          message_id: string
          mime_type?: string | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          media_type?: string
          media_url?: string
          message_id?: string
          mime_type?: string | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "dm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "dm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          is_reported: boolean | null
          link_preview_image: string | null
          link_preview_url: string | null
          media_type: string | null
          media_url: string | null
          retention_until: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_reported?: boolean | null
          link_preview_image?: string | null
          link_preview_url?: string | null
          media_type?: string | null
          media_url?: string | null
          retention_until?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_reported?: boolean | null
          link_preview_image?: string | null
          link_preview_url?: string | null
          media_type?: string | null
          media_url?: string | null
          retention_until?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_events: {
        Row: {
          created_at: string
          device_info: Json | null
          event_type: string
          id: string
          metadata: Json | null
          page_route: string
          previous_route: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_route: string
          previous_route?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_route?: string
          previous_route?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          browser: string | null
          cls: number | null
          connection_type: string | null
          created_at: string
          device_type: string | null
          fcp_ms: number | null
          fid_ms: number | null
          id: string
          lcp_ms: number | null
          load_time_ms: number
          page_route: string
          session_id: string
          ttfb_ms: number | null
          tti_ms: number | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          cls?: number | null
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          load_time_ms: number
          page_route: string
          session_id: string
          ttfb_ms?: number | null
          tti_ms?: number | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          cls?: number | null
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          load_time_ms?: number
          page_route?: string
          session_id?: string
          ttfb_ms?: number | null
          tti_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_summary: {
        Row: {
          avg_cls: number | null
          avg_lcp: number | null
          avg_load_time: number | null
          avg_ttfb: number | null
          created_at: string | null
          date: string
          error_count: number | null
          errors_by_page: Json | null
          id: string
          performance_by_browser: Json | null
          performance_by_device: Json | null
          performance_by_page: Json | null
          top_errors: Json | null
          updated_at: string | null
        }
        Insert: {
          avg_cls?: number | null
          avg_lcp?: number | null
          avg_load_time?: number | null
          avg_ttfb?: number | null
          created_at?: string | null
          date: string
          error_count?: number | null
          errors_by_page?: Json | null
          id?: string
          performance_by_browser?: Json | null
          performance_by_device?: Json | null
          performance_by_page?: Json | null
          top_errors?: Json | null
          updated_at?: string | null
        }
        Update: {
          avg_cls?: number | null
          avg_lcp?: number | null
          avg_load_time?: number | null
          avg_ttfb?: number | null
          created_at?: string | null
          date?: string
          error_count?: number | null
          errors_by_page?: Json | null
          id?: string
          performance_by_browser?: Json | null
          performance_by_device?: Json | null
          performance_by_page?: Json | null
          top_errors?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pin_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_speed_expires_at: string | null
          age_consent: boolean | null
          age_verified: boolean | null
          avatar_url: string | null
          biometric_enabled: boolean | null
          birth_date: string | null
          challenge_expires_at: string | null
          coins: number | null
          country_code: string
          created_at: string | null
          daily_gift_last_claimed: string | null
          daily_gift_last_seen: string | null
          daily_gift_streak: number | null
          device_id: string | null
          email: string | null
          email_pin_setup_completed: boolean | null
          email_verified: boolean | null
          first_login_age_gate_completed: boolean | null
          help_2x_answer_active: boolean | null
          help_audience_active: boolean | null
          help_third_active: boolean | null
          id: string
          invitation_code: string | null
          invitation_rewards_reset_at: string | null
          last_invitation_reward_reset: string | null
          last_life_regeneration: string | null
          last_username_change: string | null
          legal_consent: boolean | null
          legal_consent_at: string | null
          lives: number | null
          lives_regeneration_rate: number | null
          max_lives: number | null
          pin_hash: string
          pin_reset_attempts: number | null
          pin_reset_last_attempt_at: string | null
          preferred_country: string | null
          preferred_language: string | null
          question_swaps_available: number | null
          recovery_code_hash: string | null
          recovery_code_set_at: string | null
          terms_accepted_at: string | null
          total_correct_answers: number
          updated_at: string | null
          user_timezone: string | null
          username: string
          webauthn_challenge: string | null
          webauthn_credential_id: string | null
          webauthn_public_key: string | null
          welcome_bonus_claimed: boolean | null
        }
        Insert: {
          active_speed_expires_at?: string | null
          age_consent?: boolean | null
          age_verified?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          birth_date?: string | null
          challenge_expires_at?: string | null
          coins?: number | null
          country_code?: string
          created_at?: string | null
          daily_gift_last_claimed?: string | null
          daily_gift_last_seen?: string | null
          daily_gift_streak?: number | null
          device_id?: string | null
          email?: string | null
          email_pin_setup_completed?: boolean | null
          email_verified?: boolean | null
          first_login_age_gate_completed?: boolean | null
          help_2x_answer_active?: boolean | null
          help_audience_active?: boolean | null
          help_third_active?: boolean | null
          id: string
          invitation_code?: string | null
          invitation_rewards_reset_at?: string | null
          last_invitation_reward_reset?: string | null
          last_life_regeneration?: string | null
          last_username_change?: string | null
          legal_consent?: boolean | null
          legal_consent_at?: string | null
          lives?: number | null
          lives_regeneration_rate?: number | null
          max_lives?: number | null
          pin_hash: string
          pin_reset_attempts?: number | null
          pin_reset_last_attempt_at?: string | null
          preferred_country?: string | null
          preferred_language?: string | null
          question_swaps_available?: number | null
          recovery_code_hash?: string | null
          recovery_code_set_at?: string | null
          terms_accepted_at?: string | null
          total_correct_answers?: number
          updated_at?: string | null
          user_timezone?: string | null
          username: string
          webauthn_challenge?: string | null
          webauthn_credential_id?: string | null
          webauthn_public_key?: string | null
          welcome_bonus_claimed?: boolean | null
        }
        Update: {
          active_speed_expires_at?: string | null
          age_consent?: boolean | null
          age_verified?: boolean | null
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          birth_date?: string | null
          challenge_expires_at?: string | null
          coins?: number | null
          country_code?: string
          created_at?: string | null
          daily_gift_last_claimed?: string | null
          daily_gift_last_seen?: string | null
          daily_gift_streak?: number | null
          device_id?: string | null
          email?: string | null
          email_pin_setup_completed?: boolean | null
          email_verified?: boolean | null
          first_login_age_gate_completed?: boolean | null
          help_2x_answer_active?: boolean | null
          help_audience_active?: boolean | null
          help_third_active?: boolean | null
          id?: string
          invitation_code?: string | null
          invitation_rewards_reset_at?: string | null
          last_invitation_reward_reset?: string | null
          last_life_regeneration?: string | null
          last_username_change?: string | null
          legal_consent?: boolean | null
          legal_consent_at?: string | null
          lives?: number | null
          lives_regeneration_rate?: number | null
          max_lives?: number | null
          pin_hash?: string
          pin_reset_attempts?: number | null
          pin_reset_last_attempt_at?: string | null
          preferred_country?: string | null
          preferred_language?: string | null
          question_swaps_available?: number | null
          recovery_code_hash?: string | null
          recovery_code_set_at?: string | null
          terms_accepted_at?: string | null
          total_correct_answers?: number
          updated_at?: string | null
          user_timezone?: string | null
          username?: string
          webauthn_challenge?: string | null
          webauthn_credential_id?: string | null
          webauthn_public_key?: string | null
          welcome_bonus_claimed?: boolean | null
        }
        Relationships: []
      }
      question_pools: {
        Row: {
          created_at: string | null
          id: string
          pool_order: number
          question_count: number | null
          questions: Json[]
          questions_en: Json | null
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          pool_order: number
          question_count?: number | null
          questions?: Json[]
          questions_en?: Json | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          pool_order?: number
          question_count?: number | null
          questions?: Json[]
          questions_en?: Json | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      question_seen_history: {
        Row: {
          question_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          question_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          question_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_seen_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_seen_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_seen_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_translations: {
        Row: {
          answer_a: string
          answer_b: string
          answer_c: string
          created_at: string
          explanation: string | null
          id: string
          lang: string
          question_id: string
          question_text: string
          updated_at: string
        }
        Insert: {
          answer_a: string
          answer_b: string
          answer_c: string
          created_at?: string
          explanation?: string | null
          id?: string
          lang: string
          question_id: string
          question_text: string
          updated_at?: string
        }
        Update: {
          answer_a?: string
          answer_b?: string
          answer_c?: string
          created_at?: string
          explanation?: string | null
          id?: string
          lang?: string
          question_id?: string
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_translations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answers: Json
          audience: Json
          correct_answer: string | null
          created_at: string | null
          id: string
          question: string
          source_category: string
          third: string
          topic_id: number | null
        }
        Insert: {
          answers: Json
          audience: Json
          correct_answer?: string | null
          created_at?: string | null
          id: string
          question: string
          source_category: string
          third: string
          topic_id?: number | null
        }
        Update: {
          answers?: Json
          audience?: Json
          correct_answer?: string | null
          created_at?: string | null
          id?: string
          question?: string
          source_category?: string
          third?: string
          topic_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          bug_category: string | null
          bug_description: string | null
          created_at: string
          id: string
          report_type: string
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string
          screenshot_urls: string[] | null
          status: string
          updated_at: string
          violation_description: string | null
          violation_type: string | null
        }
        Insert: {
          admin_notes?: string | null
          bug_category?: string | null
          bug_description?: string | null
          created_at?: string
          id?: string
          report_type: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          screenshot_urls?: string[] | null
          status?: string
          updated_at?: string
          violation_description?: string | null
          violation_type?: string | null
        }
        Update: {
          admin_notes?: string | null
          bug_category?: string | null
          bug_description?: string | null
          created_at?: string
          id?: string
          report_type?: string
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          screenshot_urls?: string[] | null
          status?: string
          updated_at?: string
          violation_description?: string | null
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_analytics: {
        Row: {
          churn_rate: number | null
          created_at: string | null
          date: string
          dau: number | null
          id: string
          mau: number | null
          new_users: number | null
          returning_users: number | null
          updated_at: string | null
          wau: number | null
        }
        Insert: {
          churn_rate?: number | null
          created_at?: string | null
          date: string
          dau?: number | null
          id?: string
          mau?: number | null
          new_users?: number | null
          returning_users?: number | null
          updated_at?: string | null
          wau?: number | null
        }
        Update: {
          churn_rate?: number | null
          created_at?: string | null
          date?: string
          dau?: number | null
          id?: string
          mau?: number | null
          new_users?: number | null
          returning_users?: number | null
          updated_at?: string | null
          wau?: number | null
        }
        Relationships: []
      }
      rpc_rate_limits: {
        Row: {
          call_count: number
          id: string
          ip_address: string | null
          rpc_name: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          call_count?: number
          id?: string
          ip_address?: string | null
          rpc_name: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          call_count?: number
          id?: string
          ip_address?: string | null
          rpc_name?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      session_details: {
        Row: {
          browser: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          games_played: number | null
          id: string
          messages_sent: number | null
          os_version: string | null
          pages_visited: number | null
          purchases_made: number | null
          screen_size: string | null
          session_end: string | null
          session_id: string
          session_start: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          games_played?: number | null
          id?: string
          messages_sent?: number | null
          os_version?: string | null
          pages_visited?: number | null
          purchases_made?: number | null
          screen_size?: string | null
          session_end?: string | null
          session_id: string
          session_start?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          games_played?: number | null
          id?: string
          messages_sent?: number | null
          os_version?: string | null
          pages_visited?: number | null
          purchases_made?: number | null
          screen_size?: string | null
          session_end?: string | null
          session_id?: string
          session_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_tokens: {
        Row: {
          created_at: string
          duration_minutes: number
          expires_at: string
          id: string
          source: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          expires_at: string
          id?: string
          source: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          id?: string
          source?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      subscription_promo_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          promo_trigger: string | null
          promo_type: string
          session_id: string
          time_since_last_shown_seconds: number | null
          times_shown_before: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          promo_trigger?: string | null
          promo_type: string
          session_id: string
          time_since_last_shown_seconds?: number | null
          times_shown_before?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          promo_trigger?: string | null
          promo_type?: string
          session_id?: string
          time_since_last_shown_seconds?: number | null
          times_shown_before?: number | null
          user_id?: string
        }
        Relationships: []
      }
      thread_participants: {
        Row: {
          can_send: boolean
          created_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          can_send?: boolean
          created_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          can_send?: boolean
          created_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      tips_tricks_videos: {
        Row: {
          created_at: string | null
          description: string | null
          duration_sec: number | null
          id: string
          is_active: boolean | null
          published_at: string | null
          sort_order: number | null
          thumb_url: string
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          is_active?: boolean | null
          published_at?: string | null
          sort_order?: number | null
          thumb_url: string
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          is_active?: boolean | null
          published_at?: string | null
          sort_order?: number | null
          thumb_url?: string
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          en: string | null
          hu: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          en?: string | null
          hu: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          en?: string | null
          hu?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          route: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          route: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          route?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          is_typing: boolean | null
          thread_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_typing?: boolean | null
          thread_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_typing?: boolean | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_daily: {
        Row: {
          date: string
          histogram: number[]
          top_slots: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          histogram?: number[]
          top_slots?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          histogram?: number[]
          top_slots?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_pings: {
        Row: {
          bucket_start: string
          created_at: string
          device_class: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          bucket_start: string
          created_at?: string
          device_class: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          bucket_start?: string
          created_at?: string
          device_class?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ad_interest_candidates: {
        Row: {
          interest_score: number
          last_update: string
          topic_id: number
          user_id: string
        }
        Insert: {
          interest_score?: number
          last_update?: string
          topic_id: number
          user_id: string
        }
        Update: {
          interest_score?: number
          last_update?: string
          topic_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ad_interest_candidates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cohorts: {
        Row: {
          churn_risk_score: number | null
          cohort_month: string
          cohort_week: string
          created_at: string
          first_purchase_day: number | null
          is_retained_d1: boolean | null
          is_retained_d14: boolean | null
          is_retained_d30: boolean | null
          is_retained_d7: boolean | null
          last_active_date: string | null
          registration_date: string
          total_games: number | null
          total_purchases: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          churn_risk_score?: number | null
          cohort_month: string
          cohort_week: string
          created_at?: string
          first_purchase_day?: number | null
          is_retained_d1?: boolean | null
          is_retained_d14?: boolean | null
          is_retained_d30?: boolean | null
          is_retained_d7?: boolean | null
          last_active_date?: string | null
          registration_date: string
          total_games?: number | null
          total_purchases?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          churn_risk_score?: number | null
          cohort_month?: string
          cohort_week?: string
          created_at?: string
          first_purchase_day?: number | null
          is_retained_d1?: boolean | null
          is_retained_d14?: boolean | null
          is_retained_d30?: boolean | null
          is_retained_d7?: boolean | null
          last_active_date?: string | null
          registration_date?: string
          total_games?: number | null
          total_purchases?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cohorts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cohorts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_engagement_scores: {
        Row: {
          created_at: string
          factors: Json
          game_score: number | null
          last_calculated: string
          previous_score: number | null
          purchase_score: number | null
          retention_score: number | null
          score: number
          score_tier: string
          score_trend: string | null
          session_score: number | null
          social_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          game_score?: number | null
          last_calculated?: string
          previous_score?: number | null
          purchase_score?: number | null
          retention_score?: number | null
          score: number
          score_tier: string
          score_trend?: string | null
          session_score?: number | null
          social_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          game_score?: number | null
          last_calculated?: string
          previous_score?: number | null
          purchase_score?: number | null
          retention_score?: number | null
          score?: number
          score_tier?: string
          score_trend?: string | null
          session_score?: number | null
          social_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_engagement_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_settings: {
        Row: {
          ai_personalized_questions_enabled: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_personalized_questions_enabled?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_personalized_questions_enabled?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_analytics: {
        Row: {
          common_paths: Json | null
          created_at: string | null
          date: string
          exit_points: Json | null
          game_funnel: Json | null
          id: string
          onboarding_funnel: Json | null
          purchase_funnel: Json | null
          updated_at: string | null
        }
        Insert: {
          common_paths?: Json | null
          created_at?: string | null
          date: string
          exit_points?: Json | null
          game_funnel?: Json | null
          id?: string
          onboarding_funnel?: Json | null
          purchase_funnel?: Json | null
          updated_at?: string | null
        }
        Update: {
          common_paths?: Json | null
          created_at?: string | null
          date?: string
          exit_points?: Json | null
          game_funnel?: Json | null
          id?: string
          onboarding_funnel?: Json | null
          purchase_funnel?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          revoked_at: string | null
          revoked_reason: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_topic_stats: {
        Row: {
          answered_count: number
          avg_response_ms: number | null
          correct_count: number
          created_at: string
          last_answered_at: string | null
          score: number
          topic_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_count?: number
          avg_response_ms?: number | null
          correct_count?: number
          created_at?: string
          last_answered_at?: string | null
          score?: number
          topic_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_count?: number
          avg_response_ms?: number | null
          correct_count?: number
          created_at?: string
          last_answered_at?: string | null
          score?: number
          topic_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          created_at: string
          delta_coins: number
          delta_lives: number
          id: string
          idempotency_key: string
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta_coins?: number
          delta_lives?: number
          id?: string
          idempotency_key: string
          metadata?: Json | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta_coins?: number
          delta_lives?: number
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger_archive: {
        Row: {
          archived_at: string | null
          created_at: string
          delta_coins: number
          delta_lives: number
          id: string
          idempotency_key: string
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          delta_coins?: number
          delta_lives?: number
          id?: string
          idempotency_key: string
          metadata?: Json | null
          source: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          delta_coins?: number
          delta_lives?: number
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_leaderboard_snapshot: {
        Row: {
          id: string
          rank: number
          score: number
          snapshot_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          rank: number
          score: number
          snapshot_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          id?: string
          rank?: number
          score?: number
          snapshot_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_login_rewards: {
        Row: {
          created_at: string | null
          gold_amount: number
          lives_bonus: number | null
          reward_index: number
        }
        Insert: {
          created_at?: string | null
          gold_amount: number
          lives_bonus?: number | null
          reward_index: number
        }
        Update: {
          created_at?: string | null
          gold_amount?: number
          lives_bonus?: number | null
          reward_index?: number
        }
        Relationships: []
      }
      weekly_login_state: {
        Row: {
          awarded_login_index: number | null
          created_at: string | null
          last_counted_at: string | null
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          awarded_login_index?: number | null
          created_at?: string | null
          last_counted_at?: string | null
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          awarded_login_index?: number | null
          created_at?: string | null
          last_counted_at?: string | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_prize_table: {
        Row: {
          created_at: string | null
          gold: number
          lives: number
          rank: number
        }
        Insert: {
          created_at?: string | null
          gold: number
          lives: number
          rank: number
        }
        Update: {
          created_at?: string | null
          gold?: number
          lives?: number
          rank?: number
        }
        Relationships: []
      }
      weekly_rankings: {
        Row: {
          average_response_time: number | null
          category: string
          created_at: string | null
          id: string
          rank: number | null
          total_correct_answers: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          week_start: string
        }
        Insert: {
          average_response_time?: number | null
          category: string
          created_at?: string | null
          id?: string
          rank?: number | null
          total_correct_answers?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          week_start: string
        }
        Update: {
          average_response_time?: number | null
          category?: string
          created_at?: string | null
          id?: string
          rank?: number | null
          total_correct_answers?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_winner_awarded: {
        Row: {
          awarded_at: string | null
          rank: number
          user_id: string
          week_start: string
        }
        Insert: {
          awarded_at?: string | null
          rank: number
          user_id: string
          week_start: string
        }
        Update: {
          awarded_at?: string | null
          rank?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_winner_popup_shown: {
        Row: {
          shown_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          shown_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          shown_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      welcome_bonus_attempts: {
        Row: {
          attempt_count: number
          id: string
          ip_address: string | null
          last_attempt_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      error_rate_by_page: {
        Row: {
          affected_users: number | null
          error_count: number | null
          error_type: string | null
          last_occurrence: string | null
          page_route: string | null
        }
        Relationships: []
      }
      leaderboard_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          rank: number | null
          total_correct_answers: number | null
          updated_at: string | null
          username: string | null
        }
        Relationships: []
      }
      mv_daily_engagement_metrics: {
        Row: {
          active_users: number | null
          avg_session_duration_seconds: number | null
          metric_date: string | null
          total_sessions: number | null
        }
        Relationships: []
      }
      mv_daily_rankings_current: {
        Row: {
          avatar_url: string | null
          average_response_time: number | null
          category: string | null
          country_code: string | null
          day_date: string | null
          rank: number | null
          refreshed_at: string | null
          total_correct_answers: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      mv_feature_usage_summary: {
        Row: {
          feature_name: string | null
          metric_date: string | null
          unique_users: number | null
          usage_count: number | null
        }
        Relationships: []
      }
      mv_hourly_engagement: {
        Row: {
          event_count: number | null
          hour: number | null
          metric_date: string | null
        }
        Relationships: []
      }
      performance_by_page: {
        Row: {
          avg_lcp_ms: number | null
          avg_load_time_ms: number | null
          avg_ttfb_ms: number | null
          browser: string | null
          device_type: string | null
          median_load_time_ms: number | null
          p95_load_time_ms: number | null
          page_route: string | null
          sample_count: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          invitation_code: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          invitation_code?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          invitation_code?: string | null
          username?: string | null
        }
        Relationships: []
      }
      weekly_rankings_public: {
        Row: {
          category: string | null
          created_at: string | null
          rank: number | null
          total_correct_answers: number | null
          username: string | null
          week_start: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          rank?: number | null
          total_correct_answers?: number | null
          username?: string | null
          week_start?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          rank?: number | null
          total_correct_answers?: number | null
          username?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_code_input: string }
        Returns: Json
      }
      archive_old_lives_ledger: { Args: never; Returns: Json }
      archive_old_wallet_ledger: { Args: never; Returns: Json }
      archive_thread_for_user: { Args: { p_thread_id: string }; Returns: Json }
      award_coins: { Args: { amount: number }; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_max_calls?: number
          p_rpc_name: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      claim_daily_gift: { Args: never; Returns: Json }
      claim_welcome_bonus: { Args: never; Returns: Json }
      cleanup_completed_game_sessions: { Args: never; Returns: Json }
      cleanup_expired_game_sessions: { Args: never; Returns: undefined }
      cleanup_expired_pin_reset_tokens: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_speed_tokens: { Args: never; Returns: undefined }
      cleanup_old_analytics: { Args: never; Returns: undefined }
      cleanup_old_messages: { Args: never; Returns: undefined }
      create_friendship_from_invitation: {
        Args: { p_invitee_id: string; p_inviter_id: string }
        Returns: Json
      }
      credit_lives: {
        Args: {
          p_delta_lives: number
          p_idempotency_key: string
          p_metadata?: Json
          p_source: string
          p_user_id: string
        }
        Returns: Json
      }
      credit_wallet: {
        Args: {
          p_delta_coins: number
          p_delta_lives: number
          p_idempotency_key: string
          p_metadata?: Json
          p_source: string
          p_user_id: string
        }
        Returns: Json
      }
      distribute_weekly_rewards: { Args: never; Returns: undefined }
      forgot_pin_atomic: {
        Args: {
          p_new_pin: string
          p_now: string
          p_recovery_code_hash: string
          p_username: string
        }
        Returns: Json
      }
      generate_full_database_export: { Args: never; Returns: string }
      generate_invitation_code: { Args: never; Returns: string }
      get_correct_answer_from_jsonb: {
        Args: { answers_jsonb: Json }
        Returns: string
      }
      get_country_from_request: { Args: never; Returns: string }
      get_current_day_date: { Args: never; Returns: string }
      get_current_week_reward: { Args: never; Returns: Json }
      get_current_week_start: { Args: never; Returns: string }
      get_invitation_tier_reward: {
        Args: { accepted_count: number }
        Returns: Json
      }
      get_next_life_at: { Args: { p_user_id: string }; Returns: string }
      get_random_questions: {
        Args: { num_questions: number }
        Returns: {
          answers: Json
          audience: Json
          id: string
          question: string
          source_category: string
          third: string
        }[]
      }
      get_random_questions_fast: {
        Args: { p_count?: number }
        Returns: {
          answers: Json
          audience: Json
          correct_answer: string | null
          created_at: string | null
          id: string
          question: string
          source_category: string
          third: string
          topic_id: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_table_column_types: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
          udt_name: string
        }[]
      }
      get_topics_needing_questions: {
        Args: never
        Returns: {
          current_count: number
          needed: number
          topic_id: number
          topic_name: string
        }[]
      }
      get_user_activity_window: {
        Args: { p_lookback_days?: number; p_user_id: string }
        Returns: Json
      }
      get_user_country_rank: { Args: { p_user_id: string }; Returns: number }
      get_user_threads_optimized: {
        Args: { p_user_id: string }
        Returns: {
          is_online: boolean
          last_message_at: string
          other_user_avatar: string
          other_user_id: string
          other_user_name: string
          thread_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_error_message?: string
          p_new_value?: Json
          p_old_value?: Json
          p_resource_id?: string
          p_resource_type: string
          p_status?: string
        }
        Returns: string
      }
      mark_users_offline: { Args: never; Returns: undefined }
      normalize_user_ids: {
        Args: { uid1: string; uid2: string }
        Returns: string[]
      }
      process_invitation_reward: { Args: never; Returns: Json }
      purchase_life: { Args: never; Returns: Json }
      reactivate_help: {
        Args: { p_cost?: number; p_help_type: string }
        Returns: Json
      }
      refresh_admin_materialized_views: { Args: never; Returns: Json }
      refresh_leaderboard_cache: { Args: never; Returns: undefined }
      refresh_leaderboard_cache_optimized: { Args: never; Returns: undefined }
      refresh_leaderboard_public_cache: { Args: never; Returns: undefined }
      refresh_mv_daily_rankings: { Args: never; Returns: undefined }
      regenerate_invitation_code: { Args: never; Returns: string }
      regenerate_lives: { Args: never; Returns: undefined }
      regenerate_lives_background: { Args: never; Returns: undefined }
      reset_game_helps: { Args: never; Returns: undefined }
      search_users_by_name: {
        Args: {
          current_user_id: string
          result_limit?: number
          search_query: string
        }
        Returns: {
          avatar_url: string
          id: string
          username: string
        }[]
      }
      spend_coins: { Args: { amount: number }; Returns: boolean }
      update_daily_ranking_for_user: {
        Args: {
          p_average_response_time: number
          p_correct_answers: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_weekly_ranking_for_user: {
        Args: {
          p_average_response_time: number
          p_correct_answers: number
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_daily_ranking_aggregate: {
        Args: {
          p_average_response_time: number
          p_correct_answers: number
          p_user_id: string
        }
        Returns: undefined
      }
      use_help: { Args: { p_help_type: string }; Returns: Json }
      use_life: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

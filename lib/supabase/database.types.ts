export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_viewed_history: {
        Row: {
          user_id: string;
          entries: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          entries?: Json;
          updated_at?: string;
        };
        Update: {
          entries?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_reading_progress: {
        Row: {
          user_id: string;
          progress: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          progress?: Json;
          updated_at?: string;
        };
        Update: {
          progress?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_verse_completions: {
        Row: {
          user_id: string;
          verse_key: string;
          book_slug: string;
          chapter: number;
          verse_num: number;
          completed_at: string;
          completed_date: string;
        };
        Insert: {
          user_id: string;
          verse_key: string;
          book_slug: string;
          chapter: number;
          verse_num: number;
          completed_at: string;
          completed_date: string;
        };
        Update: {
          book_slug?: string;
          chapter?: number;
          verse_num?: number;
          completed_at?: string;
          completed_date?: string;
        };
        Relationships: [];
      };
      user_reading_chapters: {
        Row: {
          user_id: string;
          chapter_key: string;
          book_slug: string;
          chapter: number;
          total_verses: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          chapter_key: string;
          book_slug: string;
          chapter: number;
          total_verses: number;
          updated_at?: string;
        };
        Update: {
          total_verses?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_reading_daily_stats: {
        Row: {
          user_id: string;
          reading_date: string;
          read_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          reading_date: string;
          read_count?: number;
          updated_at?: string;
        };
        Update: {
          read_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_daily_goals: {
        Row: {
          user_id: string;
          target_verses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          target_verses: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target_verses?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_daily_goal_achievements: {
        Row: {
          user_id: string;
          goal_date: string;
          target_verses: number;
          completed_verses: number;
          achieved_at: string;
        };
        Insert: {
          user_id: string;
          goal_date: string;
          target_verses: number;
          completed_verses: number;
          achieved_at?: string;
        };
        Update: {
          target_verses?: number;
          completed_verses?: number;
          achieved_at?: string;
        };
        Relationships: [];
      };
      user_book_reading_achievements: {
        Row: {
          user_id: string;
          book_slug: string;
          completion_count: number;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          book_slug: string;
          completion_count: number;
          completed_at?: string;
        };
        Update: {
          book_slug?: string;
          completion_count?: number;
          completed_at?: string;
        };
        Relationships: [];
      };
      user_bible_reading_achievements: {
        Row: {
          user_id: string;
          completion_count: number;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          completion_count: number;
          completed_at?: string;
        };
        Update: {
          completion_count?: number;
          completed_at?: string;
        };
        Relationships: [];
      };
      user_friends: {
        Row: {
          owner_user_id: string;
          friend_user_id: string;
          created_at: string;
        };
        Insert: {
          owner_user_id: string;
          friend_user_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          description: string | null;
          join_password_hash: string | null;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          normalized_name: string;
          description?: string | null;
          join_password_hash?: string | null;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          normalized_name?: string;
          description?: string | null;
          join_password_hash?: string | null;
          owner_user_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          user_id: string;
          organization_id: string;
          nickname: string;
          role: "owner" | "member";
          status: "pending" | "approved";
          requested_at: string;
          approved_at: string | null;
          approval_notice_dismissed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          organization_id: string;
          nickname: string;
          role?: "owner" | "member";
          status?: "pending" | "approved";
          requested_at?: string;
          approved_at?: string | null;
          approval_notice_dismissed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          nickname?: string;
          role?: "owner" | "member";
          status?: "pending" | "approved";
          requested_at?: string;
          approved_at?: string | null;
          approval_notice_dismissed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profile_settings: {
        Row: {
          user_id: string;
          affiliation: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          affiliation?: string | null;
          updated_at?: string;
        };
        Update: {
          affiliation?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_accounts: {
        Row: {
          user_id: string;
          username: string;
          recovery_code_salt: string;
          recovery_code_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username: string;
          recovery_code_salt: string;
          recovery_code_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          recovery_code_salt?: string;
          recovery_code_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      password_recovery_attempts: {
        Row: {
          id: number;
          username: string;
          action: "signup" | "reset";
          ip_hash: string;
          succeeded: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          username: string;
          action: "signup" | "reset";
          ip_hash: string;
          succeeded?: boolean;
          created_at?: string;
        };
        Update: {
          username?: string;
          action?: "signup" | "reset";
          ip_hash?: string;
          succeeded?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      api_rate_limits: {
        Row: {
          bucket_key: string;
          request_count: number;
          expires_at: string;
        };
        Insert: {
          bucket_key: string;
          request_count?: number;
          expires_at: string;
        };
        Update: {
          request_count?: number;
          expires_at?: string;
        };
        Relationships: [];
      };
      pronunciation_skip_words: {
        Row: {
          id: number;
          phrase: string;
          normalized_phrase: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          phrase: string;
          normalized_phrase: string;
          created_at?: string;
        };
        Update: {
          phrase?: string;
          normalized_phrase?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_api_rate_limit: {
        Args: {
          p_bucket_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_activity_ranking: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_organization_id: string;
          p_offset?: number;
          p_limit?: number;
        };
        Returns: Array<{
          user_id: string;
          username: string;
          nickname: string | null;
          affiliation: string | null;
          read_count: number;
          ranking_position: number;
          total_count: number;
        }>;
      };
      get_activity_ranking_user_summary: {
        Args: {
          p_username: string;
          p_start_date: string;
          p_end_date: string;
          p_organization_id: string;
        };
        Returns: Array<{
          username: string;
          nickname: string | null;
          affiliation: string | null;
          this_week_read_count: number;
          total_read_count: number;
          active_book_count: number;
          completed_book_count: number;
          book_completion_count: number;
          bible_completion_count: number;
          daily_goal_achievement_count: number;
          daily_goal_achievement_dates: string[];
          daily_goal_started_date: string | null;
          weekly_read_counts: Json;
        }>;
      };
      get_authorized_activity_summary: {
        Args: {
          p_username: string;
          p_start_date: string;
          p_end_date: string;
          p_requester_user_id: string;
        };
        Returns: Array<{
          username: string;
          nickname: string | null;
          affiliation: string | null;
          this_week_read_count: number;
          total_read_count: number;
          active_book_count: number;
          completed_book_count: number;
          book_completion_count: number;
          bible_completion_count: number;
          daily_goal_achievement_count: number;
          daily_goal_achievement_dates: string[];
          daily_goal_started_date: string | null;
          weekly_read_counts: Json;
        }>;
      };
      create_organization: {
        Args: {
          p_owner_user_id: string;
          p_name: string;
          p_nickname: string;
          p_description?: string | null;
          p_password?: string | null;
        };
        Returns: string;
      };
      request_organization_membership: {
        Args: {
          p_user_id: string;
          p_organization_id: string;
          p_nickname: string;
          p_password?: string | null;
        };
        Returns: undefined;
      };
      leave_organization: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
      update_organization_membership_nickname: {
        Args: {
          p_user_id: string;
          p_nickname: string;
        };
        Returns: undefined;
      };
      delete_owned_organization: {
        Args: {
          p_owner_user_id: string;
        };
        Returns: undefined;
      };
      update_owned_organization: {
        Args: {
          p_owner_user_id: string;
          p_name: string;
          p_nickname: string;
          p_description?: string | null;
          p_password?: string | null;
          p_password_action?: string;
        };
        Returns: undefined;
      };
      review_organization_membership: {
        Args: {
          p_owner_user_id: string;
          p_member_user_id: string;
          p_action: string;
        };
        Returns: undefined;
      };
      get_organization_approval_notice: {
        Args: {
          p_user_id: string;
        };
        Returns: Array<{
          organization_id: string;
          organization_name: string;
          approved_at: string;
        }>;
      };
      dismiss_organization_approval_notice: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
      search_organizations: {
        Args: {
          p_query: string;
          p_offset?: number;
          p_limit?: number;
        };
        Returns: Array<{
          id: string;
          name: string;
          description: string | null;
          requires_password: boolean;
        }>;
      };
      get_my_normalized_reading_progress: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          completed_verse_keys: string[];
          chapter_verse_counts: Json;
          completed_verse_details: Json;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

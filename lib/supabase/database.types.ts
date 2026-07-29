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
      user_profile_settings: {
        Row: {
          user_id: string;
          affiliation: string | null;
          nickname: string | null;
          affiliation_filter_only: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          affiliation?: string | null;
          nickname?: string | null;
          affiliation_filter_only?: boolean;
          updated_at?: string;
        };
        Update: {
          affiliation?: string | null;
          nickname?: string | null;
          affiliation_filter_only?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_accounts: {
        Row: {
          user_id: string;
          username: string;
          recovery_question: string;
          recovery_answer_salt: string;
          recovery_answer_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username: string;
          recovery_question: string;
          recovery_answer_salt: string;
          recovery_answer_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          recovery_question?: string;
          recovery_answer_salt?: string;
          recovery_answer_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      password_recovery_attempts: {
        Row: {
          id: number;
          username: string;
          action: "signup" | "question" | "reset";
          ip_hash: string;
          succeeded: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          username: string;
          action: "signup" | "question" | "reset";
          ip_hash: string;
          succeeded?: boolean;
          created_at?: string;
        };
        Update: {
          username?: string;
          action?: "signup" | "question" | "reset";
          ip_hash?: string;
          succeeded?: boolean;
          created_at?: string;
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

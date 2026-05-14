/**
 * Manually-typed Supabase database schema for the splitbill app.
 * Keep this in sync with `supabase/migrations/0001_init.sql`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SplitMethod = "equal" | "exact" | "percent" | "shares";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          emoji: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          emoji?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          profile_id: string | null;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          profile_id?: string | null;
          display_name: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          profile_id?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          paid_by_member_id: string;
          title: string;
          notes: string | null;
          amount: number;
          currency: string;
          split_method: SplitMethod;
          spent_at: string;
          receipt_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          paid_by_member_id: string;
          title: string;
          notes?: string | null;
          amount: number;
          currency?: string;
          split_method?: SplitMethod;
          spent_at?: string;
          receipt_url?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          notes?: string | null;
          amount?: number;
          paid_by_member_id?: string;
          split_method?: SplitMethod;
          spent_at?: string;
          receipt_url?: string | null;
        };
        Relationships: [];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          member_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          amount?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      split_method: SplitMethod;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string;
          restaurant_id: string;
          status: string;
          plan_type: string;
          price_cents: number;
          currency: string;
          trial_started_at: string;
          trial_ends_at: string;
          trial_days: number;
          subscription_started_at: string | null;
          subscription_ends_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          status?: string;
          plan_type?: string;
          price_cents?: number;
          currency?: string;
          trial_started_at?: string;
          trial_ends_at: string;
          trial_days?: number;
          subscription_started_at?: string | null;
          subscription_ends_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          status?: string;
          plan_type?: string;
          price_cents?: number;
          currency?: string;
          trial_started_at?: string;
          trial_ends_at?: string;
          trial_days?: number;
          subscription_started_at?: string | null;
          subscription_ends_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      [table: string]: {
        Row: Record<string, Json>;
        Insert: Record<string, Json>;
        Update: Record<string, Json>;
        Relationships: [];
      };
    };
    Views: {
      [view: string]: {
        Row: Record<string, Json>;
        Relationships: [];
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, Json>;
        Returns: Json;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}

// Placeholder types - replace with actual schema types from Supabase
// Generate types using: npx supabase gen types typescript --project-id <your-project-id>"

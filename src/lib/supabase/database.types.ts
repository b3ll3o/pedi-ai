export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [table: string]: {
        Row: Record<string, Json>
        Insert: Record<string, Json>
        Update: Record<string, Json>
        Relationships: []
      }
    }
    Views: {
      [view: string]: {
        Row: Record<string, Json>
        Relationships: []
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, Json>
        Returns: Json
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}

// Placeholder types - replace with actual schema types from Supabase
// Generate types using: npx supabase gen types typescript --project-id <your-project-id>

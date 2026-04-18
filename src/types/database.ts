export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type HabitFrequency = 'daily' | 'weekly'
export type SprintStatus = 'planning' | 'active' | 'completed'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          timezone: string
          onboarding_completed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      habit_categories: {
        Row: {
          id: number
          name: string
          color: string
          icon: string
        }
        Insert: Omit<Database['public']['Tables']['habit_categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['habit_categories']['Insert']>
      }
      habits: {
        Row: {
          id: string
          user_id: string
          category_id: number
          title: string
          frequency: HabitFrequency
          weekly_target: number | null
          is_active: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['habits']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['habits']['Insert']>
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          logged_date: string
          completed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['habit_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['habit_logs']['Insert']>
      }
      sprints: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          duration_days: number
          status: SprintStatus
          reward: string
          punishment: string
          completion_rate: number | null
          reflection: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sprints']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sprints']['Insert']>
      }
      sprint_habits: {
        Row: {
          id: string
          sprint_id: string
          habit_id: string
          is_locked: boolean
          completed_days: number
        }
        Insert: Omit<Database['public']['Tables']['sprint_habits']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['sprint_habits']['Insert']>
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_type: string
          earned_at: string
        }
        Insert: Omit<Database['public']['Tables']['badges']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['badges']['Insert']>
      }
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type HabitCategory = Database['public']['Tables']['habit_categories']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitLog = Database['public']['Tables']['habit_logs']['Row']
export type Sprint = Database['public']['Tables']['sprints']['Row']
export type SprintHabit = Database['public']['Tables']['sprint_habits']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']

// Extended types with relations
export type HabitWithCategory = Habit & {
  habit_categories: HabitCategory
}

export type SprintWithHabits = Sprint & {
  sprint_habits: (SprintHabit & {
    habits: HabitWithCategory
  })[]
}

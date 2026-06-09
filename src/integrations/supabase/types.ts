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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ace_messages: {
        Row: {
          created_at: string
          id: string
          message_count: number
          message_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          message_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          message_date?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          criteria_type: string
          criteria_value?: number
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      community_questions: {
        Row: {
          correct_answer: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          options: Json
          passage: string | null
          question_text: string
          status: string
          sub_subsection: string | null
          subject: string
          submitted_by: string
          subsection: string | null
        }
        Insert: {
          correct_answer: number
          created_at?: string
          difficulty?: string
          explanation: string
          id?: string
          options: Json
          passage?: string | null
          question_text: string
          status?: string
          sub_subsection?: string | null
          subject: string
          submitted_by: string
          subsection?: string | null
        }
        Update: {
          correct_answer?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          options?: Json
          passage?: string | null
          question_text?: string
          status?: string
          sub_subsection?: string | null
          subject?: string
          submitted_by?: string
          subsection?: string | null
        }
        Relationships: []
      }
      daily_answers: {
        Row: {
          answer_correct: boolean
          answered_at: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer_correct: boolean
          answered_at?: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer_correct?: boolean
          answered_at?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          category: string
          created_at: string
          definition: string
          difficulty: string | null
          id: string
          term: string
        }
        Insert: {
          category: string
          created_at?: string
          definition: string
          difficulty?: string | null
          id?: string
          term: string
        }
        Update: {
          category?: string
          created_at?: string
          definition?: string
          difficulty?: string | null
          id?: string
          term?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_anonymous: boolean | null
          is_solution: boolean | null
          thread_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_solution?: boolean | null
          thread_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_solution?: boolean | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_anonymous: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string
          id: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          id: string
          mode: string
          section_scores: Json | null
          session_id: string | null
          started_at: string
          test_id: string
          time_spent: Json | null
          total_score: number | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode?: string
          section_scores?: Json | null
          session_id?: string | null
          started_at?: string
          test_id: string
          time_spent?: Json | null
          total_score?: number | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode?: string
          section_scores?: Json | null
          session_id?: string | null
          started_at?: string
          test_id?: string
          time_spent?: Json | null
          total_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_modules: {
        Row: {
          created_at: string
          id: string
          module_name: string
          module_order: number
          question_count: number
          test_id: string
          time_limit_minutes: number
        }
        Insert: {
          created_at?: string
          id?: string
          module_name: string
          module_order?: number
          question_count?: number
          test_id: string
          time_limit_minutes?: number
        }
        Update: {
          created_at?: string
          id?: string
          module_name?: string
          module_order?: number
          question_count?: number
          test_id?: string
          time_limit_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_modules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_questions: {
        Row: {
          correct_answer: number
          correct_answer_numeric: number | null
          created_at: string
          explanation: string
          id: string
          image_url: string | null
          module_id: string
          module_name: string
          module_order: number
          options: Json
          passage: string | null
          question_order: number
          question_text: string
          question_type: string
          test_id: string
        }
        Insert: {
          correct_answer?: number
          correct_answer_numeric?: number | null
          created_at?: string
          explanation?: string
          id?: string
          image_url?: string | null
          module_id: string
          module_name: string
          module_order?: number
          options?: Json
          passage?: string | null
          question_order?: number
          question_text: string
          question_type?: string
          test_id: string
        }
        Update: {
          correct_answer?: number
          correct_answer_numeric?: number | null
          created_at?: string
          explanation?: string
          id?: string
          image_url?: string | null
          module_id?: string
          module_name?: string
          module_order?: number
          options?: Json
          passage?: string | null
          question_order?: number
          question_text?: string
          question_type?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mock_test_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          order_index?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          last_username_change: string | null
          premium_until: string | null
          theme_preference: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          last_username_change?: string | null
          premium_until?: string | null
          theme_preference?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          last_username_change?: string | null
          premium_until?: string | null
          theme_preference?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      question_media: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          question_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url: string
          question_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_media_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: number
          correct_answer_numeric: number | null
          created_at: string
          difficulty: string | null
          explanation: string
          id: string
          options: Json
          passage: string | null
          question_text: string
          question_type: string | null
          sub_subsection: string | null
          subject: string
          subsection: string | null
        }
        Insert: {
          correct_answer: number
          correct_answer_numeric?: number | null
          created_at?: string
          difficulty?: string | null
          explanation: string
          id?: string
          options: Json
          passage?: string | null
          question_text: string
          question_type?: string | null
          sub_subsection?: string | null
          subject: string
          subsection?: string | null
        }
        Update: {
          correct_answer?: number
          correct_answer_numeric?: number | null
          created_at?: string
          difficulty?: string | null
          explanation?: string
          id?: string
          options?: Json
          passage?: string | null
          question_text?: string
          question_type?: string | null
          sub_subsection?: string | null
          subject?: string
          subsection?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          score: number
          subject: string | null
          time_taken: number
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          subject?: string | null
          time_taken: number
          total_questions: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          subject?: string | null
          time_taken?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      saved_flashcards: {
        Row: {
          flashcard_id: string
          id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          saved_at?: string
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_flashcards_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_questions: {
        Row: {
          id: string
          notes: string | null
          question_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          question_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          question_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          completions: Json
          created_at: string
          id: string
          plan_json: Json
          target_score: number | null
          test_date: string
          user_id: string
          weekly_hours: number
        }
        Insert: {
          completions?: Json
          created_at?: string
          id?: string
          plan_json: Json
          target_score?: number | null
          test_date: string
          user_id: string
          weekly_hours: number
        }
        Update: {
          completions?: Json
          created_at?: string
          id?: string
          plan_json?: Json
          target_score?: number | null
          test_date?: string
          user_id?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_reviews: {
        Row: {
          difficulty: string
          flashcard_id: string
          id: string
          last_reviewed: string | null
          learned: boolean | null
          next_review_date: string
          review_date: string
          user_id: string
        }
        Insert: {
          difficulty: string
          flashcard_id: string
          id?: string
          last_reviewed?: string | null
          learned?: boolean | null
          next_review_date: string
          review_date?: string
          user_id: string
        }
        Update: {
          difficulty?: string
          flashcard_id?: string
          id?: string
          last_reviewed?: string | null
          learned?: boolean | null
          next_review_date?: string
          review_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_summary: {
        Row: {
          ever_correct: boolean
          ever_incorrect: boolean
          last_attempt_at: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          ever_correct?: boolean
          ever_incorrect?: boolean
          last_attempt_at?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          ever_correct?: boolean
          ever_incorrect?: boolean
          last_attempt_at?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_summary_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      forum_replies_secure: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          is_anonymous: boolean | null
          is_solution: boolean | null
          thread_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          author_id?: never
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_solution?: boolean | null
          thread_id?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          author_id?: never
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_solution?: boolean | null
          thread_id?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads_secure: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          is_anonymous: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          author_id?: never
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          author_id?: never
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_questions_public: {
        Row: {
          created_at: string | null
          explanation: string | null
          id: string | null
          image_url: string | null
          module_id: string | null
          module_name: string | null
          module_order: number | null
          options: Json | null
          passage: string | null
          question_order: number | null
          question_text: string | null
          question_type: string | null
          test_id: string | null
        }
        Insert: {
          created_at?: string | null
          explanation?: string | null
          id?: string | null
          image_url?: string | null
          module_id?: string | null
          module_name?: string | null
          module_order?: number | null
          options?: Json | null
          passage?: string | null
          question_order?: number | null
          question_text?: string | null
          question_type?: string | null
          test_id?: string | null
        }
        Update: {
          created_at?: string | null
          explanation?: string | null
          id?: string | null
          image_url?: string | null
          module_id?: string | null
          module_name?: string | null
          module_order?: number | null
          options?: Json | null
          passage?: string | null
          question_order?: number | null
          question_text?: string | null
          question_type?: string | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mock_test_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      subscriptions_safe: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      check_achievements: { Args: { p_user_id: string }; Returns: undefined }
      check_mock_answer: {
        Args: { p_question_id: string; p_selected_answer: number }
        Returns: Json
      }
      get_guest_mock_attempts: {
        Args: { p_session_id: string; p_test_id?: string }
        Returns: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          id: string
          mode: string
          section_scores: Json | null
          session_id: string | null
          started_at: string
          test_id: string
          time_spent: Json | null
          total_score: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mock_test_attempts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_mock_test_answers: { Args: { p_test_id: string }; Returns: Json }
      get_vote_counts: {
        Args: { p_thread_ids: string[] }
        Returns: {
          item_id: string
          net_votes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_guest_mock_attempt: {
        Args: { p_mode?: string; p_session_id: string; p_test_id: string }
        Returns: string
      }
      score_mock_test: {
        Args: { p_answers: Json; p_test_id: string }
        Returns: Json
      }
      update_guest_mock_attempt: {
        Args: {
          p_answers?: Json
          p_attempt_id: string
          p_completed_at?: string
          p_section_scores?: Json
          p_session_id: string
          p_time_spent?: Json
          p_total_score?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

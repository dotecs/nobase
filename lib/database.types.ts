export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'admin'
export type EnrollmentStatus = 'pending' | 'active' | 'on_hold' | 'paused' | 'ended'
export type SubjectVisibility = 'public' | 'restricted'

export interface Database {
  public: {
    Tables: {
      // Manual status history types: regenerate after migration 044 is applied.
      enrollment_status_events: {
        Row: {
          id: string
          enrollment_id: string
          from_status: string
          to_status: string
          reason: string | null
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          enrollment_id: string
          from_status: string
          to_status: string
          reason?: string | null
          actor_id?: string | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      // Manual authoring types: regenerate after migration 041 is applied.
      learn_item_sources: {
        Row: {
          id: string
          uploader_id: string
          storage_path: string
          origin: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          uploader_id: string
          storage_path: string
          origin: string
          note?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['learn_item_sources']['Insert']>
        Relationships: []
      }
      learn_item_drafts: {
        Row: {
          id: string
          source_id: string
          crop: Json | null
          extract: Json
          stem_md: string
          answer_type: string | null
          answer_spec: Json | null
          answer_verified_by: string | null
          ability_candidates: string[]
          ability_id: string | null
          usage_suggested: string | null
          template: Json | null
          enrichment: Json | null
          variants: Json
          hints: Json
          misconceptions: Json
          status: string
          provider: string
          model_id: string
          prompt_version: string
          is_mock: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          crop?: Json | null
          extract: Json
          stem_md: string
          answer_type?: string | null
          answer_spec?: Json | null
          answer_verified_by?: string | null
          ability_candidates?: string[]
          ability_id?: string | null
          usage_suggested?: string | null
          template?: Json | null
          enrichment?: Json | null
          variants?: Json
          hints?: Json
          misconceptions?: Json
          status?: string
          provider: string
          model_id: string
          prompt_version: string
          is_mock?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['learn_item_drafts']['Insert']>
        Relationships: []
      }
      learn_item_templates: {
        Row: {
          id: string
          ability_id: string
          pattern: string
          params: Json
          solver: string
          status: string
          created_from_draft_id: string | null
        }
        Insert: {
          id?: string
          ability_id: string
          pattern: string
          params: Json
          solver: string
          status?: string
          created_from_draft_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_item_templates']['Insert']>
        Relationships: []
      }
      learn_jobs: {
        Row: {
          id: string
          kind: string
          ref_id: string
          status: string
          attempts: number
          max_attempts: number
          locked_at: string | null
          locked_by: string | null
          result: Json | null
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kind: string
          ref_id: string
          status?: string
          attempts?: number
          max_attempts?: number
          locked_at?: string | null
          locked_by?: string | null
          result?: Json | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['learn_jobs']['Insert']>
        Relationships: []
      }

      // Manual learn types: replace with generated types after migration 040 is applied.
      learn_packs: {
        Row: {
          id: string
          title: string
          version: number
          status: string
          source_book: string | null
          map_version: string | null
          checksum: string | null
          imported_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          version: number
          status?: string
          source_book?: string | null
          map_version?: string | null
          checksum?: string | null
          imported_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['learn_packs']['Insert']>
        Relationships: []
      }
      learn_units: {
        Row: {
          id: string
          pack_id: string
          order: number
          title: string
          slide_pages: string | null
          tier: string
        }
        Insert: {
          id: string
          pack_id: string
          order: number
          title: string
          slide_pages?: string | null
          tier: string
        }
        Update: Partial<Database['public']['Tables']['learn_units']['Insert']>
        Relationships: []
      }
      learn_abilities: {
        Row: {
          id: string
          pack_id: string
          unit_id: string
          order_in_unit: number
          name: string
          action: string
          kind: string
          slide_pages: string | null
          is_supplement: boolean
          request_ability: string | null
          source_node_id: string | null
          status: string
        }
        Insert: {
          id: string
          pack_id: string
          unit_id: string
          order_in_unit: number
          name: string
          action: string
          kind: string
          slide_pages?: string | null
          is_supplement?: boolean
          request_ability?: string | null
          source_node_id?: string | null
          status?: string
        }
        Update: Partial<Database['public']['Tables']['learn_abilities']['Insert']>
        Relationships: []
      }
      learn_ability_edges: {
        Row: {
          id: string
          pack_id: string
          source_id: string
          target_id: string
          type: string
          origin: string
          status: string
          reason: string | null
        }
        Insert: {
          id?: string
          pack_id: string
          source_id: string
          target_id: string
          type: string
          origin: string
          status?: string
          reason?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_ability_edges']['Insert']>
        Relationships: []
      }
      learn_goals: {
        Row: {
          id: string
          pack_id: string
          title: string
          track: string | null
          year: number | null
          evidence: string | null
        }
        Insert: {
          id: string
          pack_id: string
          title: string
          track?: string | null
          year?: number | null
          evidence?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_goals']['Insert']>
        Relationships: []
      }
      learn_goal_requirements: {
        Row: {
          goal_id: string
          ability_id: string
          required_level: string
          format_notes: string | null
        }
        Insert: {
          goal_id: string
          ability_id: string
          required_level: string
          format_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_goal_requirements']['Insert']>
        Relationships: []
      }
      learn_materials: {
        Row: {
          id: string
          ability_id: string
          type: string
          slide_pages: string | null
          body_md: string | null
          storage_path: string | null
          lesson_id: string | null
          role: string
          status: string
          version: number
        }
        Insert: {
          id?: string
          ability_id: string
          type: string
          slide_pages?: string | null
          body_md?: string | null
          storage_path?: string | null
          lesson_id?: string | null
          role: string
          status?: string
          version?: number
        }
        Update: Partial<Database['public']['Tables']['learn_materials']['Insert']>
        Relationships: []
      }
      learn_items: {
        Row: {
          id: string
          version: number
          ability_id: string
          usage: string
          variant_group: string | null
          stem_md: string
          answer_type: string
          answer_spec: Json
          hints: Json
          rubric: Json
          required_abilities: string[]
          misconception_ids: string[]
          status: string
          exposure: string
          source_draft_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          version: number
          ability_id: string
          usage: string
          variant_group?: string | null
          stem_md: string
          answer_type: string
          answer_spec: Json
          hints?: Json
          rubric?: Json
          required_abilities?: string[]
          misconception_ids?: string[]
          status?: string
          exposure?: string
          source_draft_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['learn_items']['Insert']>
        Relationships: []
      }
      learn_misconceptions: {
        Row: {
          id: string
          ability_id: string
          pattern: string
          suggests: string[]
          coach_note: string | null
        }
        Insert: {
          id: string
          ability_id: string
          pattern: string
          suggests?: string[]
          coach_note?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_misconceptions']['Insert']>
        Relationships: []
      }
      learn_diagnostic_scripts: {
        Row: {
          id: string
          goal_id: string
          version: number
          base_abilities: string[]
          followup_rule: string | null
          base_items: string[]
          followups: Json
        }
        Insert: {
          id?: string
          goal_id: string
          version: number
          base_abilities?: string[]
          followup_rule?: string | null
          base_items?: string[]
          followups?: Json
        }
        Update: Partial<Database['public']['Tables']['learn_diagnostic_scripts']['Insert']>
        Relationships: []
      }
      learn_rule_configs: {
        Row: {
          id: string
          key: string
          version: number
          config: Json
          active_from: string
          note: string | null
        }
        Insert: {
          id?: string
          key: string
          version: number
          config: Json
          active_from?: string
          note?: string | null
        }
        Update: Partial<Database['public']['Tables']['learn_rule_configs']['Insert']>
        Relationships: []
      }

      payments: {
        Row: {
          id: string
          order_id: string
          user_id: string
          cohort_id: string
          amount: number
          status: string
          payment_key: string | null
          method: string | null
          receipt_url: string | null
          fail_reason: string | null
          created_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          cohort_id: string
          amount: number
          status?: string
          payment_key?: string | null
          method?: string | null
          receipt_url?: string | null
          fail_reason?: string | null
          created_at?: string
          approved_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string
          cohort_id?: string
          amount?: number
          status?: string
          payment_key?: string | null
          method?: string | null
          receipt_url?: string | null
          fail_reason?: string | null
          created_at?: string
          approved_at?: string | null
        }
      }
      profiles: {
        Row: {
          user_id: string
          role: UserRole
          name: string | null
          phone: string | null
          email: string | null
          lead_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: UserRole
          name?: string | null
          phone?: string | null
          email?: string | null
          lead_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: UserRole
          name?: string | null
          phone?: string | null
          email?: string | null
          lead_source?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          is_published: boolean
          interview_workbook_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          is_published?: boolean
          interview_workbook_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          is_published?: boolean
          interview_workbook_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cohorts: {
        Row: {
          id: string
          course_id: string
          title: string
          slug: string | null
          starts_at: string | null
          ends_at: string | null
          is_active: boolean
          max_students: number | null
          price: number
          original_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          slug?: string | null
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          max_students?: number | null
          price?: number
          original_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          slug?: string | null
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          max_students?: number | null
          price?: number
          original_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          subject_id: string | null
          title: string
          sort_order: number
          resources: Json
          description: string | null
          is_published: boolean
          is_free: boolean
          available_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          subject_id?: string | null
          title: string
          sort_order?: number
          resources?: Json
          description?: string | null
          is_published?: boolean
          is_free?: boolean
          available_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          subject_id?: string | null
          title?: string
          sort_order?: number
          resources?: Json
          description?: string | null
          is_published?: boolean
          is_free?: boolean
          available_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          cohort_id: string
          status: EnrollmentStatus
          receipt_contact: string | null
          written_passed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cohort_id: string
          status?: EnrollmentStatus
          receipt_contact?: string | null
          written_passed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cohort_id?: string
          status?: EnrollmentStatus
          receipt_contact?: string | null
          written_passed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      interview_workbook_answers: {
        Row: {
          user_id: string
          answers: Json
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          answers?: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          answers?: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          completed: boolean
          completed_at: string | null
          last_position_seconds: number
          max_position_seconds: number
          auto_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          completed?: boolean
          completed_at?: string | null
          last_position_seconds?: number
          max_position_seconds?: number
          auto_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          completed?: boolean
          completed_at?: string | null
          last_position_seconds?: number
          max_position_seconds?: number
          auto_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          cohort_id: string
          title: string
          body: string
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          title: string
          body: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          title?: string
          body?: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      lesson_videos: {
        Row: {
          id: string
          lesson_id: string
          title: string
          video_url: string
          is_main: boolean
          sort_order: number
          description: string | null
          duration_seconds: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          title: string
          video_url: string
          is_main?: boolean
          sort_order?: number
          description?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          title?: string
          video_url?: string
          is_main?: boolean
          sort_order?: number
          description?: string | null
          duration_seconds?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      lesson_questions: {
        Row: {
          id: string
          lesson_id: string
          user_id: string
          content: string
          video_timestamp: string | null
          image_url: string | null
          image_storage_path: string | null
          is_answered: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          user_id: string
          content: string
          video_timestamp?: string | null
          image_url?: string | null
          image_storage_path?: string | null
          is_answered?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          user_id?: string
          content?: string
          video_timestamp?: string | null
          image_url?: string | null
          image_storage_path?: string | null
          is_answered?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      lesson_answers: {
        Row: {
          id: string
          question_id: string
          admin_id: string
          content: string
          video_url: string | null
          image_url: string | null
          image_storage_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question_id: string
          admin_id: string
          content: string
          video_url?: string | null
          image_url?: string | null
          image_storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          admin_id?: string
          content?: string
          video_url?: string | null
          image_url?: string | null
          image_storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          sort_order: number
          is_published: boolean
          visibility: SubjectVisibility
          resources: Resource[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          sort_order?: number
          is_published?: boolean
          visibility?: SubjectVisibility
          resources?: Resource[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          sort_order?: number
          is_published?: boolean
          visibility?: SubjectVisibility
          resources?: Resource[]
          created_at?: string
          updated_at?: string
        }
      }
      subject_visibility: {
        Row: {
          subject_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          subject_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          subject_id?: string
          user_id?: string
          created_at?: string
        }
      }
      subject_visibility_cohorts: {
        Row: {
          subject_id: string
          cohort_id: string
          created_at: string
        }
        Insert: {
          subject_id: string
          cohort_id: string
          created_at?: string
        }
        Update: {
          subject_id?: string
          cohort_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      learn_items_public: {
        Row: Omit<Database['public']['Tables']['learn_items']['Row'], 'answer_spec' | 'rubric' | 'hints'>
        Relationships: []
      }
      lessons_public: {
        Row: {
          id: string
          course_id: string
          subject_id: string | null
          title: string
          description: string | null
          sort_order: number
          is_free: boolean
          available_at: string | null
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      learn_apply_enrichment: {
        Args: { p_draft_id: string; p_selection: Json }
        Returns: Database['public']['Tables']['learn_items']['Row']
      }
      learn_approve_draft: {
        Args: { p_draft_id: string; p_ability_id: string; p_usage: string; p_item: Json }
        Returns: Database['public']['Tables']['learn_items']['Row']
      }
      learn_append_variants: {
        Args: { p_draft_id: string }
        Returns: number
      }
      learn_claim_job: {
        Args: { p_kind: string; p_worker: string }
        Returns: Database['public']['Tables']['learn_jobs']['Row']
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_enrollment: {
        Args: {
          p_cohort_id: string
        }
        Returns: boolean
      }
      can_access_lesson: {
        Args: {
          p_lesson_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      enrollment_status: EnrollmentStatus
    }
  }
}

// 편의 타입들
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Course = Tables<'courses'>
export type Cohort = Tables<'cohorts'>
export type Lesson = Tables<'lessons'>
export type Enrollment = Tables<'enrollments'>
export type LessonProgress = Tables<'lesson_progress'>
export type Announcement = Tables<'announcements'>
export type LessonVideo = Tables<'lesson_videos'>
export type LessonQuestion = Tables<'lesson_questions'>
export type LessonAnswer = Tables<'lesson_answers'>
export type Subject = Tables<'subjects'>
export type SubjectVisibilityRow = Tables<'subject_visibility'>
export type SubjectVisibilityCohortRow = Tables<'subject_visibility_cohorts'>

// 조인된 타입들
export type CohortWithCourse = Cohort & {
  courses: Course
}

export type EnrollmentWithCohort = Enrollment & {
  cohorts: CohortWithCourse
}

export type LessonWithProgress = Lesson & {
  lesson_progress?: LessonProgress[]
  subjects?: Subject | null
}

export type LessonWithVideos = Lesson & {
  lesson_videos?: LessonVideo[]
  subjects?: Subject | null
}

export type LessonFull = Lesson & {
  lesson_progress?: LessonProgress[]
  lesson_videos?: LessonVideo[]
  subjects?: Subject | null
}

export type LessonQuestionWithAnswer = LessonQuestion & {
  lesson_answers?: LessonAnswer[]
  profiles?: Profile
}

export type LessonQuestionWithDetails = LessonQuestion & {
  lesson_answers?: LessonAnswer[]
  profiles?: { user_id: string; name: string | null } | null
  lessons?: Lesson & {
    courses?: Course
  }
}

export type Resource = {
  type: 'link' | 'pdf' | 'file' | 'image'
  title: string
  url: string
  storage_path?: string // Supabase Storage 경로 (파일 업로드 시)
  caption?: string // image 타입에서 학생 페이지에 노출되는 설명
}

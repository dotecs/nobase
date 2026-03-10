export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'admin'
export type EnrollmentStatus = 'active' | 'paused' | 'ended'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          role: UserRole
          name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: UserRole
          name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: UserRole
          name?: string | null
          phone?: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cohort_id: string
          status?: EnrollmentStatus
          receipt_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cohort_id?: string
          status?: EnrollmentStatus
          receipt_contact?: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          completed?: boolean
          completed_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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

// 조인된 타입들
export type CohortWithCourse = Cohort & {
  courses: Course
}

export type EnrollmentWithCohort = Enrollment & {
  cohorts: CohortWithCourse
}

export type LessonWithProgress = Lesson & {
  lesson_progress?: LessonProgress[]
}

export type LessonWithVideos = Lesson & {
  lesson_videos?: LessonVideo[]
}

export type LessonFull = Lesson & {
  lesson_progress?: LessonProgress[]
  lesson_videos?: LessonVideo[]
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
  type: 'link' | 'pdf' | 'file'
  title: string
  url: string
  storage_path?: string // Supabase Storage 경로 (파일 업로드 시)
}

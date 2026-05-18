import * as tus from 'tus-js-client'
import { createClientSupabaseClient } from './supabase-client'

// 스토리지 버킷 이름
export const STORAGE_BUCKETS = {
  COURSE_THUMBNAILS: 'course-thumbnails',
  LESSON_RESOURCES: 'lesson-resources',
  QA_ATTACHMENTS: 'qa-attachments',
} as const

type BucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

// Standard upload 한도 (Supabase: 50MB)
const STANDARD_UPLOAD_LIMIT = 50 * 1024 * 1024

/**
 * Resumable (TUS) 업로드 — Supabase 표준 50MB 한도를 초과하는 파일에 사용.
 * 성공 시 storage_path 반환, 호출자가 signed URL 등을 별도로 발급.
 */
async function uploadResumable(
  bucket: BucketName,
  path: string,
  file: File,
  options?: { onProgress?: (loaded: number, total: number) => void }
): Promise<{ storagePath: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { storagePath: null, error: new Error('인증이 필요합니다.') }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return { storagePath: null, error: new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.') }
  }

  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // Supabase TUS 요구사항: 정확히 6MB 청크
      onError: (error) => {
        resolve({ storagePath: null, error })
      },
      onProgress: (loaded, total) => {
        options?.onProgress?.(loaded, total)
      },
      onSuccess: () => {
        resolve({ storagePath: path, error: null })
      },
    })

    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0) {
        upload.resumeFromPreviousUpload(prev[0])
      }
      upload.start()
    })
  })
}

/**
 * 파일 업로드
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true, // 같은 경로에 파일이 있으면 덮어쓰기
    })

  if (error) {
    return { url: null, error }
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl, error: null }
}

/**
 * 코스 썸네일 업로드
 */
export async function uploadCourseThumbnail(
  courseId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  // 파일 확장자 추출
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  
  // 파일 경로: courses/{courseId}/thumbnail.{ext}
  const path = `courses/${courseId}/thumbnail.${ext}`
  
  return uploadFile(STORAGE_BUCKETS.COURSE_THUMBNAILS, path, file)
}

/**
 * 레슨 리소스 업로드 (자동 하이브리드: 50MB 이하 standard, 초과 시 resumable TUS)
 */
export async function uploadLessonResource(
  lessonId: string,
  file: File,
  options?: { onProgress?: (loaded: number, total: number) => void }
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = `lessons/${lessonId}/${timestamp}_${safeName}`

  let storagePath: string

  if (file.size > STANDARD_UPLOAD_LIMIT) {
    // 50MB 초과 → resumable
    const { storagePath: tusPath, error } = await uploadResumable(
      STORAGE_BUCKETS.LESSON_RESOURCES,
      path,
      file,
      options
    )
    if (error || !tusPath) {
      return { url: null, storagePath: null, error: error || new Error('업로드 실패') }
    }
    storagePath = tusPath
  } else {
    // 표준 업로드
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.LESSON_RESOURCES)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
    if (error) {
      return { url: null, storagePath: null, error }
    }
    storagePath = data.path
  }

  // 비공개 버킷이므로 signed URL 생성
  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKETS.LESSON_RESOURCES)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7일 유효

  if (urlError) {
    return { url: null, storagePath: null, error: urlError }
  }

  return { url: urlData.signedUrl, storagePath, error: null }
}

/**
 * 과목 공통 자료 업로드 (lesson-resources 버킷 재사용, subjects/ 경로)
 * 자동 하이브리드: 50MB 이하 standard, 초과 시 resumable TUS
 */
export async function uploadSubjectResource(
  subjectId: string,
  file: File,
  options?: { onProgress?: (loaded: number, total: number) => void }
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = `subjects/${subjectId}/${timestamp}_${safeName}`

  let storagePath: string

  if (file.size > STANDARD_UPLOAD_LIMIT) {
    const { storagePath: tusPath, error } = await uploadResumable(
      STORAGE_BUCKETS.LESSON_RESOURCES,
      path,
      file,
      options
    )
    if (error || !tusPath) {
      return { url: null, storagePath: null, error: error || new Error('업로드 실패') }
    }
    storagePath = tusPath
  } else {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.LESSON_RESOURCES)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
    if (error) {
      return { url: null, storagePath: null, error }
    }
    storagePath = data.path
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKETS.LESSON_RESOURCES)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7일

  if (urlError) {
    return { url: null, storagePath: null, error: urlError }
  }

  return { url: urlData.signedUrl, storagePath, error: null }
}

/**
 * 파일 삭제
 */
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<{ error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  return { error }
}

/**
 * 코스 썸네일 삭제
 */
export async function deleteCourseThumbnail(
  courseId: string,
  fileName: string
): Promise<{ error: Error | null }> {
  const path = `courses/${courseId}/${fileName}`
  return deleteFile(STORAGE_BUCKETS.COURSE_THUMBNAILS, path)
}

/**
 * 코스 썸네일 공개 URL 가져오기
 */
export function getCourseThumbnailUrl(path: string): string {
  const supabase = createClientSupabaseClient()
  
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.COURSE_THUMBNAILS)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * 레슨 리소스 서명된 URL 가져오기
 */
export async function getLessonResourceSignedUrl(
  path: string,
  expiresIn: number = 60 * 60 // 기본 1시간
): Promise<{ url: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.LESSON_RESOURCES)
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { url: null, error }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * 버킷 내 파일 목록 조회
 */
export async function listFiles(
  bucket: BucketName,
  folder: string
): Promise<{ files: { name: string; id: string }[]; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    return { files: [], error }
  }

  return {
    files: data.map(file => ({ name: file.name, id: file.id })),
    error: null,
  }
}

/**
 * 이미지 파일 유효성 검사
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF만 가능)',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: '파일 크기가 5MB를 초과합니다.',
    }
  }

  return { valid: true }
}

/**
 * 리소스 파일 유효성 검사
 */
export function validateResourceFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/zip',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  const maxSize = 300 * 1024 * 1024 // 300MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 파일 형식입니다.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: '파일 크기가 300MB를 초과합니다.',
    }
  }

  return { valid: true }
}

/**
 * Q&A 첨부파일 업로드 (학생용 - 이미지만)
 */
export async function uploadQAAttachment(
  userId: string,
  file: File
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  // 파일명에서 특수문자 제거 및 타임스탬프 추가
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = `${userId}/questions/${timestamp}_${safeName}`
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.QA_ATTACHMENTS)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { url: null, storagePath: null, error }
  }

  // 비공개 버킷이므로 signed URL 생성
  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKETS.QA_ATTACHMENTS)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365) // 1년 유효

  if (urlError) {
    return { url: null, storagePath: null, error: urlError }
  }

  return { url: urlData.signedUrl, storagePath: data.path, error: null }
}

/**
 * Q&A 첨부파일 업로드 (관리자용 - 이미지, 동영상)
 */
export async function uploadQAAnswerAttachment(
  adminId: string,
  file: File
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  // 파일명에서 특수문자 제거 및 타임스탬프 추가
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = `admin/${adminId}/answers/${timestamp}_${safeName}`
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.QA_ATTACHMENTS)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { url: null, storagePath: null, error }
  }

  // 비공개 버킷이므로 signed URL 생성
  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKETS.QA_ATTACHMENTS)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365) // 1년 유효

  if (urlError) {
    return { url: null, storagePath: null, error: urlError }
  }

  return { url: urlData.signedUrl, storagePath: data.path, error: null }
}

/**
 * Q&A 첨부파일 서명된 URL 가져오기
 */
export async function getQAAttachmentSignedUrl(
  path: string,
  expiresIn: number = 60 * 60 * 24 * 7 // 기본 7일
): Promise<{ url: string | null; error: Error | null }> {
  const supabase = createClientSupabaseClient()
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.QA_ATTACHMENTS)
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { url: null, error }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * Q&A 첨부파일 삭제
 */
export async function deleteQAAttachment(
  path: string
): Promise<{ error: Error | null }> {
  return deleteFile(STORAGE_BUCKETS.QA_ATTACHMENTS, path)
}

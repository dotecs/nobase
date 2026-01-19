'use client'

import { useState } from 'react'
import { FaTimes, FaPlay } from 'react-icons/fa'
import styles from './enroll.module.css'

interface LessonVideo {
  id: string
  title: string
  video_url: string
  is_main: boolean
}

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  lessonTitle: string
  videos: LessonVideo[]
}

export function PreviewModal({ isOpen, onClose, lessonTitle, videos }: PreviewModalProps) {
  const [selectedVideo, setSelectedVideo] = useState<LessonVideo | null>(
    videos.find(v => v.is_main) || videos[0] || null
  )

  if (!isOpen) return null

  // Vimeo URL을 embed URL로 변환
  const getEmbedUrl = (url: string) => {
    if (!url) return ''
    
    // 이미 embed URL인 경우
    if (url.includes('player.vimeo.com')) {
      return url
    }
    
    // vimeo.com/123456789 형식에서 ID 추출
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`
    }
    
    return url
  }

  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
        <div className={styles.previewHeader}>
          <h3 className={styles.previewTitle}>
            <FaPlay className={styles.previewTitleIcon} />
            {lessonTitle} - 미리보기
          </h3>
          <button className={styles.previewClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.previewContent}>
          {selectedVideo ? (
            <>
              <div className={styles.videoContainer}>
                <iframe
                  src={getEmbedUrl(selectedVideo.video_url)}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={selectedVideo.title}
                />
              </div>
              
              {videos.length > 1 && (
                <div className={styles.videoList}>
                  <h4 className={styles.videoListTitle}>영상 목록</h4>
                  <div className={styles.videoListItems}>
                    {videos.map(video => (
                      <button
                        key={video.id}
                        className={`${styles.videoListItem} ${selectedVideo.id === video.id ? styles.videoListItemActive : ''}`}
                        onClick={() => setSelectedVideo(video)}
                      >
                        <FaPlay className={styles.videoListIcon} />
                        <span className={styles.videoListName}>
                          {video.title}
                          {video.is_main && <span className={styles.mainBadge}>메인</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noVideo}>
              <p>미리보기 영상이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PreviewButtonProps {
  lessonTitle: string
  videos: LessonVideo[]
}

export function PreviewButton({ lessonTitle, videos }: PreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className={styles.previewButton}
        onClick={() => setIsOpen(true)}
      >
        <FaPlay />
        <span>미리보기</span>
      </button>
      
      <PreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lessonTitle={lessonTitle}
        videos={videos}
      />
    </>
  )
}

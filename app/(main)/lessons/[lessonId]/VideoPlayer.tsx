'use client';

import { useState } from 'react';
import { FaPlay, FaVideo, FaStar, FaList } from 'react-icons/fa';
import styles from './lesson.module.css';

interface LessonVideo {
  id: string;
  title: string;
  video_url: string;
  is_main: boolean;
  sort_order: number;
  description: string | null;
}

interface VideoPlayerProps {
  mainVideo: LessonVideo | null;
  subVideos: LessonVideo[];
  lessonTitle: string;
}

// Vimeo URL을 embed URL로 변환
function getVimeoEmbedUrl(url: string): string {
  if (!url) return '';
  
  // 이미 embed URL인 경우
  if (url.includes('player.vimeo.com')) {
    // 추가 파라미터 붙이기
    const hasParams = url.includes('?');
    return url + (hasParams ? '&' : '?') + 'title=0&byline=0&portrait=0&badge=0&autopause=0';
  }
  
  // vimeo.com/123456789 형식에서 ID 추출
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0&badge=0&autopause=0`;
  }
  
  return url;
}

export default function VideoPlayer({ mainVideo, subVideos, lessonTitle }: VideoPlayerProps) {
  const [currentVideo, setCurrentVideo] = useState<LessonVideo | null>(mainVideo);
  const allVideos = mainVideo ? [mainVideo, ...subVideos.filter(v => v.id !== mainVideo.id)] : subVideos;

  if (!currentVideo && allVideos.length === 0) {
    return (
      <div className={styles.noVideo}>
        <div className={styles.noVideoIcon}><FaVideo /></div>
        <p>영상이 준비 중입니다</p>
      </div>
    );
  }

  const embedUrl = currentVideo ? getVimeoEmbedUrl(currentVideo.video_url) : '';

  return (
    <div className={styles.videoPlayerContainer}>
      {/* 메인 비디오 영역 */}
      <div className={styles.mainVideoArea}>
        {currentVideo && embedUrl ? (
          <>
            <div className={styles.videoWrapper}>
              <iframe
                src={embedUrl}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                title={currentVideo.title || lessonTitle}
              />
            </div>
            <div className={styles.currentVideoInfo}>
              <h3 className={styles.currentVideoTitle}>
                {currentVideo.is_main && <FaStar className={styles.mainBadgeIcon} />}
                {currentVideo.title}
              </h3>
              {currentVideo.description && (
                <p className={styles.currentVideoDescription}>{currentVideo.description}</p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.noVideo}>
            <div className={styles.noVideoIcon}><FaVideo /></div>
            <p>영상이 준비 중입니다</p>
          </div>
        )}
      </div>

      {/* 영상 목록 (여러 개일 때만 표시) */}
      {allVideos.length > 1 && (
        <div className={styles.videoListSection}>
          <h4 className={styles.videoListTitle}>
            <FaList />
            영상 목록 ({allVideos.length})
          </h4>
          <div className={styles.videoList}>
            {allVideos.map((video, index) => (
              <button
                key={video.id}
                className={`${styles.videoListItem} ${currentVideo?.id === video.id ? styles.videoListItemActive : ''}`}
                onClick={() => setCurrentVideo(video)}
              >
                <div className={styles.videoListThumbnail}>
                  <FaPlay className={styles.videoListPlayIcon} />
                  <span className={styles.videoListIndex}>{index + 1}</span>
                </div>
                <div className={styles.videoListInfo}>
                  <span className={styles.videoListName}>
                    {video.is_main && <span className={styles.mainBadge}>메인</span>}
                    {video.title}
                  </span>
                  {video.description && (
                    <span className={styles.videoListDesc}>{video.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

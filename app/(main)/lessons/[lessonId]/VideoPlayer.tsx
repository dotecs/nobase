'use client';

import { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
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
  lessonId: string;
  /** 서버에서 가져온 마지막 시청 위치(초). 메인 영상 최초 로드시 seek. */
  initialPosition?: number;
}

// Vimeo URL을 embed URL로 변환
// startSeconds > 0이면 #t=Xs fragment를 붙여 Vimeo가 로드 시 자동 seek (autoplay 불필요)
function getVimeoEmbedUrl(url: string, startSeconds: number = 0): string {
  if (!url) return '';

  let base: string;
  if (url.includes('player.vimeo.com')) {
    const hasParams = url.includes('?');
    base = url + (hasParams ? '&' : '?') + 'title=0&byline=0&portrait=0&badge=0&autopause=0';
  } else {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (match) {
      base = `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0&badge=0&autopause=0`;
    } else {
      base = url;
    }
  }

  // 끝부분(마지막 5초)이면 처음부터, 그 외엔 저장된 위치부터
  if (startSeconds > 5) {
    const safeT = Math.max(0, Math.floor(startSeconds));
    base += `#t=${safeT}s`;
  }
  return base;
}

// 5초 단위로 timeupdate 저장 throttle
const SAVE_INTERVAL_SECONDS = 5;

export default function VideoPlayer({
  mainVideo,
  subVideos,
  lessonTitle,
  lessonId,
  initialPosition = 0,
}: VideoPlayerProps) {
  const [currentVideo, setCurrentVideo] = useState<LessonVideo | null>(mainVideo);
  const allVideos = mainVideo
    ? [mainVideo, ...subVideos.filter((v) => v.id !== mainVideo.id)]
    : subVideos;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastSavedSecRef = useRef<number>(0);
  const initialSeekDoneRef = useRef<boolean>(false);

  // Vimeo Player 인스턴스 attach (메인 영상일 때만 진도 추적)
  useEffect(() => {
    if (!iframeRef.current || !currentVideo) return;
    const isMainVideo = currentVideo.is_main;

    const player = new Player(iframeRef.current);
    playerRef.current = player;

    // 진도 저장 헬퍼
    const saveProgress = async (positionSec: number) => {
      try {
        const duration = await player.getDuration().catch(() => 0);
        const dur = Math.floor(duration || 0);
        const pos = Math.floor(positionSec);
        const res = await fetch(`/api/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: pos, duration: dur }),
          keepalive: true,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          console.error('[progress] save failed', res.status, detail);
          return;
        }
        // 사이드바 실시간 갱신 — 현재 강의의 % 를 broadcast
        if (dur > 0) {
          const percent = Math.min(100, Math.max(1, Math.round((pos / dur) * 100)));
          window.dispatchEvent(
            new CustomEvent('lesson-progress', {
              detail: { lessonId, percent, completed: percent >= 90 },
            })
          );
        }
      } catch (err) {
        console.error('[progress] network error', err);
      }
    };

    // 메인 영상 초기 위치는 URL #t=Xs로 Vimeo가 자동 처리 (autoplay 불필요)
    // throttle 기준점만 동기화
    if (isMainVideo && !initialSeekDoneRef.current && initialPosition > 0) {
      lastSavedSecRef.current = initialPosition;
      initialSeekDoneRef.current = true;
    }

    if (!isMainVideo) {
      // 보조 영상은 진도 저장 안 함. destroy()를 호출하면 iframe이 DOM에서 제거되어
      // React 관리와 충돌하므로 Player 참조만 끊는다.
      return () => {
        playerRef.current = null;
      };
    }

    // 메인 영상: 이벤트 구독
    const handleTimeUpdate = (data: { seconds: number }) => {
      const sec = data.seconds || 0;
      if (sec - lastSavedSecRef.current >= SAVE_INTERVAL_SECONDS) {
        lastSavedSecRef.current = sec;
        saveProgress(sec);
      }
    };

    const handlePause = (data: { seconds: number }) => {
      const sec = data.seconds || 0;
      lastSavedSecRef.current = sec;
      saveProgress(sec);
    };

    const handleEnded = (data: { seconds: number }) => {
      const sec = data.seconds || 0;
      lastSavedSecRef.current = sec;
      saveProgress(sec);
    };

    const handleSeeked = (data: { seconds: number }) => {
      // 큰 점프(예: 1분 이상)는 즉시 저장, 작은 seek는 timeupdate에서 처리
      const sec = data.seconds || 0;
      if (Math.abs(sec - lastSavedSecRef.current) >= 30) {
        lastSavedSecRef.current = sec;
        saveProgress(sec);
      }
    };

    player.on('timeupdate', handleTimeUpdate);
    player.on('pause', handlePause);
    player.on('ended', handleEnded);
    player.on('seeked', handleSeeked);

    // 페이지 떠날 때 마지막 위치 한 번 더 저장
    const handleBeforeUnload = () => {
      player.getCurrentTime().then((sec) => {
        // sendBeacon 대신 keepalive fetch 사용
        navigator.sendBeacon?.(
          `/api/lessons/${lessonId}/progress`,
          new Blob([JSON.stringify({ position: Math.floor(sec), duration: 0 })], {
            type: 'application/json',
          })
        );
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      player.off('timeupdate', handleTimeUpdate);
      player.off('pause', handlePause);
      player.off('ended', handleEnded);
      player.off('seeked', handleSeeked);
      // 마운트 해제 직전 마지막 위치 저장 (영상 전환/페이지 이탈 시)
      // destroy()는 호출 안 함 — iframe을 DOM에서 제거해 React reconciliation을 깨뜨림.
      player
        .getCurrentTime()
        .then((sec) => saveProgress(sec))
        .catch(() => {});
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id, lessonId]);

  if (!currentVideo && allVideos.length === 0) {
    return (
      <div className={styles.noVideo}>
        <div className={styles.noVideoIcon}>
          <FaVideo />
        </div>
        <p>영상이 준비 중입니다</p>
      </div>
    );
  }

  // 메인 영상이고 아직 초기 seek 안 한 경우에만 시작 위치 적용 (전환 후 돌아오는 케이스 제외)
  const startSec =
    currentVideo?.is_main && !initialSeekDoneRef.current ? initialPosition : 0;
  const embedUrl = currentVideo ? getVimeoEmbedUrl(currentVideo.video_url, startSec) : '';

  return (
    <div className={styles.videoPlayerContainer}>
      <div className={styles.mainVideoArea}>
        {currentVideo && embedUrl ? (
          <>
            <div className={styles.videoWrapper}>
              <iframe
                key={currentVideo.id}
                ref={iframeRef}
                src={embedUrl}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                title={currentVideo.title || lessonTitle}
                suppressHydrationWarning
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
            <div className={styles.noVideoIcon}>
              <FaVideo />
            </div>
            <p>영상이 준비 중입니다</p>
          </div>
        )}
      </div>

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
                className={`${styles.videoListItem} ${
                  currentVideo?.id === video.id ? styles.videoListItemActive : ''
                }`}
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

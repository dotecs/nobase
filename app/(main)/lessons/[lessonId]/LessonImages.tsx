'use client';

import { useEffect, useState } from 'react';
import { FaTimes, FaImages } from 'react-icons/fa';
import styles from './lesson.module.css';

interface ImageResource {
  type: 'image';
  title: string;
  url: string;
  storage_path?: string;
  caption?: string;
}

interface LessonImagesProps {
  images: ImageResource[];
}

export default function LessonImages({ images }: LessonImagesProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight' && lightboxIndex < images.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, images.length]);

  if (images.length === 0) return null;

  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <section className={styles.lessonImagesSection}>
      <h3 className={styles.lessonImagesTitle}>
        <FaImages /> 강의 이미지
        <span className={styles.lessonImagesCount}>{images.length}</span>
      </h3>

      <div className={styles.lessonImagesGrid}>
        {images.map((img, i) => {
          const visibleCaption =
            img.caption && img.caption.trim() !== '' && img.caption !== img.title
              ? img.caption
              : '';
          return (
            <figure key={i} className={styles.lessonImageFigure}>
              <button
                type="button"
                className={styles.lessonImageButton}
                onClick={() => setLightboxIndex(i)}
                aria-label={visibleCaption || `이미지 ${i + 1} 확대`}
              >
                <img
                  src={img.url}
                  alt={visibleCaption}
                  className={styles.lessonImage}
                  loading="lazy"
                />
              </button>
              {visibleCaption && (
                <figcaption className={styles.lessonImageCaption}>
                  {visibleCaption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {currentImage && lightboxIndex !== null && (
        <div className={styles.lightboxBackdrop} onClick={() => setLightboxIndex(null)}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightboxIndex(null)}
            aria-label="닫기"
          >
            <FaTimes />
          </button>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              aria-label="이전 이미지"
            >
              ‹
            </button>
          )}
          {lightboxIndex < images.length - 1 && (
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              aria-label="다음 이미지"
            >
              ›
            </button>
          )}
          {(() => {
            const lbCaption =
              currentImage.caption &&
              currentImage.caption.trim() !== '' &&
              currentImage.caption !== currentImage.title
                ? currentImage.caption
                : '';
            return (
              <figure className={styles.lightboxFigure} onClick={(e) => e.stopPropagation()}>
                <img
                  src={currentImage.url}
                  alt={lbCaption}
                  className={styles.lightboxImage}
                />
                {lbCaption && (
                  <figcaption className={styles.lightboxCaption}>
                    {lbCaption}
                  </figcaption>
                )}
              </figure>
            );
          })()}
        </div>
      )}
    </section>
  );
}

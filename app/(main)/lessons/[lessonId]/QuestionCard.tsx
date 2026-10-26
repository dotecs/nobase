'use client';

import { useState } from 'react';
import { LessonQuestionWithAnswer, LessonAnswer } from '@/lib/database.types';
import { FaClock, FaEdit, FaTrash, FaCheckCircle, FaHourglassHalf, FaImage, FaVideo } from 'react-icons/fa';
import styles from './question.module.css';
import { renderMathMarkdown } from '@/lib/math-markdown';

interface QuestionCardProps {
  question: LessonQuestionWithAnswer;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
}

// 수식 파싱 및 렌더링 함수
// 비디오 URL에서 임베드 가능한 URL로 변환
function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

export default function QuestionCard({ question, onEdit, onDelete, isEditing }: QuestionCardProps) {
  const [showImage, setShowImage] = useState(false);
  const answer = question.lesson_answers?.[0] as LessonAnswer | undefined;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isEditing) {
    return null; // Form is shown instead
  }

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <div className={styles.questionStatus}>
          {question.is_answered ? (
            <span className={styles.statusAnswered}>
              <FaCheckCircle /> 답변 완료
            </span>
          ) : (
            <span className={styles.statusPending}>
              <FaHourglassHalf /> 답변 대기중
            </span>
          )}
        </div>
        <div className={styles.questionActions}>
          <button
            className={styles.actionButton}
            onClick={onEdit}
            title="수정"
          >
            <FaEdit />
          </button>
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={onDelete}
            title="삭제"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <div className={styles.questionContent}>
        <p className={styles.questionText}>{question.content}</p>
        
        {question.video_timestamp && (
          <div className={styles.timestamp}>
            <FaClock /> {question.video_timestamp}
          </div>
        )}

        {question.image_url && (
          <div className={styles.questionImage}>
            <button
              className={styles.imageToggle}
              onClick={() => setShowImage(!showImage)}
            >
              <FaImage /> {showImage ? '이미지 숨기기' : '첨부 이미지 보기'}
            </button>
            {showImage && (
              <img
                src={question.image_url}
                alt="질문 첨부 이미지"
                className={styles.attachedImage}
              />
            )}
          </div>
        )}
      </div>

      <div className={styles.questionMeta}>
        {formatDate(question.created_at)}
        {question.updated_at !== question.created_at && ' (수정됨)'}
      </div>

      {answer && (
        <div className={styles.answerSection}>
          <div className={styles.answerHeader}>
            <span className={styles.answerBadge}>관리자 답변</span>
            <span className={styles.answerDate}>{formatDate(answer.created_at)}</span>
          </div>
          
          <div className={styles.answerContent}>
            {renderMathMarkdown(answer.content, { blockClassName: styles.blockMath })}
          </div>

          {answer.video_url && (
            <div className={styles.answerVideo}>
              <div className={styles.answerMediaLabel}>
                <FaVideo /> 동영상
              </div>
              {getEmbedUrl(answer.video_url) ? (
                <div className={styles.videoWrapper}>
                  <iframe
                    src={getEmbedUrl(answer.video_url)!}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={answer.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.videoLink}
                >
                  동영상 보기
                </a>
              )}
            </div>
          )}

          {answer.image_url && (
            <div className={styles.answerImage}>
              <div className={styles.answerMediaLabel}>
                <FaImage /> 이미지
              </div>
              <img
                src={answer.image_url}
                alt="답변 첨부 이미지"
                className={styles.attachedImage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

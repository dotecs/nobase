'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LessonQuestionWithDetails, LessonAnswer, Profile } from '@/lib/database.types';
import { FaClock, FaCheckCircle, FaHourglassHalf, FaReply, FaChevronDown, FaChevronUp, FaBook, FaPlay, FaUser, FaQuestionCircle } from 'react-icons/fa';
import AnswerForm from './AnswerForm';
import styles from './questions.module.css';
import { InlineMath, BlockMath } from 'react-katex';

interface QuestionManagerProps {
  questions: LessonQuestionWithDetails[];
}

// 수식 렌더링 함수 (QuestionCard와 동일)
function renderContentWithMath(content: string) {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.includes('$$')) {
    const startIdx = remaining.indexOf('$$');
    const endIdx = remaining.indexOf('$$', startIdx + 2);
    
    if (endIdx === -1) break;
    
    if (startIdx > 0) {
      parts.push(...renderInlineMath(remaining.slice(0, startIdx), key));
      key += 100;
    }
    
    const mathContent = remaining.slice(startIdx + 2, endIdx);
    try {
      parts.push(
        <div key={`block-${key++}`} className={styles.blockMath}>
          <BlockMath math={mathContent} />
        </div>
      );
    } catch {
      parts.push(<span key={`block-${key++}`}>{`$$${mathContent}$$`}</span>);
    }
    
    remaining = remaining.slice(endIdx + 2);
  }

  if (remaining) {
    parts.push(...renderInlineMath(remaining, key));
  }

  return parts;
}

function renderInlineMath(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = startKey;

  while (remaining.includes('$')) {
    const startIdx = remaining.indexOf('$');
    const endIdx = remaining.indexOf('$', startIdx + 1);
    
    if (endIdx === -1) {
      parts.push(<span key={`text-${key++}`}>{remaining}</span>);
      return parts;
    }
    
    if (startIdx > 0) {
      parts.push(<span key={`text-${key++}`}>{remaining.slice(0, startIdx)}</span>);
    }
    
    const mathContent = remaining.slice(startIdx + 1, endIdx);
    try {
      parts.push(<InlineMath key={`inline-${key++}`} math={mathContent} />);
    } catch {
      parts.push(<span key={`inline-${key++}`}>{`$${mathContent}$`}</span>);
    }
    
    remaining = remaining.slice(endIdx + 1);
  }

  if (remaining) {
    parts.push(<span key={`text-${key++}`}>{remaining}</span>);
  }

  return parts;
}

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

export default function QuestionManager({ questions }: QuestionManagerProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);

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

  const handleAnswerSuccess = () => {
    setAnsweringId(null);
    router.refresh();
  };

  if (questions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FaQuestionCircle className={styles.emptyIcon} />
        <p>질문이 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.questionsList}>
      {questions.map((question) => {
        const answer = question.lesson_answers?.[0] as LessonAnswer | undefined;
        const profile = question.profiles as Profile | undefined;
        const lesson = question.lessons as any;
        const course = lesson?.courses as any;
        const isExpanded = expandedId === question.id;
        const isAnswering = answeringId === question.id;

        return (
          <div key={question.id} className={styles.questionItem}>
            <div 
              className={styles.questionItemHeader}
              onClick={() => setExpandedId(isExpanded ? null : question.id)}
            >
              <div className={styles.questionMeta}>
                <span className={question.is_answered ? styles.statusAnswered : styles.statusPending}>
                  {question.is_answered ? <FaCheckCircle /> : <FaHourglassHalf />}
                  {question.is_answered ? '답변 완료' : '답변 대기'}
                </span>
                <span className={styles.metaItem}>
                  <FaUser /> {profile?.name || '알 수 없음'}
                </span>
                <span className={styles.metaItem}>
                  <FaBook /> {course?.title || '알 수 없음'}
                </span>
                <span className={styles.metaItem}>
                  <FaPlay /> {lesson?.title || '알 수 없음'}
                </span>
              </div>
              <div className={styles.questionPreview}>
                <p className={styles.questionPreviewText}>
                  {question.content.length > 100 
                    ? question.content.slice(0, 100) + '...' 
                    : question.content}
                </p>
                <span className={styles.questionDate}>{formatDate(question.created_at)}</span>
              </div>
              <button className={styles.expandButton}>
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>

            {isExpanded && (
              <div className={styles.questionItemBody}>
                <div className={styles.questionContent}>
                  <h4>질문 내용</h4>
                  <p className={styles.questionFullText}>{question.content}</p>
                  
                  {question.video_timestamp && (
                    <div className={styles.timestamp}>
                      <FaClock /> {question.video_timestamp}
                    </div>
                  )}

                  {question.image_url && (
                    <div className={styles.questionImage}>
                      <img
                        src={question.image_url}
                        alt="질문 첨부 이미지"
                        className={styles.attachedImage}
                      />
                    </div>
                  )}
                </div>

                {answer && (
                  <div className={styles.answerContent}>
                    <h4>관리자 답변</h4>
                    <div className={styles.answerText}>
                      {renderContentWithMath(answer.content)}
                    </div>

                    {answer.video_url && (
                      <div className={styles.answerMedia}>
                        <label>첨부 동영상</label>
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
                      <div className={styles.answerMedia}>
                        <label>첨부 이미지</label>
                        <img
                          src={answer.image_url}
                          alt="답변 첨부 이미지"
                          className={styles.attachedImage}
                        />
                      </div>
                    )}

                    <div className={styles.answerMeta}>
                      답변일: {formatDate(answer.created_at)}
                    </div>
                  </div>
                )}

                {!answer && !isAnswering && (
                  <button
                    className={styles.answerButton}
                    onClick={() => setAnsweringId(question.id)}
                  >
                    <FaReply /> 답변 작성
                  </button>
                )}

                {isAnswering && (
                  <AnswerForm
                    questionId={question.id}
                    onSuccess={handleAnswerSuccess}
                    onCancel={() => setAnsweringId(null)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

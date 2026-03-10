'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { LessonQuestionWithAnswer } from '@/lib/database.types';
import QuestionForm from './QuestionForm';
import QuestionCard from './QuestionCard';
import { FaQuestionCircle, FaPlus } from 'react-icons/fa';
import styles from './question.module.css';

interface QuestionSectionProps {
  lessonId: string;
  userId: string;
}

export default function QuestionSection({ lessonId, userId }: QuestionSectionProps) {
  const [questions, setQuestions] = useState<LessonQuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<LessonQuestionWithAnswer | null>(null);

  const supabase = createClientSupabaseClient();

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lesson_questions')
        .select(`
          *,
          lesson_answers (*)
        `)
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }

      setQuestions((data || []) as LessonQuestionWithAnswer[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [lessonId, userId]);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchQuestions();
  };

  const handleEditSuccess = () => {
    setEditingQuestion(null);
    fetchQuestions();
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('정말 이 질문을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_questions')
        .delete()
        .eq('id', questionId);

      if (error) {
        console.error('Error deleting question:', error);
        alert('질문 삭제 중 오류가 발생했습니다.');
        return;
      }

      fetchQuestions();
    } catch (err) {
      console.error('Error:', err);
      alert('질문 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={styles.questionSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <FaQuestionCircle className={styles.sectionIcon} />
          질문하기
        </h2>
        {!showForm && !editingQuestion && (
          <button
            className={styles.addButton}
            onClick={() => setShowForm(true)}
          >
            <FaPlus /> 새 질문
          </button>
        )}
      </div>

      {showForm && (
        <QuestionForm
          lessonId={lessonId}
          userId={userId}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingQuestion && (
        <QuestionForm
          lessonId={lessonId}
          userId={userId}
          question={editingQuestion}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      <div className={styles.questionList}>
        {loading ? (
          <div className={styles.loading}>질문을 불러오는 중...</div>
        ) : questions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>아직 작성한 질문이 없습니다.</p>
            <p className={styles.emptyHint}>강의에 대해 궁금한 점이 있다면 질문해 보세요!</p>
          </div>
        ) : (
          questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onEdit={() => setEditingQuestion(question)}
              onDelete={() => handleDelete(question.id)}
              isEditing={editingQuestion?.id === question.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

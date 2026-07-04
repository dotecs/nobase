'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import type { Lesson, Subject } from '@/lib/database.types';
import {
  FaPlus,
  FaTrash,
  FaSave,
  FaVideo,
  FaPaperclip,
  FaImages,
  FaGripVertical,
  FaFolder,
  FaEdit,
  FaLink,
  FaTimes,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaUnlock,
  FaCheck,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaUndo,
  FaUserLock,
} from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import LessonVideoModal from './LessonVideoModal';
import LessonResourceModal from './LessonResourceModal';
import LessonImageModal from './LessonImageModal';
import SubjectResourceModal from './SubjectResourceModal';
import SubjectVisibilityModal from './SubjectVisibilityModal';
import SubjectLessonModal from './SubjectLessonModal';
import styles from './CurriculumManager.module.css';

interface CurriculumManagerProps {
  courseId: string;
}

interface EditingLesson extends Lesson {
  isDirty?: boolean;
  _original?: Pick<Lesson, 'title' | 'is_published' | 'is_free' | 'available_at' | 'subject_id'>;
}

type StatusFilter = 'all' | 'published' | 'draft' | 'free' | 'noVideo';

const SUBJECT_COLORS = [
  'var(--color-primary-500)',
  'var(--color-secondary-500)',
  'var(--color-info-500)',
  'var(--color-success-500)',
  'var(--color-warning-500)',
  '#a855f7',
  '#ec4899',
  '#f97316',
];

function subjectColor(index: number) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function formatAvailableAt(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CurriculumManager({ courseId }: CurriculumManagerProps) {
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [lessons, setLessons] = useState<EditingLesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [videoLessonIds, setVideoLessonIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Subject editing
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectTitle, setEditingSubjectTitle] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all'); // 'all' | 'unassigned' | subject_id
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Inline edits for date cell
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingSubjectCellId, setEditingSubjectCellId] = useState<string | null>(null);

  // Drag and Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLTableRowElement | null>(null);

  // Modals
  const [videoModalLesson, setVideoModalLesson] = useState<{ id: string; title: string } | null>(null);
  const [resourceModalLesson, setResourceModalLesson] = useState<{ id: string; title: string } | null>(null);
  const [imageModalLesson, setImageModalLesson] = useState<{ id: string; title: string } | null>(null);
  const [assignSubject, setAssignSubject] = useState<{ id: string; title: string } | null>(null);
  const [subjectResourceModal, setSubjectResourceModal] = useState<{ id: string; title: string } | null>(null);
  const [subjectVisibilityModal, setSubjectVisibilityModal] = useState<{ id: string; title: string } | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Quick-add
  const [newLesson, setNewLesson] = useState({
    title: '',
    subject_id: '' as string,
    is_published: true,
    is_free: false,
  });

  // Fetch all data
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);

      const [{ data: lessonsData }, { data: subjectsData }] = await Promise.all([
        supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('subjects')
          .select('*')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true }),
      ]);

      let videoIds = new Set<string>();
      if (lessonsData && lessonsData.length > 0) {
        const ids = lessonsData.map((l: Lesson) => l.id);
        const { data: videos } = await supabase
          .from('lesson_videos')
          .select('lesson_id')
          .in('lesson_id', ids);
        if (videos) {
          videoIds = new Set(videos.map((v: { lesson_id: string }) => v.lesson_id));
        }
      }

      if (cancelled) return;

      setLessons(
        (lessonsData || []).map((l: Lesson) => ({
          ...l,
          isDirty: false,
          _original: {
            title: l.title,
            is_published: l.is_published,
            is_free: l.is_free,
            available_at: l.available_at,
            subject_id: l.subject_id,
          },
        }))
      );
      setSubjects(subjectsData || []);
      setVideoLessonIds(videoIds);
      setIsLoading(false);
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [courseId, supabase]);

  // Derived: subject map for quick lookup
  const subjectMap = useMemo(() => {
    const map = new Map<string, { subject: Subject; index: number }>();
    subjects.forEach((s, i) => map.set(s.id, { subject: s, index: i }));
    return map;
  }, [subjects]);

  // Derived: lesson.id → 과목 내 순번 (sort_order 기준 1-based)
  const subjectOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    const counter: Record<string, number> = {};
    lessons.forEach((l) => {
      if (l.subject_id) {
        counter[l.subject_id] = (counter[l.subject_id] || 0) + 1;
        map.set(l.id, counter[l.subject_id]);
      }
    });
    return map;
  }, [lessons]);

  // Derived: filtered lessons
  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lessons.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q)) return false;
      if (subjectFilter === 'unassigned' && l.subject_id) return false;
      if (subjectFilter !== 'all' && subjectFilter !== 'unassigned' && l.subject_id !== subjectFilter) return false;
      if (statusFilter === 'published' && !l.is_published) return false;
      if (statusFilter === 'draft' && l.is_published) return false;
      if (statusFilter === 'free' && !l.is_free) return false;
      if (statusFilter === 'noVideo' && videoLessonIds.has(l.id)) return false;
      return true;
    });
  }, [lessons, searchQuery, subjectFilter, statusFilter, videoLessonIds]);

  const filteredIds = useMemo(() => new Set(filteredLessons.map((l) => l.id)), [filteredLessons]);
  const dirtyLessons = useMemo(() => lessons.filter((l) => l.isDirty), [lessons]);
  const selectedFilteredCount = useMemo(
    () => filteredLessons.filter((l) => selectedIds.has(l.id)).length,
    [filteredLessons, selectedIds]
  );

  // Stats
  const stats = useMemo(() => {
    const total = lessons.length;
    const published = lessons.filter((l) => l.is_published).length;
    const free = lessons.filter((l) => l.is_free).length;
    const noVideo = lessons.filter((l) => !videoLessonIds.has(l.id)).length;
    return { total, published, draft: total - published, free, noVideo };
  }, [lessons, videoLessonIds]);

  // ───────────────── Lesson edit (locally dirty) ─────────────────
  const markDirty = (lesson: EditingLesson, patch: Partial<Lesson>): EditingLesson => {
    const merged = { ...lesson, ...patch };
    const orig = lesson._original;
    const isDirty =
      !orig ||
      merged.title !== orig.title ||
      merged.is_published !== orig.is_published ||
      merged.is_free !== orig.is_free ||
      (merged.available_at || null) !== (orig.available_at || null) ||
      (merged.subject_id || null) !== (orig.subject_id || null);
    return { ...merged, isDirty };
  };

  const handleLessonChange = (id: string, field: keyof Lesson, value: any) => {
    setLessons((prev) => prev.map((l) => (l.id === id ? markDirty(l, { [field]: value }) : l)));
  };

  const handleSaveLesson = async (lesson: EditingLesson) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: lesson.title,
          subject_id: lesson.subject_id,
          sort_order: lesson.sort_order,
          is_published: lesson.is_published,
          is_free: lesson.is_free,
          available_at: lesson.available_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id);

      if (error) throw error;

      setLessons((prev) =>
        prev.map((l) =>
          l.id === lesson.id
            ? {
                ...l,
                isDirty: false,
                _original: {
                  title: l.title,
                  is_published: l.is_published,
                  is_free: l.is_free,
                  available_at: l.available_at,
                  subject_id: l.subject_id,
                },
              }
            : l
        )
      );
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleRevertLesson = (id: string) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== id || !l._original) return l;
        return { ...l, ...l._original, isDirty: false };
      })
    );
  };

  const handleSaveAllDirty = async () => {
    if (dirtyLessons.length === 0) return;
    try {
      await Promise.all(
        dirtyLessons.map((lesson) =>
          supabase
            .from('lessons')
            .update({
              title: lesson.title,
              subject_id: lesson.subject_id,
              sort_order: lesson.sort_order,
              is_published: lesson.is_published,
              is_free: lesson.is_free,
              available_at: lesson.available_at || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', lesson.id)
        )
      );

      setLessons((prev) =>
        prev.map((l) => ({
          ...l,
          isDirty: false,
          _original: {
            title: l.title,
            is_published: l.is_published,
            is_free: l.is_free,
            available_at: l.available_at,
            subject_id: l.subject_id,
          },
        }))
      );
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '일괄 저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // ───────────────── Subjects ─────────────────
  const handleAddSubject = async () => {
    if (!newSubjectTitle.trim()) {
      alert({ title: '알림', message: '과목명을 입력해주세요.', type: 'warning' });
      return;
    }
    try {
      const maxSortOrder = subjects.length > 0 ? Math.max(...subjects.map((s) => s.sort_order)) : 0;
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          course_id: courseId,
          title: newSubjectTitle.trim(),
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      setSubjects((prev) => [...prev, data]);
      setNewSubjectTitle('');
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 추가 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleUpdateSubject = async (subjectId: string) => {
    if (!editingSubjectTitle.trim()) {
      alert({ title: '알림', message: '과목명을 입력해주세요.', type: 'warning' });
      return;
    }
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ title: editingSubjectTitle.trim() })
        .eq('id', subjectId);
      if (error) throw error;
      setSubjects((prev) => prev.map((s) => (s.id === subjectId ? { ...s, title: editingSubjectTitle.trim() } : s)));
      setEditingSubjectId(null);
      setEditingSubjectTitle('');
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 수정 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const subjectLessons = lessons.filter((l) => l.subject_id === subjectId);
    if (subjectLessons.length > 0) {
      const confirmed = await confirm({
        title: '과목 삭제',
        message: `이 과목에 ${subjectLessons.length}개의 강의가 연결되어 있습니다. 삭제하면 연결이 해제됩니다. 계속하시겠습니까?`,
        type: 'warning',
      });
      if (!confirmed) return;
    } else {
      const confirmed = await confirm({
        title: '과목 삭제',
        message: '이 과목을 삭제하시겠습니까?',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    try {
      if (subjectLessons.length > 0) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ subject_id: null })
          .eq('subject_id', subjectId);
        if (updateError) throw updateError;
        setLessons((prev) =>
          prev.map((l) =>
            l.subject_id === subjectId
              ? {
                  ...l,
                  subject_id: null,
                  _original: { ...(l._original as any), subject_id: null },
                }
              : l
          )
        );
      }
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
      if (error) throw error;
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleLessonSubjectChange = async (lessonId: string, subjectId: string | null) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ subject_id: subjectId })
        .eq('id', lessonId);
      if (error) throw error;
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lessonId
            ? {
                ...l,
                subject_id: subjectId,
                _original: { ...(l._original as any), subject_id: subjectId },
                isDirty: false,
              }
            : l
        )
      );
      setEditingSubjectCellId(null);
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 변경 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleAssignLessonsToSubject = async (lessonIds: string[], subjectId: string | null) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ subject_id: subjectId })
        .in('id', lessonIds);
      if (error) throw error;
      setLessons((prev) =>
        prev.map((l) =>
          lessonIds.includes(l.id)
            ? {
                ...l,
                subject_id: subjectId,
                _original: { ...(l._original as any), subject_id: subjectId },
                isDirty: false,
              }
            : l
        )
      );
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '강의 배정 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // ───────────────── Drag & Drop ─────────────────
  // Drag is initiated only from the row's drag handle. The row itself is still the drop target.
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const row = e.currentTarget.closest('tr');
    if (!row) return;
    dragNode.current = row as HTMLTableRowElement;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // Use the whole row as the drag preview so the visual feedback matches the actual reorder.
    e.dataTransfer.setDragImage(row, 20, 20);
    setTimeout(() => {
      if (dragNode.current) dragNode.current.classList.add(styles.dragging);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    if (draggedIndex === null) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    if (draggedIndex === dropIndex) {
      resetDragState();
      return;
    }

    const newLessons = [...lessons];
    const [draggedLesson] = newLessons.splice(draggedIndex, 1);
    newLessons.splice(dropIndex, 0, draggedLesson);
    const updatedLessons = newLessons.map((l, i) => ({ ...l, sort_order: i + 1 }));
    setLessons(updatedLessons);
    resetDragState();

    try {
      await Promise.all(
        updatedLessons.map((lesson, i) =>
          supabase.from('lessons').update({ sort_order: i + 1 }).eq('id', lesson.id)
        )
      );
      setLessons((prev) =>
        prev.map((l) => ({
          ...l,
          _original: { ...(l._original as any) },
        }))
      );
    } catch (err) {
      console.error('Error updating order:', err);
      alert({ title: '오류', message: '순서 저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.classList.remove(styles.dragging);
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  // ───────────────── Quick add ─────────────────
  const handleAddLesson = async () => {
    if (!newLesson.title.trim()) {
      alert({ title: '오류', message: '제목을 입력해주세요.', type: 'warning' });
      return;
    }
    try {
      const nextOrder = lessons.length + 1;
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title: newLesson.title.trim(),
          subject_id: newLesson.subject_id || null,
          sort_order: nextOrder,
          is_published: newLesson.is_published,
          is_free: newLesson.is_free,
          resources: [],
        })
        .select()
        .single();
      if (error) throw error;

      setLessons((prev) => [
        ...prev,
        {
          ...data,
          isDirty: false,
          _original: {
            title: data.title,
            is_published: data.is_published,
            is_free: data.is_free,
            available_at: data.available_at,
            subject_id: data.subject_id,
          },
        },
      ]);
      setNewLesson({ title: '', subject_id: newLesson.subject_id, is_published: true, is_free: false });
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '추가 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: '삭제 확인', message: '정말로 이 강의를 삭제하시겠습니까?', type: 'warning' }))) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      setLessons((prev) => prev.filter((l) => l.id !== id));
      setSelectedIds((prev) => {
        const ns = new Set(prev);
        ns.delete(id);
        return ns;
      });
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // ───────────────── Selection / bulk actions ─────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const allSelected = filteredLessons.every((l) => prev.has(l.id));
      const ns = new Set(prev);
      if (allSelected) {
        filteredLessons.forEach((l) => ns.delete(l.id));
      } else {
        filteredLessons.forEach((l) => ns.add(l.id));
      }
      return ns;
    });
  };

  const bulkUpdate = async (patch: Partial<Pick<Lesson, 'is_published' | 'is_free'>>) => {
    const ids = Array.from(selectedIds).filter((id) => filteredIds.has(id));
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      setLessons((prev) =>
        prev.map((l) =>
          ids.includes(l.id)
            ? {
                ...l,
                ...patch,
                _original: { ...(l._original as any), ...patch },
                isDirty: false,
              }
            : l
        )
      );
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '일괄 변경 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds).filter((id) => filteredIds.has(id));
    if (ids.length === 0) return;
    if (
      !(await confirm({
        title: '일괄 삭제',
        message: `${ids.length}개 강의를 삭제하시겠습니까? 되돌릴 수 없습니다.`,
        type: 'warning',
      }))
    )
      return;
    try {
      const { error } = await supabase.from('lessons').delete().in('id', ids);
      if (error) throw error;
      setLessons((prev) => prev.filter((l) => !ids.includes(l.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('all');
    setStatusFilter('all');
  };

  const hasFilters = searchQuery.trim() !== '' || subjectFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className={styles.container}>
      {/* ───────── Header ───────── */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>커리큘럼 관리</h3>
          <p className={styles.subtitle}>강의 순서는 드래그로, 변경 사항은 행 옆 저장 아이콘으로 적용합니다.</p>
        </div>
        <div className={styles.headerActions}>
          {dirtyLessons.length > 0 && (
            <Button size="sm" onClick={handleSaveAllDirty}>
              <FaSave /> {dirtyLessons.length}건 일괄 저장
            </Button>
          )}
        </div>
      </div>

      {/* ───────── Stats ───────── */}
      <div className={styles.statsRow}>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === 'all' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span className={styles.statLabel}>전체</span>
          <span className={styles.statValue}>{stats.total}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === 'published' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'published' ? 'all' : 'published')}
        >
          <FaEye className={styles.statIconSuccess} />
          <span className={styles.statLabel}>공개</span>
          <span className={styles.statValue}>{stats.published}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === 'draft' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
        >
          <FaEyeSlash className={styles.statIconMuted} />
          <span className={styles.statLabel}>비공개</span>
          <span className={styles.statValue}>{stats.draft}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === 'free' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'free' ? 'all' : 'free')}
        >
          <FaUnlock className={styles.statIconInfo} />
          <span className={styles.statLabel}>무료</span>
          <span className={styles.statValue}>{stats.free}</span>
        </button>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === 'noVideo' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'noVideo' ? 'all' : 'noVideo')}
        >
          <FaExclamationTriangle className={styles.statIconWarn} />
          <span className={styles.statLabel}>영상 없음</span>
          <span className={styles.statValue}>{stats.noVideo}</span>
        </button>
      </div>

      {/* ───────── Subject Chips ───────── */}
      <section className={styles.subjectSection}>
        <div className={styles.subjectSectionHead}>
          <h4 className={styles.subjectSectionTitle}>
            <FaFolder /> 과목
            <span className={styles.subjectSectionHint}>클릭하여 강의 필터</span>
          </h4>
        </div>

        <div className={styles.subjectChips}>
          <button
            type="button"
            className={`${styles.subjectChip} ${subjectFilter === 'all' ? styles.subjectChipActive : ''}`}
            onClick={() => setSubjectFilter('all')}
          >
            <span className={styles.subjectChipDot} style={{ background: 'var(--color-gray-400)' }} />
            전체
            <span className={styles.subjectChipCount}>{lessons.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.subjectChip} ${subjectFilter === 'unassigned' ? styles.subjectChipActive : ''}`}
            onClick={() => setSubjectFilter('unassigned')}
          >
            <span className={styles.subjectChipDot} style={{ background: 'var(--color-gray-300)' }} />
            미분류
            <span className={styles.subjectChipCount}>{lessons.filter((l) => !l.subject_id).length}</span>
          </button>

          {subjects.map((subject, idx) => {
            const count = lessons.filter((l) => l.subject_id === subject.id).length;
            const color = subjectColor(idx);
            const isActive = subjectFilter === subject.id;
            const isEditing = editingSubjectId === subject.id;

            if (isEditing) {
              return (
                <div key={subject.id} className={styles.subjectChipEdit}>
                  <input
                    type="text"
                    value={editingSubjectTitle}
                    onChange={(e) => setEditingSubjectTitle(e.target.value)}
                    className={styles.subjectChipInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateSubject(subject.id);
                      if (e.key === 'Escape') {
                        setEditingSubjectId(null);
                        setEditingSubjectTitle('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.subjectChipSave}
                    onClick={() => handleUpdateSubject(subject.id)}
                    title="저장"
                  >
                    <FaCheck size={11} />
                  </button>
                  <button
                    type="button"
                    className={styles.subjectChipCancel}
                    onClick={() => {
                      setEditingSubjectId(null);
                      setEditingSubjectTitle('');
                    }}
                    title="취소"
                  >
                    <FaTimes size={11} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={subject.id}
                className={`${styles.subjectChip} ${isActive ? styles.subjectChipActive : ''}`}
                style={isActive ? { borderColor: color, background: `${color}15` } : undefined}
              >
                <button
                  type="button"
                  className={styles.subjectChipMain}
                  onClick={() => setSubjectFilter(isActive ? 'all' : subject.id)}
                >
                  <span className={styles.subjectChipDot} style={{ background: color }} />
                  {subject.title}
                  <span className={styles.subjectChipCount}>{count}</span>
                </button>
                <div className={styles.subjectChipActions}>
                  <button
                    type="button"
                    className={styles.subjectMicroBtn}
                    title="과목 공통 자료"
                    onClick={() => setSubjectResourceModal({ id: subject.id, title: subject.title })}
                  >
                    <FaPaperclip size={10} />
                  </button>
                  <button
                    type="button"
                    className={styles.subjectMicroBtn}
                    title="강의 배정"
                    onClick={() => setAssignSubject({ id: subject.id, title: subject.title })}
                  >
                    <FaLink size={10} />
                  </button>
                  <button
                    type="button"
                    className={styles.subjectMicroBtn}
                    title={subject.visibility === 'restricted' ? '공개 대상 관리 (제한 공개 중)' : '공개 대상 관리'}
                    onClick={() => setSubjectVisibilityModal({ id: subject.id, title: subject.title })}
                    style={
                      subject.visibility === 'restricted'
                        ? { color: 'var(--color-warning-700, #b45309)' }
                        : undefined
                    }
                  >
                    <FaUserLock size={10} />
                  </button>
                  <button
                    type="button"
                    className={styles.subjectMicroBtn}
                    title="이름 변경"
                    onClick={() => {
                      setEditingSubjectId(subject.id);
                      setEditingSubjectTitle(subject.title);
                    }}
                  >
                    <FaEdit size={10} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.subjectMicroBtn} ${styles.subjectMicroBtnDanger}`}
                    title="삭제"
                    onClick={() => handleDeleteSubject(subject.id)}
                  >
                    <FaTrash size={10} />
                  </button>
                </div>
              </div>
            );
          })}

          <div className={styles.subjectAdd}>
            <input
              type="text"
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              placeholder="새 과목 추가"
              className={styles.subjectAddInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubject();
              }}
            />
            <button
              type="button"
              className={styles.subjectAddBtn}
              onClick={handleAddSubject}
              disabled={!newSubjectTitle.trim()}
            >
              <FaPlus size={11} />
            </button>
          </div>
        </div>
      </section>

      {/* ───────── Quick Add ───────── */}
      <section className={styles.quickAdd}>
        <div className={styles.quickAddRow}>
          <input
            type="text"
            className={styles.quickAddInput}
            value={newLesson.title}
            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            placeholder="새 강의 제목을 입력하고 Enter — #{order} 자리에 추가됩니다"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddLesson();
            }}
          />
          <select
            className={styles.quickAddSelect}
            value={newLesson.subject_id}
            onChange={(e) => setNewLesson({ ...newLesson, subject_id: e.target.value })}
          >
            <option value="">미분류</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <label className={styles.quickAddCheck}>
            <input
              type="checkbox"
              checked={newLesson.is_free}
              onChange={(e) => setNewLesson({ ...newLesson, is_free: e.target.checked })}
            />
            <FaUnlock size={11} /> 무료
          </label>
          <label className={styles.quickAddCheck}>
            <input
              type="checkbox"
              checked={newLesson.is_published}
              onChange={(e) => setNewLesson({ ...newLesson, is_published: e.target.checked })}
            />
            <FaEye size={11} /> 공개
          </label>
          <Button size="sm" onClick={handleAddLesson} disabled={!newLesson.title.trim()}>
            <FaPlus /> 강의 추가
          </Button>
        </div>
      </section>

      {/* ───────── Toolbar (Search) ───────── */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="제목으로 검색…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button type="button" className={styles.searchClear} onClick={() => setSearchQuery('')} title="검색 지우기">
              <FaTimes size={11} />
            </button>
          )}
        </div>

        <div className={styles.toolbarMeta}>
          {filteredLessons.length !== lessons.length && (
            <span className={styles.filterCount}>
              {filteredLessons.length} / {lessons.length}
            </span>
          )}
          {hasFilters && (
            <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
              <FaUndo size={10} /> 필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* ───────── Bulk Action Bar ───────── */}
      {selectedFilteredCount > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="일괄 작업">
          <div className={styles.bulkInfo}>
            <FaCheck /> {selectedFilteredCount}개 선택됨
          </div>
          <div className={styles.bulkActions}>
            <button type="button" className={styles.bulkBtn} onClick={() => bulkUpdate({ is_published: true })}>
              <FaEye /> 공개
            </button>
            <button type="button" className={styles.bulkBtn} onClick={() => bulkUpdate({ is_published: false })}>
              <FaEyeSlash /> 비공개
            </button>
            <button type="button" className={styles.bulkBtn} onClick={() => bulkUpdate({ is_free: true })}>
              <FaUnlock /> 무료 설정
            </button>
            <button type="button" className={styles.bulkBtn} onClick={() => bulkUpdate({ is_free: false })}>
              유료 설정
            </button>
            <button type="button" className={styles.bulkBtn} onClick={() => setBulkAssignOpen(true)}>
              <FaFolder /> 과목 배정
            </button>
            <button type="button" className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={bulkDelete}>
              <FaTrash /> 삭제
            </button>
            <button type="button" className={styles.bulkClear} onClick={() => setSelectedIds(new Set())}>
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* ───────── Lesson Table ───────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colSelect}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={filteredLessons.length > 0 && filteredLessons.every((l) => selectedIds.has(l.id))}
                  ref={(el) => {
                    if (el) {
                      const some = filteredLessons.some((l) => selectedIds.has(l.id));
                      const all = filteredLessons.every((l) => selectedIds.has(l.id));
                      el.indeterminate = some && !all;
                    }
                  }}
                  onChange={toggleSelectAllFiltered}
                  aria-label="전체 선택"
                />
              </th>
              <th className={styles.colHandle}></th>
              <th className={styles.colOrder}>#</th>
              <th className={styles.colOrder} title="과목 내 순번">과목 #</th>
              <th className={styles.colTitle}>제목</th>
              <th className={styles.colSubject}>과목</th>
              <th className={styles.colContent}>콘텐츠</th>
              <th className={styles.colFree}>무료</th>
              <th className={styles.colPub}>공개</th>
              <th className={styles.colDate}>공개일</th>
              <th className={styles.colAction}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className={styles.emptyRow}>
                  불러오는 중…
                </td>
              </tr>
            ) : filteredLessons.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyRow}>
                  {lessons.length === 0
                    ? '아직 등록된 강의가 없습니다. 위에서 강의를 추가하세요.'
                    : '필터 조건에 일치하는 강의가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredLessons.map((lesson) => {
                const realIndex = lessons.findIndex((l) => l.id === lesson.id);
                const subjectEntry = lesson.subject_id ? subjectMap.get(lesson.subject_id) : undefined;
                const subjectInfo = subjectEntry
                  ? { title: subjectEntry.subject.title, color: subjectColor(subjectEntry.index) }
                  : null;
                const isSelected = selectedIds.has(lesson.id);
                const isDirty = !!lesson.isDirty;
                const resourcesArr = (lesson.resources as any[]) || [];
                const imageCount = resourcesArr.filter((r) => r?.type === 'image').length;
                const resourceCount = resourcesArr.length - imageCount;
                const hasVideo = videoLessonIds.has(lesson.id);
                const availableText = formatAvailableAt(lesson.available_at);

                return (
                  <tr
                    key={lesson.id}
                    onDragOver={(e) => handleDragOver(e, realIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, realIndex)}
                    className={[
                      dragOverIndex === realIndex ? styles.dragOver : '',
                      isDirty ? styles.dirtyRow : '',
                      isSelected ? styles.selectedRow : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td className={styles.colSelect}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleSelect(lesson.id)}
                        aria-label={`${lesson.title} 선택`}
                      />
                    </td>
                    <td className={styles.colHandle}>
                      <div
                        className={styles.dragHandle}
                        draggable
                        onDragStart={(e) => handleDragStart(e, realIndex)}
                        onDragEnd={handleDragEnd}
                        title="드래그하여 순서 변경"
                      >
                        <FaGripVertical />
                      </div>
                    </td>
                    <td className={styles.colOrder}>{lesson.sort_order}</td>
                    <td className={`${styles.colOrder} ${styles.colSubjectOrder}`}>
                      {subjectOrderMap.get(lesson.id) ?? '—'}
                    </td>
                    <td className={styles.colTitle}>
                      <input
                        type="text"
                        className={styles.titleInput}
                        value={lesson.title}
                        onChange={(e) => handleLessonChange(lesson.id, 'title', e.target.value)}
                        placeholder="강의 제목"
                      />
                    </td>
                    <td className={styles.colSubject}>
                      {editingSubjectCellId === lesson.id ? (
                        <select
                          autoFocus
                          className={styles.subjectSelect}
                          value={lesson.subject_id || ''}
                          onChange={(e) => handleLessonSubjectChange(lesson.id, e.target.value || null)}
                          onBlur={() => setEditingSubjectCellId(null)}
                        >
                          <option value="">미분류</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.subjectTag} ${!subjectInfo ? styles.subjectTagUnassigned : ''}`}
                          onClick={() => setEditingSubjectCellId(lesson.id)}
                          style={
                            subjectInfo
                              ? {
                                  color: subjectInfo.color,
                                  borderColor: `${subjectInfo.color}55`,
                                  background: `${subjectInfo.color}10`,
                                }
                              : undefined
                          }
                          title="클릭하여 과목 변경"
                        >
                          <span
                            className={styles.subjectTagDot}
                            style={{ background: subjectInfo?.color || 'var(--color-gray-300)' }}
                          />
                          {subjectInfo?.title || '미분류'}
                        </button>
                      )}
                    </td>
                    <td className={styles.colContent}>
                      <div className={styles.contentBtns}>
                        <button
                          type="button"
                          className={`${styles.contentBtn} ${hasVideo ? styles.contentBtnActive : styles.contentBtnEmpty}`}
                          onClick={() => setVideoModalLesson({ id: lesson.id, title: lesson.title })}
                          title={hasVideo ? '영상 관리' : '영상 없음 — 추가하기'}
                        >
                          <FaVideo />
                          {hasVideo ? '' : <FaExclamationTriangle className={styles.contentWarn} size={9} />}
                        </button>
                        <button
                          type="button"
                          className={`${styles.contentBtn} ${imageCount > 0 ? styles.contentBtnActive : ''}`}
                          onClick={() => setImageModalLesson({ id: lesson.id, title: lesson.title })}
                          title="이미지 관리"
                        >
                          <FaImages />
                          <span className={styles.contentCount}>{imageCount}</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.contentBtn} ${resourceCount > 0 ? styles.contentBtnActive : ''}`}
                          onClick={() => setResourceModalLesson({ id: lesson.id, title: lesson.title })}
                          title="학습 자료 관리"
                        >
                          <FaPaperclip />
                          <span className={styles.contentCount}>{resourceCount}</span>
                        </button>
                      </div>
                    </td>
                    <td className={styles.colFree}>
                      <button
                        type="button"
                        className={`${styles.toggle} ${lesson.is_free ? styles.toggleOnInfo : ''}`}
                        onClick={() => handleLessonChange(lesson.id, 'is_free', !lesson.is_free)}
                        aria-pressed={lesson.is_free}
                        title={lesson.is_free ? '무료 — 클릭하여 유료로' : '유료 — 클릭하여 무료로'}
                      >
                        <span className={styles.toggleDot} />
                      </button>
                    </td>
                    <td className={styles.colPub}>
                      <button
                        type="button"
                        className={`${styles.toggle} ${lesson.is_published ? styles.toggleOn : ''}`}
                        onClick={() => handleLessonChange(lesson.id, 'is_published', !lesson.is_published)}
                        aria-pressed={lesson.is_published}
                        title={lesson.is_published ? '공개 — 클릭하여 비공개로' : '비공개 — 클릭하여 공개로'}
                      >
                        <span className={styles.toggleDot} />
                      </button>
                    </td>
                    <td className={styles.colDate}>
                      {editingDateId === lesson.id ? (
                        <input
                          type="datetime-local"
                          autoFocus
                          className={styles.dateInput}
                          value={lesson.available_at ? lesson.available_at.slice(0, 16) : ''}
                          onChange={(e) => handleLessonChange(lesson.id, 'available_at', e.target.value || null)}
                          onBlur={() => setEditingDateId(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          className={`${styles.dateBtn} ${availableText ? '' : styles.dateBtnDefault}`}
                          onClick={() => setEditingDateId(lesson.id)}
                          title="공개일 설정 (비워두면 즉시 공개)"
                        >
                          <FaCalendarAlt size={10} />
                          {availableText || '즉시 공개'}
                        </button>
                      )}
                    </td>
                    <td className={styles.colAction}>
                      <div className={styles.rowActions}>
                        {isDirty && (
                          <>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnSave}`}
                              onClick={() => handleSaveLesson(lesson)}
                              title="변경사항 저장"
                            >
                              <FaSave size={13} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleRevertLesson(lesson.id)}
                              title="변경 취소"
                            >
                              <FaUndo size={12} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDelete(lesson.id)}
                          title="삭제"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ───────── Modals ───────── */}
      {videoModalLesson && (
        <LessonVideoModal
          lessonId={videoModalLesson.id}
          lessonTitle={videoModalLesson.title}
          isOpen={true}
          onClose={async () => {
            setVideoModalLesson(null);
            const { data: videos } = await supabase
              .from('lesson_videos')
              .select('lesson_id')
              .in('lesson_id', lessons.map((l) => l.id));
            if (videos) {
              setVideoLessonIds(new Set(videos.map((v: { lesson_id: string }) => v.lesson_id)));
            }
          }}
        />
      )}

      {resourceModalLesson && (
        <LessonResourceModal
          lessonId={resourceModalLesson.id}
          lessonTitle={resourceModalLesson.title}
          isOpen={true}
          onClose={() => {
            setResourceModalLesson(null);
            const fetchLessons = async () => {
              const { data } = await supabase
                .from('lessons')
                .select('*')
                .eq('course_id', courseId)
                .order('sort_order', { ascending: true });
              if (data) {
                setLessons((prev) =>
                  data.map((l: Lesson) => {
                    const existing = prev.find((p) => p.id === l.id);
                    return {
                      ...l,
                      isDirty: existing?.isDirty || false,
                      _original: existing?._original || {
                        title: l.title,
                        is_published: l.is_published,
                        is_free: l.is_free,
                        available_at: l.available_at,
                        subject_id: l.subject_id,
                      },
                    };
                  })
                );
              }
            };
            fetchLessons();
          }}
        />
      )}

      {imageModalLesson && (
        <LessonImageModal
          lessonId={imageModalLesson.id}
          lessonTitle={imageModalLesson.title}
          isOpen={true}
          onClose={() => {
            setImageModalLesson(null);
            const fetchLessons = async () => {
              const { data } = await supabase
                .from('lessons')
                .select('*')
                .eq('course_id', courseId)
                .order('sort_order', { ascending: true });
              if (data) {
                setLessons((prev) =>
                  data.map((l: Lesson) => {
                    const existing = prev.find((p) => p.id === l.id);
                    return {
                      ...l,
                      isDirty: existing?.isDirty || false,
                      _original: existing?._original || {
                        title: l.title,
                        is_published: l.is_published,
                        is_free: l.is_free,
                        available_at: l.available_at,
                        subject_id: l.subject_id,
                      },
                    };
                  })
                );
              }
            };
            fetchLessons();
          }}
        />
      )}

      {assignSubject && (
        <SubjectLessonModal
          isOpen={true}
          onClose={() => setAssignSubject(null)}
          subjectId={assignSubject.id}
          subjectTitle={assignSubject.title}
          lessons={lessons}
          onAssignLessons={async (lessonIds) => {
            await handleAssignLessonsToSubject(lessonIds, assignSubject.id);
          }}
        />
      )}

      {subjectResourceModal && (
        <SubjectResourceModal
          isOpen={true}
          subjectId={subjectResourceModal.id}
          subjectTitle={subjectResourceModal.title}
          onClose={() => setSubjectResourceModal(null)}
        />
      )}

      {subjectVisibilityModal && (
        <SubjectVisibilityModal
          isOpen={true}
          subjectId={subjectVisibilityModal.id}
          subjectTitle={subjectVisibilityModal.title}
          courseId={courseId}
          onClose={() => setSubjectVisibilityModal(null)}
          onSaved={(visibility) => {
            setSubjects((prev) =>
              prev.map((s) =>
                s.id === subjectVisibilityModal.id ? { ...s, visibility } : s
              )
            );
          }}
        />
      )}

      {bulkAssignOpen && (
        <BulkSubjectAssign
          subjects={subjects}
          selectedCount={selectedFilteredCount}
          onClose={() => setBulkAssignOpen(false)}
          onAssign={async (subjectId) => {
            const ids = Array.from(selectedIds).filter((id) => filteredIds.has(id));
            await handleAssignLessonsToSubject(ids, subjectId);
            setBulkAssignOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface BulkSubjectAssignProps {
  subjects: Subject[];
  selectedCount: number;
  onClose: () => void;
  onAssign: (subjectId: string | null) => Promise<void>;
}

function BulkSubjectAssign({ subjects, selectedCount, onClose, onAssign }: BulkSubjectAssignProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handle = async (subjectId: string | null) => {
    setPendingId(subjectId || '__none');
    try {
      await onAssign(subjectId);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className={styles.bulkAssignOverlay} onClick={onClose}>
      <div className={styles.bulkAssignModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.bulkAssignHead}>
          <h3>과목 배정</h3>
          <button type="button" className={styles.bulkAssignClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <p className={styles.bulkAssignDesc}>
          선택한 <strong>{selectedCount}개</strong> 강의를 다음 과목으로 이동합니다.
        </p>
        <div className={styles.bulkAssignList}>
          <button
            type="button"
            className={styles.bulkAssignOption}
            onClick={() => handle(null)}
            disabled={pendingId !== null}
          >
            <span className={styles.subjectTagDot} style={{ background: 'var(--color-gray-300)' }} />
            미분류로 이동
          </button>
          {subjects.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={styles.bulkAssignOption}
              onClick={() => handle(s.id)}
              disabled={pendingId !== null}
            >
              <span className={styles.subjectTagDot} style={{ background: subjectColor(idx) }} />
              {s.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

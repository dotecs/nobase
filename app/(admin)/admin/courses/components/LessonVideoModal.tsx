'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import type { LessonVideo } from '@/lib/database.types';
import { FaPlus, FaTrash, FaSave, FaStar, FaRegStar, FaTimes, FaPlay, FaGripVertical } from 'react-icons/fa';
import { Button } from '@/components';
import styles from './LessonVideoModal.module.css';

interface LessonVideoModalProps {
  lessonId: string;
  lessonTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EditingVideo extends LessonVideo {
  isDirty?: boolean;
}

export default function LessonVideoModal({ 
  lessonId, 
  lessonTitle, 
  isOpen, 
  onClose 
}: LessonVideoModalProps) {
  const supabase = createClientSupabaseClient() as any;
  
  const [videos, setVideos] = useState<EditingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLTableRowElement | null>(null);
  
  // New Video State
  const [newVideo, setNewVideo] = useState({
    title: '',
    video_url: '',
    description: '',
  });

  // Fetch Videos
  useEffect(() => {
    if (!isOpen || !lessonId) return;
    
    const fetchVideos = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lesson_videos')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('is_main', { ascending: false })
        .order('sort_order', { ascending: true });

      setIsLoading(false);

      if (error) {
        console.error('Error fetching videos:', error);
        return;
      }

      setVideos(data || []);
    };

    fetchVideos();
  }, [lessonId, isOpen, supabase]);

  // Extract Vimeo video ID from URL
  const extractVimeoId = (url: string): string | null => {
    const patterns = [
      /player\.vimeo\.com\/video\/(\d+)/,
      /vimeo\.com\/(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Generate embed URL
  const getEmbedUrl = (url: string): string => {
    const videoId = extractVimeoId(url);
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`;
    }
    return url;
  };

  // Handle Input Change for Existing Videos
  const handleVideoChange = (id: string, field: keyof LessonVideo, value: any) => {
    setVideos(prev => prev.map(video => {
      if (video.id === id) {
        return { ...video, [field]: value, isDirty: true };
      }
      return video;
    }));
  };

  // Save specific video
  const handleSaveVideo = async (video: EditingVideo) => {
    try {
      const { error } = await supabase
        .from('lesson_videos')
        .update({
          title: video.title,
          video_url: video.video_url,
          sort_order: video.sort_order,
          description: video.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', video.id);

      if (error) throw error;

      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, isDirty: false } : v));
    } catch (err: any) {
      console.error('Error saving video:', err);
      alert(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    dragNode.current = e.currentTarget;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Add dragging class after a short delay for visual feedback
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.classList.add(styles.dragging);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      resetDragState();
      return;
    }

    // Reorder videos
    const newVideos = [...videos];
    const [draggedVideo] = newVideos.splice(draggedIndex, 1);
    newVideos.splice(dropIndex, 0, draggedVideo);

    // Update sort_order for all videos
    const updatedVideos = newVideos.map((video, index) => ({
      ...video,
      sort_order: index,
      isDirty: video.sort_order !== index ? true : video.isDirty
    }));

    setVideos(updatedVideos);
    resetDragState();

    // Save new order to database
    try {
      const updates = updatedVideos.map((video, index) => 
        supabase
          .from('lesson_videos')
          .update({ sort_order: index })
          .eq('id', video.id)
      );
      
      await Promise.all(updates);
      
      // Mark all as not dirty after successful save
      setVideos(prev => prev.map(v => ({ ...v, isDirty: false })));
    } catch (err: any) {
      console.error('Error updating order:', err);
      alert('순서 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.classList.remove(styles.dragging);
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  // Add New Video
  const handleAddVideo = async () => {
    if (!newVideo.title.trim() || !newVideo.video_url.trim()) {
      return;
    }

    try {
      const isFirstVideo = videos.length === 0;
      const nextOrder = videos.length;

      const { data, error } = await supabase
        .from('lesson_videos')
        .insert({
          lesson_id: lessonId,
          title: newVideo.title,
          video_url: newVideo.video_url,
          is_main: isFirstVideo,
          sort_order: nextOrder,
          description: newVideo.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      setVideos(prev => [...prev, data]);
      setNewVideo({ 
        title: '', 
        video_url: '', 
        description: '' 
      });

    } catch (err: any) {
      console.error('Error adding video:', err);
      alert(err.message || '영상 추가 중 오류가 발생했습니다.');
    }
  };

  // Delete Video
  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm('이 영상을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('lesson_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      console.error('Error deleting video:', err);
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  // Set as Main Video
  const handleSetMain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lesson_videos')
        .update({ is_main: true })
        .eq('id', id);

      if (error) throw error;

      setVideos(prev => prev.map(v => ({
        ...v,
        is_main: v.id === id
      })));
    } catch (err: any) {
      console.error('Error setting main video:', err);
      alert(err.message || '메인 영상 설정 중 오류가 발생했습니다.');
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            영상 관리
            <span className={styles.lessonTitle}>{lessonTitle}</span>
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>로딩 중...</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ width: '50px', textAlign: 'center' }}>메인</th>
                    <th style={{ width: '180px' }}>제목</th>
                    <th>Vimeo URL</th>
                    <th style={{ width: '150px' }}>설명</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Existing Videos */}
                  {videos.map((video, index) => (
                    <tr 
                      key={video.id} 
                      className={`
                        ${video.is_main ? styles.mainRow : ''} 
                        ${draggedIndex === index ? styles.dragging : ''}
                        ${dragOverIndex === index ? styles.dragOver : ''}
                      `}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <td>
                        <div className={styles.dragHandle} title="드래그하여 순서 변경">
                          <FaGripVertical />
                        </div>
                      </td>
                      <td>
                        <div className={styles.mainCell}>
                          {video.is_main ? (
                            <span className={styles.mainBadge} title="메인 영상">
                              <FaStar />
                            </span>
                          ) : (
                            <button
                              className={styles.setMainBtn}
                              onClick={() => handleSetMain(video.id)}
                              title="메인으로 설정"
                            >
                              <FaRegStar />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={video.title}
                          onChange={(e) => handleVideoChange(video.id, 'title', e.target.value)}
                          placeholder="영상 제목"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={video.video_url}
                          onChange={(e) => handleVideoChange(video.id, 'video_url', e.target.value)}
                          placeholder="https://vimeo.com/..."
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={video.description || ''}
                          onChange={(e) => handleVideoChange(video.id, 'description', e.target.value)}
                          placeholder="설명 (선택)"
                        />
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {video.isDirty && (
                            <button
                              className={`${styles.iconButton} ${styles.save}`}
                              onClick={() => handleSaveVideo(video)}
                              title="저장"
                            >
                              <FaSave />
                            </button>
                          )}
                          <button
                            className={`${styles.iconButton} ${styles.preview}`}
                            onClick={() => setPreviewUrl(video.video_url)}
                            title="미리보기"
                          >
                            <FaPlay />
                          </button>
                          <button
                            className={`${styles.iconButton} ${styles.delete}`}
                            onClick={() => handleDeleteVideo(video.id)}
                            title="삭제"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* New Video Row */}
                  <tr className={styles.newRow}>
                    <td>
                      {/* No drag handle for new row */}
                    </td>
                    <td>
                      <div className={styles.mainCell}>
                        {videos.length === 0 && (
                          <span className={styles.autoMainHint} title="첫 영상은 자동으로 메인">
                            <FaStar />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        placeholder="새 영상 제목..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddVideo();
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={newVideo.video_url}
                        onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                        placeholder="https://vimeo.com/..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddVideo();
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={newVideo.description}
                        onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                        placeholder="설명 (선택)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddVideo();
                        }}
                      />
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button 
                          size="sm" 
                          onClick={handleAddVideo} 
                          disabled={!newVideo.title.trim() || !newVideo.video_url.trim()}
                        >
                          <FaPlus /> 추가
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {videos.length === 0 && (
                <div className={styles.emptyHint}>
                  위 입력란에 영상 정보를 입력하고 추가 버튼을 클릭하세요.
                </div>
              )}
              
              {videos.length > 1 && (
                <div className={styles.dragHint}>
                  💡 왼쪽 핸들(⋮⋮)을 드래그하여 순서를 변경할 수 있습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Preview Modal */}
        {previewUrl && (
          <div className={styles.previewBackdrop} onClick={() => setPreviewUrl(null)}>
            <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.previewClose} onClick={() => setPreviewUrl(null)}>
                <FaTimes />
              </button>
              <div className={styles.previewContainer}>
                <iframe
                  src={getEmbedUrl(previewUrl)}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Video Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

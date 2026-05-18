'use client';

import { useState } from 'react';
import { FaFilePdf, FaExternalLinkAlt, FaFolder, FaDownload, FaSpinner } from 'react-icons/fa';
import styles from './lesson.module.css';

interface Resource {
  type: 'link' | 'pdf' | 'file' | 'image';
  title: string;
  url: string;
  storage_path?: string;
  caption?: string;
}

interface LessonResourcesProps {
  resources: Resource[];
  lessonId: string;
}

export default function LessonResources({ resources, lessonId }: LessonResourcesProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const handleDownload = async (resource: Resource, index: number) => {
    // 외부 링크인 경우 새 탭에서 열기
    if (resource.type === 'link' || !resource.storage_path) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Storage 파일인 경우 signed URL 가져오기
    setDownloadingIndex(index);
    
    try {
      const response = await fetch(
        `/api/resources/download?path=${encodeURIComponent(resource.storage_path)}&lessonId=${lessonId}&filename=${encodeURIComponent(resource.title)}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '다운로드에 실패했습니다.');
      }

      const { url } = await response.json();
      
      // 다운로드 시작
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error: any) {
      alert(error.message || '다운로드에 실패했습니다.');
    } finally {
      setDownloadingIndex(null);
    }
  };

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf':
        return <FaFilePdf />;
      case 'link':
        return <FaExternalLinkAlt />;
      default:
        return <FaFolder />;
    }
  };

  if (resources.length === 0) return null;

  return (
    <div className={styles.resourceList}>
      {resources.map((resource, index) => (
        <button
          key={index}
          onClick={() => handleDownload(resource, index)}
          className={styles.resourceItem}
          disabled={downloadingIndex === index}
        >
          <span className={styles.resourceIcon}>
            {getResourceIcon(resource.type)}
          </span>
          <span className={styles.resourceTitle}>{resource.title}</span>
          <span className={styles.resourceArrow}>
            {downloadingIndex === index ? (
              <FaSpinner className={styles.spinner} />
            ) : resource.type === 'link' ? (
              '→'
            ) : (
              <FaDownload />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

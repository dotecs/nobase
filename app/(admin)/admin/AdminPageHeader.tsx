import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import styles from './admin.module.css';

interface Props {
  title: string;
  description?: string;
  /** 오른쪽 액션 (버튼 등) */
  actions?: React.ReactNode;
  /** 상위 목록으로 돌아가는 링크 */
  back?: { href: string; label: string };
}

/** 관리자 페이지 공통 상단: 뒤로가기 · 제목 · 설명 · 액션 */
export default function AdminPageHeader({ title, description, actions, back }: Props) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {back && (
          <Link href={back.href} className={styles.pageBack}>
            <FaArrowLeft /> {back.label}
          </Link>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDesc}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  );
}

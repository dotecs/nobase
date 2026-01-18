import { ReactNode } from 'react';
import { FaSadTear, FaLink, FaBook, FaCalendarAlt, FaLock, FaClock } from 'react-icons/fa';
import Button from '@/components/Button/Button';
import styles from './ErrorPage.module.css';

const iconMap: Record<string, ReactNode> = {
  'sad': <FaSadTear />,
  'link': <FaLink />,
  'book': <FaBook />,
  'calendar': <FaCalendarAlt />,
  'lock': <FaLock />,
  'clock': <FaClock />,
};

interface ErrorPageProps {
  icon?: string | ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export default function ErrorPage({
  icon = 'sad',
  title,
  description,
  primaryAction,
  secondaryAction,
}: ErrorPageProps) {
  const renderIcon = () => {
    if (typeof icon === 'string') {
      return iconMap[icon] || <FaSadTear />;
    }
    return icon;
  };

  return (
    <div className={styles.errorPage}>
      <div className={styles.icon}>{renderIcon()}</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      
      <div className={styles.actions}>
        {primaryAction && (
          <Button href={primaryAction.href} variant="primary">
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button href={secondaryAction.href} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

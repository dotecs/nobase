import Button from '@/components/Button/Button';
import { FiArrowRight } from 'react-icons/fi';
import { home } from '@/content/home';
import { contact } from '@/content/contact';
import styles from './Home.module.css';

export default function HomeActions({ href = '/courses' }: { href?: string }) {
  return <div className={styles.actions}>
    <Button href={href} size="lg">{home.actions.explore}<FiArrowRight size={24} aria-hidden="true" /></Button>
    <Button href={contact.href} target="_blank" rel="noopener noreferrer" variant="outline" size="lg">{home.actions.consult}</Button>
  </div>;
}

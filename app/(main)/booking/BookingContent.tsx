import Link from 'next/link';
import { bookingContent as content } from '@/content/booking';
import { contact } from '@/content/contact';
import styles from './booking.module.css';
import glass from '@/styles/glass.module.css';
import scene from '@/components/home/Scene.module.css';

export default function BookingContent({ eligible }: { eligible: boolean }) {
 return <div className={scene.backdrop}><main className={styles.main}><h1>{content.title}</h1><div className={`${styles.panel} ${glass.glass}`}>
      {eligible ? <><p className={styles.status}>{content.eligible}</p><p>{content.preparing}</p><p>{content.interim}</p><a className={styles.contactButton} href={contact.href} target="_blank" rel="noopener noreferrer">{contact.floatingLabel}</a></>
        : <><p>{content.unavailable}</p><Link href={content.pricing.href}>{content.pricing.label}</Link></>}
    </div><Link href={content.dashboard.href}>{content.dashboard.label}</Link></main></div>;
}

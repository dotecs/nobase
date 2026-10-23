import Link from 'next/link';
import Image from 'next/image';
import { FiBookOpen, FiRefreshCw, FiEdit3, FiMessageCircle, FiLayers, FiMessageSquare, FiInfo, FiArrowRight } from 'react-icons/fi';
import { home } from '@/content/home';
import styles from './Home.module.css';
import glass from '@/styles/glass.module.css';
const stepIcons = [FiBookOpen, FiRefreshCw, FiEdit3, FiMessageCircle];
const guideIcons = [FiLayers, FiMessageSquare];
export default function HowWeLearn() {
  const c = home.how;
  return <section id="how" className={`${styles.section} ${styles.surface}`}><div className={styles.container}>
    <p className={styles.eyebrow}>{c.eyebrow}</p><h2>{c.title[0]}<br /><span>{c.title[1]}</span></h2><p className={styles.description}>{c.description}</p>
    <ol className={styles.steps}>{c.steps.map((step, i) => { const Icon = stepIcons[i]; return <li className={glass.glassFlat} key={step}><span>{String(i + 1).padStart(2, '0')}</span><Icon size={28} strokeWidth={2} aria-hidden="true" /><h3>{step}</h3></li>; })}</ol>
    <div className={styles.learningGrid}><article className={`${styles.textCard} ${glass.glass}`}><div><h3>{c.card.title}</h3><p>{c.card.description}</p></div><Image src="/programs/n-campus-math.webp" alt="" width={800} height={500} sizes="(max-width: 767px) 100vw, 24vw" /></article>
      <div className={styles.guides}>{c.guides.map((guide, i) => { const Icon = guideIcons[i]; return <Link href="/courses" className={`${styles.guide} ${glass.glass}`} key={guide.title}><span className={styles.guideIcon}><Icon size={32} strokeWidth={2} aria-hidden="true" /></span><div><h3>{guide.title}</h3><p>{guide.description}</p></div><FiArrowRight size={24} aria-hidden="true" /></Link>; })}</div>
    </div><p className={styles.note}><FiInfo size={24} aria-hidden="true" />{c.note}</p>
  </div></section>;
}

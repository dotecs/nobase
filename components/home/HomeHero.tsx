import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight, FiBook } from 'react-icons/fi';
import { home } from '@/content/home';
import { publicAsset } from '@/lib/programs';
import HomeActions from './HomeActions';
import styles from './Home.module.css';

export default function HomeHero() {
  const c = home.hero, image = publicAsset(c.image);
  return <section id="top" className={`${styles.section} ${styles.hero}`}>
    <div className={styles.container}>
      <div className={image ? styles.heroColumns : styles.heroTextOnly}>
        <div><h1>{c.title[0]}<br /><span>{c.title[1]}</span></h1><p className={styles.description}>{c.description[0]}<br />{c.description[1]}</p><HomeActions href="#programs" /></div>
        {image && <Image className={styles.heroImage} src={image} alt="" width={1600} height={1000} priority sizes="(max-width: 767px) 100vw, 50vw" />}
      </div>
      <div className={styles.goals}><h2>{c.goalsTitle}</h2><div className={styles.goalGrid}>{c.goals.map(goal => {
        const icon = publicAsset(goal.image);
        return <Link key={goal.category} href={`/courses?category=${goal.category}`} className={styles.goal}>
          {icon ? <Image src={icon} alt="" width={64} height={64} /> : <FiBook size={24} strokeWidth={2} aria-hidden="true" />}
          <span>{goal.label}</span><FiArrowRight size={24} strokeWidth={2} aria-hidden="true" />
        </Link>;
      })}</div></div>
    </div>
  </section>;
}

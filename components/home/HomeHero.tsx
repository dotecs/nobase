import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { home } from '@/content/home';
import HomeActions from './HomeActions';
import styles from './Home.module.css';
import scene from './Scene.module.css';
import glass from '@/styles/glass.module.css';

export default function HomeHero() {
  const c = home.hero, image = c.image;
  return <section id="top" className={`${styles.section} ${scene.backdrop}`}>
    <div className={styles.container}>
      <div className={image ? styles.heroColumns : styles.heroTextOnly}>
        <div><h1>{c.title[0]}<br /><span>{c.title[1]}</span></h1><p className={styles.description}>{c.description[0]}<br />{c.description[1]}</p><HomeActions href="#programs" /></div>
        {image && <div className={`${styles.heroArt} ${scene.art}`}><Image className={styles.heroImage} src={image} alt="" width={1280} height={800} priority sizes="(max-width: 767px) 100vw, 50vw" /></div>}
      </div>
      <div className={`${styles.goals} ${glass.glass}`}><h2>{c.goalsTitle}</h2><div className={styles.goalGrid}>{c.goals.map(goal => {
        const icon = goal.image;
        return <Link key={goal.category} href={`/courses?category=${goal.category}`} className={`${styles.goal} ${glass.glassFlat}`}>
          {icon && <Image src={icon} alt="" width={96} height={96} sizes="96px" />}
          <span>{goal.label}</span><FiArrowRight size={24} strokeWidth={2} aria-hidden="true" />
        </Link>;
      })}</div></div>
    </div>
  </section>;
}

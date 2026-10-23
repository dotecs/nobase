import Image from 'next/image';
import { home } from '@/content/home';
import HomeActions from './HomeActions';
import styles from './Home.module.css';
export default function CtaBand() {
  const image = home.hero.image;
  return <div className={styles.ctaBand}><div className={`${styles.container} ${styles.ctaInner}`}><div><h2>{home.about.cta[0]}<br /><span>{home.about.cta[1]}</span></h2><HomeActions /></div>
    {image && <Image src={image} alt="" aria-hidden="true" width={480} height={300} className={styles.ctaImage} sizes="480px" />}
  </div></div>;
}

import Image from 'next/image';
import { home } from '@/content/home';
import HomeActions from './HomeActions';
import styles from './Home.module.css';
import scene from './Scene.module.css';
export default function CtaBand() {
  const image = home.hero.image;
  return <div className={`${styles.ctaBand} ${scene.backdrop}`}><div className={`${styles.container} ${styles.ctaInner}`}><div><h2>{home.about.cta[0]}<br /><span>{home.about.cta[1]}</span></h2><HomeActions /></div>
    {image && <div className={`${styles.ctaArt} ${scene.art}`}><Image src={image} alt="" aria-hidden="true" width={1280} height={800} sizes="(max-width: 767px) 0px, 44vw" /></div>}
  </div></div>;
}

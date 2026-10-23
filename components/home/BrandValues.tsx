import { FiUser, FiUserCheck, FiUsers } from 'react-icons/fi';
import { home } from '@/content/home';
import CtaBand from './CtaBand';
import styles from './Home.module.css';
const icons = [FiUser, FiUserCheck, FiUsers];
export default function BrandValues() {
  const c = home.about;
  return <section id="about" className={styles.about}>
    <div className={`${styles.container} ${styles.values}`}><h2>{c.title[0]} <span>{c.title[1]}</span></h2><div className={styles.valueGrid}>
      {c.values.map((value, i) => { const Icon = icons[i]; return <article className={styles.value} key={value.label}><div className={styles.valueIcon}><span>{String(i + 1).padStart(2, '0')}</span><Icon size={44} strokeWidth={2} aria-hidden="true" /></div><div><p>{value.label}</p><h3>{value.lines[0]}<br />{value.lines[1]}</h3></div></article>; })}
    </div></div><CtaBand />
  </section>;
}

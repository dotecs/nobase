import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiBookOpen, FiCalendar, FiMonitor, FiHelpCircle, FiRefreshCw, FiCheckSquare, FiVideo, FiMessageCircle, FiPlay, FiCheckCircle } from 'react-icons/fi';
import type { trainingLanding } from '@/content/courses/n-training';
import type { Cohort, Course } from '@/lib/database.types';
import { getPricingContent } from '@/content/pricing';
import { contact } from '@/content/contact';
import PricingPlans from '@/components/pricing/PricingPlans';
import LandingActions from './LandingActions';
import styles from './TrainingLanding.module.css';

type Content = typeof trainingLanding;
type Shared = { content: Content };
function Heading({ lines, children }: { lines: string[]; children?: ReactNode }) {
  return <div className={styles.heading}><h2>{lines.map((line, i) => <span key={line} className={i ? styles.blue : undefined}>{line}</span>)}</h2>{children}</div>;
}
function Actions({ content, freeHref }: Shared & { freeHref: string | null }) {
  return <div className={styles.actions}><Link className={styles.primary} href={content.links.pricing}>{content.cta.primary}<span aria-hidden="true">›</span></Link>
    {freeHref && <Link className={styles.secondary} href={freeHref}>{content.cta.free}<span aria-hidden="true">›</span></Link>}</div>;
}
function Hero({ content, freeHref }: Shared & { freeHref: string | null }) {
  const icons = [FiBookOpen, FiCalendar, FiMonitor];
  return <section id="top" className={`${styles.section} ${styles.hero}`}>
    <div className={styles.container}><div className={styles.heroRow}>
      <div><p className={styles.eyebrow}>{content.hero.eyebrow}</p><h1>{content.hero.title.map((line, i) => <span key={line} className={i ? styles.blue : undefined}>{line}</span>)}</h1>
        <p className={styles.copy}>{content.hero.description.map(line => <span key={line}>{line}</span>)}</p><Actions content={content} freeHref={freeHref} /></div>
      <Image className={styles.heroBrand} src={content.assets.brand} alt="" width={1200} height={600} priority sizes="(max-width: 700px) 90vw, 45vw" />
    </div><div className={styles.three}>{content.hero.evidence.map((item, i) => { const Icon = icons[i]; return <div className={styles.evidence} key={item.title}><Icon aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div></div>; })}</div></div>
  </section>;
}
function Overview({ content }: Shared) {
  return <section id="overview" className={styles.section}><div className={styles.container}>
    <Heading lines={content.overview.title} /><div className={styles.chips}>{content.overview.questions.map(q => <p key={q}><FiHelpCircle aria-hidden="true" />{q}</p>)}</div>
    <h3 className={styles.subheading}>{content.overview.subtitle}</h3><div className={styles.four}>{content.overview.subjects.map(item => <article className={styles.card} key={item.title}>
      <Image className={styles.subjectImage} src={item.asset} alt={item.alt} width={480} height={480} loading="lazy" sizes="(max-width: 700px) calc(100vw - 88px), (max-width: 1199px) 40vw, 224px" /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div><p className={styles.strip}>{content.overview.strip}</p>
  </div></section>;
}
function Curriculum({ content }: Shared) {
  const c = content.curriculum; const icons = [FiBookOpen, FiRefreshCw, FiCheckSquare];
  return <section id="curriculum" className={styles.section}><div className={styles.container}><div className={styles.curriculumHeader}><div><p className={styles.eyebrow}>{c.eyebrow}</p><Heading lines={c.title}><p>{c.description}</p></Heading></div>
    <Image className={styles.curriculumImage} src={c.asset} alt={c.alt} width={900} height={600} loading="lazy" sizes="(max-width: 1199px) 1px, 300px" /></div>
    <div className={styles.timeline}><div className={styles.segments}>{c.timeline.map(item => <div key={item.title}><strong>{item.title}</strong><span>{item.duration}</span></div>)}</div><strong className={styles.total}>{c.total}</strong></div>
    <div className={`${styles.three} ${styles.steps}`}>{c.steps.map((item, i) => { const Icon = icons[i]; return <article className={styles.card} key={item.title}><Icon aria-hidden="true" /><p className={styles.eyebrow}>{String(i + 1).padStart(2, '0')}</p><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div><p className={styles.note}>{c.note}</p>
  </div></section>;
}
function Materials({ content }: Shared) {
  return <section id="materials" className={styles.section}><div className={styles.container}><Heading lines={content.materials.title}><p>{content.materials.description}</p></Heading>
    <div className={styles.two}>{content.materials.panels.map(panel => <article className={styles.card} key={panel.asset}><p className={styles.eyebrow}>{panel.label}</p><h3>{panel.title}</h3><p>{panel.text}</p>
      <Image className={styles.illustration} src={panel.asset} alt={panel.alt} width={800} height={533} loading="lazy" sizes="(max-width: 700px) calc(100vw - 88px), (max-width: 1199px) 42vw, 530px" />{panel.caption && <p className={styles.note}>{panel.caption}</p>}<ol className={styles.process}>{panel.items.map(item => <li key={item}>{item}</li>)}</ol>
    </article>)}</div><p className={styles.strip}>{content.materials.note}</p>
  </div></section>;
}
function Support({ content }: Shared) {
  const s = content.support; const icons = [FiCalendar, FiVideo, FiMessageCircle];
  return <section id="support" className={styles.section}><div className={styles.container}><Heading lines={s.title}><p>{s.description.map(line => <span key={line}>{line}</span>)}</p></Heading>
    <div className={styles.two}><ol className={styles.supportSteps}>{s.steps.map((step, i) => { const Icon = icons[i]; return <li className={styles.evidence} key={step.title}><Icon aria-hidden="true" /><div><h3>{String(i + 1).padStart(2, '0')} {step.title}</h3><p>{step.text}</p></div></li>; })}</ol><div><Image className={styles.illustration} src={s.asset} alt={s.alt} width={1000} height={667} loading="lazy" sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1199px) 46vw, 588px" /><p className={styles.note}>{s.caption}</p></div></div>
    <p className={styles.note}>{s.memo}</p><div className={styles.two}>{s.plans.map(plan => <article className={styles.card} key={plan.title}><Image src={plan.icon} width={72} height={72} alt="" /><h3>{plan.title}</h3><p><strong>{plan.text}</strong></p><ul className={styles.checks}>{plan.features.map(text => <li key={text}><FiCheckCircle aria-hidden="true" />{text}</li>)}</ul></article>)}</div>
    <div className={styles.actions}><Link href={content.links.compare} className={styles.secondary}>{content.cta.compare}<span aria-hidden="true">›</span></Link></div><p className={styles.note}>{s.note}</p>
  </div></section>;
}
function Instructor({ content }: Shared) {
  const s = content.instructor;
  return <section id="instructor" className={styles.section}><div className={styles.container}><Heading lines={s.title} />
    <article className={`${styles.card} ${styles.instructor}`}><div className={styles.portrait}><Image src={s.asset} alt={s.alt} width={480} height={480} loading="lazy" sizes="(max-width: 700px) 160px, 240px" /></div><div><h3>{s.name}</h3><p>{s.education}</p><p>{s.description}</p></div></article>
    <h3 className={styles.subheading}>{s.interviewsTitle}</h3><div className={styles.three}>{s.interviews.map(item => <a className={styles.card} key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
      {/* YouTube thumbnails use their public source without adding a remote image configuration. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.thumbnail} src={item.image} alt={item.alt} loading="lazy" width={480} height={360} /><h3 className={styles.interviewTitle}><FiPlay aria-hidden="true" />{item.title}</h3>
    </a>)}</div><p className={styles.note}>{s.note}</p>
  </div></section>;
}
function Faq({ content, freeHref }: Shared & { freeHref: string | null }) {
  return <section id="faq" className={styles.section}><div className={styles.container}><Heading lines={content.faq.title} />
    <div className={styles.faq}>{content.faq.items.map((item, i) => <details name="training-faq" key={item.q} open={i === 0}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
    <div className={styles.closing}><div><Heading lines={content.faq.closing}><p>{content.faq.description}</p></Heading><Actions content={content} freeHref={freeHref} /></div><Image src={content.assets.brand} alt="" width={720} height={360} sizes="(max-width: 700px) 50vw, 30vw" /></div>
  </div></section>;
}
export default function TrainingLanding({ content, course, cohorts, enrolledIds, isLoggedIn, freeLessonId }: Shared & {
  course: Course; cohorts: Cohort[]; enrolledIds: string[]; isLoggedIn: boolean; freeLessonId: string | null;
}) {
  const freeHref = freeLessonId ? content.links.freeLesson(freeLessonId) : null;
  return <main className={styles.page} style={{ '--landing-background': `url("${content.assets.background}")` } as CSSProperties}>
    <Hero content={content} freeHref={freeHref} /><Overview content={content} /><Curriculum content={content} /><Materials content={content} /><Support content={content} /><Instructor content={content} />
    <section id="plans" className={styles.section}><div className={styles.container}><Heading lines={content.plans.title}><p>{content.plans.description}</p></Heading><PricingPlans course={course} cohorts={cohorts} enrolledIds={enrolledIds} content={getPricingContent(course.slug)} isLoggedIn={isLoggedIn} /></div></section>
    <Faq content={content} freeHref={freeHref} />
    <LandingActions primary={{ href: content.links.pricing, label: content.cta.primary }} talk={{ href: contact.href, label: contact.floatingLabel }} />
  </main>;
}

import Link from 'next/link';
import Image from 'next/image';
import { getUser } from '@/lib/supabase-server';
import { Button, ThemeToggle, Footer } from '@/components';
import { FaLifeRing, FaHandshake, FaRocket } from 'react-icons/fa';
import styles from './home.module.css';

export default async function HomePage() {
  const user = await getUser();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/logo_kr_b.png"
              alt="노베이스구조대"
              width={180}
              height={36}
              className={styles.logoImage}
              priority
            />
            <Image
              src="/logo_kr_w.png"
              alt="노베이스구조대"
              width={180}
              height={36}
              className={styles.logoImageDark}
              priority
            />
          </Link>
          <nav className={styles.nav}>
            <ThemeToggle />
            {user ? (
              <Button href="/dashboard" size="sm">
                대시보드
              </Button>
            ) : (
              <div className={styles.authButtons}>
                <Button href="/login" variant="ghost" size="sm">
                  로그인
                </Button>
                <Button href="/signup" size="sm">
                  시작하기
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.heroSubtitle}>기초가 부족해서 막막할 때, 당신 곁에</p>
          <h1 className={styles.heroTitle}>
            나를 믿는 것에서<br />
            모든 <span className={styles.highlight}>성장</span>이 시작됩니다
          </h1>
          <p className={styles.heroDescription}>
            노베이스 구조대는 기초가 부족해서 공부가 막막한 사람들을 돕는 커뮤니티입니다.<br />
            우리는 &apos;나 자신을 믿기&apos;의 가치를 믿습니다.
          </p>
          <div className={styles.heroActions}>
            <Button href={user ? "/dashboard" : "/signup"} size="lg">
              {user ? "대시보드로 이동" : "구조대에 합류하기"}
            </Button>
          </div>
        </section>

        <section className={styles.values}>
          <h2 className={styles.sectionTitle}>세 가지 믿음</h2>
          <p className={styles.sectionSubtitle}>
            우리의 세 가지 믿음으로 노베이스는 믿음으로 가득한 삼각형을 얻었습니다.
          </p>
          <div className={styles.valueCards}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8L42 40H6L24 8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Trust Myself</h3>
              <p className={styles.valueDescription}>
                나 자신을 믿습니다.<br />
                스스로의 가능성을 인정하는 것이 성장의 첫걸음입니다.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8L42 40H6L24 8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Trust Yourself</h3>
              <p className={styles.valueDescription}>
                당신을 믿습니다.<br />
                기초가 없어도, 누구나 배울 수 있는 잠재력이 있습니다.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8L42 40H6L24 8Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Trust Ourselves</h3>
              <p className={styles.valueDescription}>
                함께를 믿습니다.<br />
                믿음이 쌓이면 강력한 신뢰와 성공 에너지가 됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>노베이스 구조대와 함께</h2>
          <p className={styles.sectionSubtitle}>
            내면의 잠재력을 이끌어 내어 큰 성과를 이뤄냅니다.
          </p>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}><FaLifeRing /></div>
              <h3 className={styles.featureTitle}>기초부터 구조</h3>
              <p className={styles.featureDescription}>
                막막한 기초, 노베이스 구조대가 함께 잡아드립니다
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}><FaHandshake /></div>
              <h3 className={styles.featureTitle}>함께하는 성장</h3>
              <p className={styles.featureDescription}>
                혼자가 아닌 커뮤니티와 함께 성장하는 경험
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}><FaRocket /></div>
              <h3 className={styles.featureTitle}>잠재력 발견</h3>
              <p className={styles.featureDescription}>
                당신 안에 있는 가능성을 발견하고 이끌어냅니다
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

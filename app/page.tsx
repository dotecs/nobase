import { Suspense } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { getUser, getProfile } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';
import { getPrograms } from '@/lib/programs';
import { home } from '@/content/home';
import HomeHero from '@/components/home/HomeHero';
import HowWeLearn from '@/components/home/HowWeLearn';
import BrandValues from '@/components/home/BrandValues';
import HomeMotion from '@/components/home/HomeMotion';
import ProgramExplorer from '@/components/ProgramExplorer/ProgramExplorer';
import styles from '@/components/home/Home.module.css';

export default async function HomePage() {
  const [user, profileData, programs] = await Promise.all([getUser(), getProfile(), getPrograms()]);
  const profile = profileData as Profile | null;
  return <>
    <Header isLoggedIn={!!user} userName={profile?.name || user?.email} userRole={profile?.role} />
    <main>
      <HomeMotion />
      <HomeHero />
      <section id="programs" className={styles.section}><div className={styles.container}>
        <h2>{home.programs.title}</h2><p className={styles.description}>{home.programs.subtitle}</p>
        <div className={styles.programExplorer}><Suspense><ProgramExplorer programs={programs} /></Suspense></div>
      </div></section>
      <HowWeLearn />
      <BrandValues />
    </main>
    <Footer />
  </>;
}

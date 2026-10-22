import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components';
import { bookingContent as content } from '@/content/booking';
import { contact } from '@/content/contact';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';
import { isBookingEligible } from '@/lib/pricing';
import styles from './booking.module.css';

export const metadata: Metadata = { title: content.title, robots: { index: false, follow: false } };

export default async function BookingPage() {
  const user = await getUser();
  if (!user) redirect(content.loginPath);
  const supabase = await createServerSupabaseClient();
  const [result, profileData] = await Promise.all([
    supabase.from('enrollments').select('cohorts(title)').eq('user_id', user.id).eq('status', 'active'),
    getProfile(),
  ]);
  if (result.error) throw result.error;
  const rows = (result.data || []) as { cohorts: { title: string } | null }[];
  const eligible = isBookingEligible(rows.flatMap(row => row.cohorts ? [row.cohorts] : []));
  const profile = profileData as Profile | null;
  return <>
    <Header isLoggedIn userName={profile?.name || user.email} userRole={profile?.role} />
    <main className={styles.main}><h1>{content.title}</h1><div className={styles.panel}>
      {eligible ? <><p className={styles.status}>{content.eligible}</p><p>{content.preparing}</p><p>{content.interim}</p><a className={styles.contactButton} href={contact.href} target="_blank" rel="noopener noreferrer">{contact.floatingLabel}</a></>
        : <><p>{content.unavailable}</p><Link href={content.pricing.href}>{content.pricing.label}</Link></>}
    </div><Link href={content.dashboard.href}>{content.dashboard.label}</Link></main>
  </>;
}

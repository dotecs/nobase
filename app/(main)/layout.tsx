import { Footer } from '@/components';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
      <Footer />
    </div>
  );
}

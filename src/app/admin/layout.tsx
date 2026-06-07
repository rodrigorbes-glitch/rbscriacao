import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="admin-layout">
        <Sidebar />
        <div className="admin-main">
          <Header />
          <main className="admin-content">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}

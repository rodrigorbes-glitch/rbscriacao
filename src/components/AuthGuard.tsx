'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Coloque aqui os e-mails que terão acesso ao painel admin
const ADMIN_EMAILS = [
  'rodrigorbs@gmail.com',
  'dra.rachelbeatriz@gmail.com'
];

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else if (currentUser.email && !ADMIN_EMAILS.includes(currentUser.email)) {
        // Se estiver logado mas não for admin, bloqueia o acesso
        alert('Acesso negado: Este e-mail não tem privilégios de administrador.');
        auth.signOut();
        router.replace('/');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

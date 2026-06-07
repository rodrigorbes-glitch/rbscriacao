'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import Button from '@/components/ui/Button';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <header className="admin-header">
      <div>
        {/* Placeholder para título da página dinâmica no futuro */}
      </div>
      
      <div className="header-user">
        <span className="user-email">
          {user?.email || 'Carregando...'}
        </span>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          style={{ padding: '0.25rem 1rem', fontSize: '0.875rem' }}
        >
          Sair
        </Button>
      </div>
    </header>
  );
}

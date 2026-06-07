'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { clientesAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';

export default function CadastroPage() {
  const router = useRouter();
  const { user, isOffline } = useAuth();
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [isDistribuidor, setIsDistribuidor] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace('/minha-conta');
    return null;
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setError('Sem conexão. Tente novamente quando estiver online.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Cria usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Salva os dados complementares no Firestore
      await clientesAPI.create({
        user_id: userCredential.user.uid,
        nome,
        email,
        telefone: whatsapp,
        cpf_cnpj: cpfCnpj,
        tipo: isDistribuidor ? 'b2b_pendente' : 'b2c'
      });

      // 3. Sucesso! Vai para o dashboard
      router.push('/minha-conta');
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="public-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="public-header" style={{ justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '2rem', cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-secondary)' }} onClick={() => router.push('/minha-conta/login')}>
          &larr; Voltar
        </div>
        <div className="public-logo">RBS Criação</div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '500px', width: '100%' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>Criar Conta</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Preencha seus dados para começar.</p>

          {error && (
            <div style={{ backgroundColor: 'var(--color-danger)', color: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Input label="Nome Completo" placeholder="João da Silva" value={nome} onChange={e => setNome(e.target.value)} required />
            <Input type="email" label="E-mail" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="WhatsApp" placeholder="(11) 99999-9999" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
              <Input label="CPF ou CNPJ" placeholder="000.000.000-00" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} required />
            </div>
            <Input type="password" label="Criar Senha" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={isDistribuidor} 
                onChange={(e) => setIsDistribuidor(e.target.checked)} 
                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Quero ser Distribuidor Parceiro</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Sua conta será avaliada pela nossa equipe.</div>
              </div>
            </label>

            <Button type="submit" isLoading={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', marginTop: '1rem' }}>
              Criar Conta e Entrar
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Já tem conta? <Link href="/minha-conta/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}>Fazer Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

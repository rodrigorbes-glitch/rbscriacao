'use client';

import { useState } from 'react';
import { db } from '@/services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function CleanBase64Page() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const cleanBase64 = async () => {
    setLoading(true);
    setLog(['Buscando produtos...']);
    try {
      const produtosCol = collection(db, 'produtos');
      const snapshot = await getDocs(produtosCol);
      
      let count = 0;
      for (const document of snapshot.docs) {
        const data = document.data();
        let needsUpdate = false;
        let updates: any = {};

        if (data.foto_url && data.foto_url.startsWith('data:image/')) {
          setLog(prev => [...prev, `Produto ${data.nome} tem imagem em Base64 na foto principal.`]);
          updates.foto_url = '';
          needsUpdate = true;
        }

        if (data.fotos_adicionais && Array.isArray(data.fotos_adicionais)) {
          const newFotosAdicionais = data.fotos_adicionais.map(url => {
            if (url && url.startsWith('data:image/')) {
              setLog(prev => [...prev, `Produto ${data.nome} tem imagem em Base64 nas fotos adicionais.`]);
              needsUpdate = true;
              return '';
            }
            return url;
          });
          if (needsUpdate) updates.fotos_adicionais = newFotosAdicionais;
        }

        if (needsUpdate) {
          await updateDoc(doc(db, 'produtos', document.id), updates);
          setLog(prev => [...prev, `Produto ${data.nome} atualizado! Limpo o Base64.`]);
          count++;
        }
      }

      setLog(prev => [...prev, `Finalizado! ${count} produtos foram limpos.`]);
    } catch (error: any) {
      setLog(prev => [...prev, `Erro: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Limpador de Base64</h1>
      <p>Clique no botão abaixo para remover todas as imagens em Base64 do banco de dados.</p>
      <button 
        onClick={cleanBase64} 
        disabled={loading}
        style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {loading ? 'Limpando...' : 'Limpar Imagens Base64'}
      </button>
      
      <div style={{ backgroundColor: '#1e1e1e', color: '#00ff00', padding: '1rem', borderRadius: '8px', minHeight: '300px', fontFamily: 'monospace' }}>
        {log.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );
}

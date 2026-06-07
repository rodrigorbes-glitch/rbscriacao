import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVariables = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVariables[match[1]] = value;
  }
});

const firebaseConfig = {
  apiKey: envVariables['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: envVariables['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: envVariables['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: envVariables['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: envVariables['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: envVariables['NEXT_PUBLIC_FIREBASE_APP_ID'],
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanBase64() {
  console.log('Buscando produtos...');
  const produtosCol = collection(db, 'produtos');
  const snapshot = await getDocs(produtosCol);
  
  let count = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    let needsUpdate = false;
    let updates = {};

    if (data.foto_url && data.foto_url.startsWith('data:image/')) {
      console.log(`Produto ${data.nome} tem imagem em Base64 na foto principal.`);
      updates.foto_url = '';
      needsUpdate = true;
    }

    if (data.fotos_adicionais && Array.isArray(data.fotos_adicionais)) {
      const newFotosAdicionais = data.fotos_adicionais.map(url => {
        if (url && url.startsWith('data:image/')) {
          console.log(`Produto ${data.nome} tem imagem em Base64 nas fotos adicionais.`);
          needsUpdate = true;
          return '';
        }
        return url;
      });
      if (needsUpdate) updates.fotos_adicionais = newFotosAdicionais;
    }

    if (needsUpdate) {
      await updateDoc(doc(db, 'produtos', document.id), updates);
      console.log(`Produto ${data.nome} atualizado! Limpo o Base64.`);
      count++;
    }
  }

  console.log(`\nFinalizado! ${count} produtos foram limpos.`);
  process.exit(0);
}

cleanBase64().catch(console.error);

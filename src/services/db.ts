import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Cria um novo documento em uma coleção.
 */
export async function createDocument<T extends DocumentData>(collName: string, data: T): Promise<string> {
  const collRef = collection(db, collName);
  const docRef = await addDoc(collRef, {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return docRef.id;
}

/**
 * Lê todos os documentos de uma coleção, opcionalmente filtrados.
 */
export async function getDocuments<T>(collName: string, constraints: QueryConstraint[] = []): Promise<(T & { id: string })[]> {
  const collRef = collection(db, collName);
  const q = query(collRef, ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (T & { id: string })[];
}

/**
 * Lê um único documento pelo ID.
 */
export async function getDocumentById<T>(collName: string, id: string): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collName, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
  }
  return null;
}

/**
 * Atualiza um documento existente.
 */
export async function updateDocument<T extends DocumentData>(collName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now()
  });
}

/**
 * Deleta um documento pelo ID.
 */
export async function deleteDocument(collName: string, id: string): Promise<void> {
  const docRef = doc(db, collName, id);
  await deleteDoc(docRef);
}

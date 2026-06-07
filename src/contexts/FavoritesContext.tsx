'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Produto } from '@/types/models';

interface FavoritesContextType {
  favorites: Produto[];
  toggleFavorite: (produto: Produto) => void;
  isFavorite: (produtoId: string) => boolean;
  totalFavorites: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Produto[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    setIsMounted(true);
    const savedFavorites = localStorage.getItem('@loja-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('@loja-favorites', JSON.stringify(favorites));
    }
  }, [favorites, isMounted]);

  const toggleFavorite = (produto: Produto) => {
    setFavorites(current => {
      const exists = current.some(p => p.id === produto.id);
      if (exists) {
        return current.filter(p => p.id !== produto.id); // Remove
      } else {
        return [...current, produto]; // Adiciona
      }
    });
  };

  const isFavorite = (produtoId: string) => {
    return favorites.some(p => p.id === produtoId);
  };

  const totalFavorites = favorites.length;

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, totalFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

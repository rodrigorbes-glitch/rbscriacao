'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Produto } from '@/types/models';

export interface CartItem extends Produto {
  quantidade: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (produto: Produto, quantidade?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQuantity: (produtoId: string, quantidade: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isMounted: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const savedCart = localStorage.getItem('@loja-cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('@loja-cart', JSON.stringify(items));
    }
  }, [items, isMounted]);

  const addItem = (produto: Produto, quantidade: number = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === produto.id);
      
      if (existingItem) {
        // Prevent exceeding central stock
        const novaQtd = Math.min(existingItem.quantidade + quantidade, produto.estoque_central);
        return currentItems.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: novaQtd }
            : item
        );
      }

      return [...currentItems, { ...produto, quantidade: Math.min(quantidade, produto.estoque_central) }];
    });
  };

  const removeItem = (produtoId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== produtoId));
  };

  const updateQuantity = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeItem(produtoId);
      return;
    }

    setItems(currentItems => 
      currentItems.map(item => {
        if (item.id === produtoId) {
           return { ...item, quantidade: Math.min(quantidade, item.estoque_central) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantidade, 0);
  const subtotal = items.reduce((acc, item) => acc + (item.preco_venda_sugerido * item.quantidade), 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      isCartOpen,
      setIsCartOpen,
      isMounted
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

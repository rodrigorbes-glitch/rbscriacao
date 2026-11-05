'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  CheckCircle2,
  ImageOff,
  UploadCloud,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Star,
  Search,
  ImageIcon,
  ArrowUp,
  DollarSign,
  Package,
  Film,
} from 'lucide-react';
import { formatBRLFromCents } from '@/lib/format';

export interface ProductItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category_id?: string;
  material: string;
  finish: string;
  availability_type: string;
  lead_time_days: number;
  dimensions_mm?: string;
  short_description?: string;
  description?: string;
  filament_grams_per_unit: number;
  support_purge_grams_per_unit: number;
  print_time_minutes: number;
  price_cents: number;
  cost_cents: number;
  stock_qty: number;
  images_json: string;
  featured: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
}

interface Props {
  initialProducts?: ProductItem[];
  categories?: CategoryItem[];
}

export function AdminProductFormClient({ initialProducts = [], categories = [] }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('cat-decor');
  const [material, setMaterial] = useState('PLA');
  const [finish, setFinish] = useState('Fosco Camadas Suaves');
  const [dimensionsMm, setDimensionsMm] = useState('120 × 120 × 180 mm');
  const [shortDescription, setShortDescription] = useState('');
  const [priceBrl, setPriceBrl] = useState('119.90');
  const [costBrl, setCostBrl] = useState('34.50');
  const [filamentGrams, setFilamentGrams] = useState('185');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [stockQty, setStockQty] = useState('10');
  const [featured, setFeatured] = useState(false);

  // Image management
  const [images, setImages] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Feedback and UI state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Table filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'with_photo' | 'pending_photo' | 'featured'>('all');

  // Margin calculation helpers
  const numPrice = Number(priceBrl) || 0;
  const numCost = Number(costBrl) || 0;
  const grossProfit = numPrice - numCost;
  const marginPct = numPrice > 0 ? Math.round((grossProfit / numPrice) * 100) : 0;

  // Reset form to fresh state
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setCategoryId(categories[0]?.id || 'cat-decor');
    setMaterial('PLA');
    setFinish('Fosco Camadas Suaves');
    setDimensionsMm('120 × 120 × 180 mm');
    setShortDescription('');
    setPriceBrl('119.90');
    setCostBrl('34.50');
    setFilamentGrams('185');
    setLeadTimeDays('2');
    setStockQty('10');
    setFeatured(false);
    setImages([]);
    setManualImageUrl('');
    setFeedback(null);
  };

  // Populate form with existing product for editing
  const handleEditClick = (p: ProductItem) => {
    setEditingId(p.id);
    setName(p.name || '');
    setSku(p.sku || '');
    setCategoryId(p.category_id || 'cat-decor');
    setMaterial(p.material || 'PLA');
    setFinish(p.finish || 'Fosco Camadas Suaves');
    setDimensionsMm(p.dimensions_mm || '120 × 120 × 180 mm');
    setShortDescription(p.short_description || '');
    setPriceBrl((p.price_cents / 100).toFixed(2));
    setCostBrl((p.cost_cents / 100).toFixed(2));
    setFilamentGrams(String(p.filament_grams_per_unit || 185));
    setLeadTimeDays(String(p.lead_time_days || 2));
    setStockQty(String(p.stock_qty ?? 0));
    setFeatured(Boolean(p.featured));

    try {
      const parsed = JSON.parse(p.images_json || '[]');
      setImages(Array.isArray(parsed) ? parsed : []);
    } catch {
      setImages([]);
    }

    setFeedback(null);

    // Scroll smoothly to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Multi-file and video/GIF upload handler
  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro no envio dos arquivos.');
      }

      const newUrls: string[] = Array.isArray(data.urls)
        ? data.urls
        : data.url
        ? [data.url]
        : [];

      setImages((prev) => [...prev, ...newUrls]);
      setFeedback({
        type: 'success',
        message: `${newUrls.length} ${
          newUrls.length === 1 ? 'mídia adicionada' : 'mídias adicionadas'
        } à galeria com sucesso!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao fazer upload da mídia.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    uploadFiles(Array.from(fileList));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  // Manual URL Add
  const handleAddManualImage = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setManualImageUrl('');
  };

  // Remove Image from list
  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Make an image the primary cover (move to index 0)
  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  };

  // Submit Handler (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      action: editingId ? 'update_product' : 'create_product',
      productId: editingId,
      name,
      sku: sku.trim() || undefined,
      categoryId,
      material,
      finish,
      dimensionsMm,
      shortDescription,
      description: shortDescription,
      priceBrl: Number(priceBrl),
      costBrl: Number(costBrl),
      filamentGrams: Number(filamentGrams),
      leadTimeDays: Number(leadTimeDays),
      stockQty: Number(stockQty),
      featured,
      images,
    };

    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar produto.');
      }

      setFeedback({
        type: 'success',
        message: editingId
          ? 'Produto e valores atualizados com sucesso!'
          : 'Novo produto cadastrado e integrado ao catálogo da loja!',
      });

      resetForm();
      router.refresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao processar produto.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o produto "${productName}" do catálogo?`)) {
      return;
    }

    setDeletingId(productId);
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_product',
          productId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir produto.');
      }

      setFeedback({ type: 'success', message: `Produto "${productName}" excluído com sucesso.` });
      if (editingId === productId) resetForm();
      router.refresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao excluir produto.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered products list
  const filteredProducts = initialProducts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.material.toLowerCase().includes(q);

    let parsedImgs: string[] = [];
    try {
      parsedImgs = JSON.parse(p.images_json || '[]');
    } catch {
      parsedImgs = [];
    }
    const hasPhoto = Array.isArray(parsedImgs) && parsedImgs.length > 0;

    if (!matchesSearch) return false;
    if (filterMode === 'with_photo') return hasPhoto;
    if (filterMode === 'pending_photo') return !hasPhoto;
    if (filterMode === 'featured') return Boolean(p.featured);
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Product Form Card */}
      <div
        ref={formRef}
        className="rounded-3xl border border-[#E6E2DA] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#563487] text-white">
              {editingId ? <Edit2 className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#24232A]">
                {editingId ? 'Editar Produto e Imagens' : 'Cadastrar Novo Produto no Catálogo'}
              </h2>
              <p className="text-xs text-[#5A5863]">
                {editingId
                  ? 'Modifique preços, custos, fotos e especificações da peça 3D selecionada.'
                  : 'Preencha os dados técnicos, valores e adicione fotos reais para publicar na loja.'}
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-semibold text-[#5A5863] hover:border-[#563487] hover:text-[#563487]"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar Edição / Novo Produto
            </button>
          )}
        </div>

        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border border-red-300 bg-red-50 text-red-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#24232A]">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Luminária Lua Cheia Litofania 3D"
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#24232A]">
                SKU (Código Interno)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex: RBS-LUM-001 (auto se vazio)"
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing, Cost & Real-Time Margin */}
          <div className="rounded-2xl border border-[#E6E2DA] bg-[#FBF9F5] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#563487] uppercase tracking-wider mb-3">
              <DollarSign className="h-4 w-4" />
              Precificação e Margem Unitária em Tempo Real
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-[#24232A]">
                  Preço de Venda (R$) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-[#5A5863]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceBrl}
                    onChange={(e) => setPriceBrl(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-white pl-9 pr-3 py-2 text-xs font-semibold text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24232A]">
                  Custo Direto de Produção (R$) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-[#5A5863]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costBrl}
                    onChange={(e) => setCostBrl(e.target.value)}
                    className="w-full rounded-xl border border-[#D5CFC4] bg-white pl-9 pr-3 py-2 text-xs font-semibold text-[#24232A] focus:border-[#563487] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Gross Profit Card */}
              <div className="rounded-xl border border-[#E6E2DA] bg-white p-3">
                <span className="block text-[11px] font-medium text-[#5A5863]">
                  Lucro Bruto Unitário
                </span>
                <strong
                  className={`mt-0.5 block text-sm font-bold ${
                    grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  R$ {grossProfit.toFixed(2)}
                </strong>
                <span className="text-[10px] text-[#5A5863]">Venda menos custo direto</span>
              </div>

              {/* Dynamic Gross Margin Card */}
              <div
                className={`rounded-xl border p-3 ${
                  marginPct >= 50
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : marginPct >= 25
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-red-300 bg-red-50 text-red-950'
                }`}
              >
                <span className="block text-[11px] font-medium opacity-80">
                  Margem Bruta Calculada
                </span>
                <strong className="mt-0.5 block text-sm font-bold">
                  {marginPct}%
                </strong>
                <span className="text-[10px] opacity-80">
                  {marginPct >= 50 ? 'Margem saudável' : marginPct >= 25 ? 'Margem moderada' : 'Margem reduzida'}
                </span>
              </div>
            </div>
          </div>

          {/* Photo, GIF and Video Gallery Management */}
          <div className="rounded-2xl border border-[#E6E2DA] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#563487] uppercase tracking-wider">
                <ImageIcon className="h-4 w-4" />
                <span>Mídias, Fotos, GIFs & Vídeos Curtos ({images.length} {images.length === 1 ? 'item' : 'itens'})</span>
              </div>
              <span className="text-[11px] text-[#5A5863]">
                A primeira mídia da lista é automaticamente a <strong>Capa Principal</strong> na vitrine.
              </span>
            </div>

            {/* Drag & Drop Upload Zone + Multi-file selection */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
                isDragging
                  ? 'border-[#563487] bg-[#F3EFFA] scale-[1.01]'
                  : 'border-[#D5CFC4] bg-[#FCFBF8] hover:border-[#563487]'
              }`}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#563487]/10 text-[#563487]">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#24232A]">
                Arraste e solte fotos, GIFs ou vídeos curtos aqui, ou clique abaixo
              </p>
              <p className="mt-0.5 text-[11px] text-[#5A5863]">
                <strong>Seleção múltipla ativada:</strong> você pode selecionar vários arquivos de uma vez segurando <kbd className="rounded bg-white px-1 py-0.5 border border-[#D5CFC4] font-mono text-[10px]">Ctrl</kbd> ou <kbd className="rounded bg-white px-1 py-0.5 border border-[#D5CFC4] font-mono text-[10px]">Shift</kbd>.
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[#563487] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#462970] transition">
                  <PlusCircle className="h-4 w-4" />
                  <span>Escolher Arquivos do Computador</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                {isUploading && (
                  <span className="text-xs font-semibold text-[#563487] animate-pulse">
                    Enviando mídias para o servidor...
                  </span>
                )}
              </div>
              <p className="mt-2 text-[10px] text-[#6E6B78]">
                Formatos aceitos: <strong>PNG, JPG, WebP, GIFs animados e vídeos MP4/WebM</strong> (até 35MB por arquivo).
              </p>
            </div>

            {/* Manual URL Input alternative */}
            <div className="mt-3 rounded-xl border border-[#E6E2DA] bg-[#FBF9F5] p-3">
              <label className="block text-[11px] font-bold text-[#24232A] mb-1">
                Ou cole link direto de imagem, GIF ou vídeo:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  placeholder="/products/real/... ou https://... (aceita imagem, .gif ou .mp4)"
                  className="flex-1 rounded-xl border border-[#D5CFC4] bg-white px-3 py-1.5 text-xs font-medium text-[#24232A] focus:border-[#563487] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddManualImage}
                  className="rounded-xl border border-[#563487] bg-white px-3.5 py-1.5 text-xs font-bold text-[#563487] hover:bg-[#F3EFFA] transition"
                >
                  Adicionar Link
                </button>
              </div>
            </div>

            {/* Images & Media Visual Grid */}
            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {images.map((imgUrl, idx) => {
                  const isVideo = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(imgUrl);
                  const isGif = /\.gif(\?.*)?$/i.test(imgUrl);

                  return (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className="group relative overflow-hidden rounded-2xl border border-[#E6E2DA] bg-[#FCFBF8] p-1.5 transition hover:border-[#563487]"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/5">
                        {isVideo ? (
                          <video
                            src={imgUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="h-full w-full object-cover bg-black"
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imgUrl}
                            alt={`Mídia ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}

                        {/* Badges */}
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 flex items-center gap-1 rounded-md bg-[#563487] px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
                            <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                            Capa
                          </span>
                        )}

                        <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-[#24232A]/85 px-1.5 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs">
                          {isVideo ? (
                            <>
                              <Film className="h-2.5 w-2.5 text-purple-300" />
                              <span>Vídeo</span>
                            </>
                          ) : isGif ? (
                            <span className="text-sky-300">GIF</span>
                          ) : (
                            <span>Foto</span>
                          )}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        {idx > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleMakeCover(idx)}
                            title="Tornar capa principal da vitrine"
                            className="flex items-center gap-0.5 text-[10px] font-bold text-[#563487] hover:underline"
                          >
                            <ArrowUp className="h-3 w-3" />
                            Capa
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[#563487]">Capa atual</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remover mídia da galeria"
                          className="rounded-lg p-1 text-[#5A5863] hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-center">
                <ImageOff className="mx-auto h-6 w-6 text-amber-800/80 mb-1" />
                <p className="text-xs font-semibold text-amber-950">
                  Nenhuma fotografia ou mídia adicionada ainda.
                </p>
                <p className="text-[11px] text-amber-900/80">
                  O produto exibirá o aviso &ldquo;Imagem em atualização&rdquo; na loja até receber ao menos 1 foto, GIF ou vídeo.
                </p>
              </div>
            )}
          </div>

          {/* Technical Specs & Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 text-xs">
            <div>
              <label className="block font-bold text-[#24232A]">Categoria da Loja</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="cat-decor">Compor ambientes (Decoração)</option>
                    <option value="cat-vasos">Decorar (Vasos e Cachepots)</option>
                    <option value="cat-org">Organizar (Mesa e Setup)</option>
                    <option value="cat-presentes">Presentear (Colecionáveis)</option>
                    <option value="cat-b2b">Para empresas (Corporativo)</option>
                    <option value="cat-resina">Esculturas em Resina 8K</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Material Principal</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              >
                <option value="PLA">PLA Premium</option>
                <option value="PLA Seda">PLA Seda / Silk</option>
                <option value="PETG">PETG Carbon / Resistente</option>
                <option value="ABS">ABS Técnico</option>
                <option value="TPU">TPU Flexível</option>
                <option value="Resina">Resina 8K Acetinada</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Acabamento Estético</label>
              <input
                type="text"
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                placeholder="Fosco Camadas Suaves"
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Dimensões (mm)</label>
              <input
                type="text"
                value={dimensionsMm}
                onChange={(e) => setDimensionsMm(e.target.value)}
                placeholder="120 × 120 × 180 mm"
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Consumo de Filamento (g)</label>
              <input
                type="number"
                min="0"
                value={filamentGrams}
                onChange={(e) => setFilamentGrams(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Prazo de Fabricação (dias)</label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#24232A]">Estoque Pronta Entrega (un)</label>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3 py-2 text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="relative flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D5CFC4] text-[#563487] focus:ring-[#563487]"
                />
                <span className="text-xs font-bold text-[#24232A]">
                  Destaque na Vitrine Principal
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#24232A]">
              Descrição Resumida / Apresentação do Produto
            </label>
            <textarea
              rows={2}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Descreva o conceito, uso recomendado e diferenciais de acabamento da peça..."
              className="mt-1 w-full rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#24232A] focus:border-[#563487] focus:outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#563487] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#462970] disabled:opacity-50"
            >
              {isSubmitting ? (
                'Salvando dados...'
              ) : editingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Alterações do Produto
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Publicar Produto no Catálogo
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-[#D5CFC4] bg-white px-4 py-2.5 text-xs font-bold text-[#5A5863] hover:border-[#563487]"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Catalog Table Section */}
      <section className="rounded-3xl border border-[#E6E2DA] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E2DA] pb-5">
          <div>
            <h2 className="text-base font-bold text-[#24232A]">
              Catálogo de Peças Cadastradas ({initialProducts.length})
            </h2>
            <p className="text-xs text-[#5A5863]">
              Visualize e gerencie os produtos ativos, fotos reais e margem unitária da loja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 my-auto ml-2.5 h-3.5 w-3.5 text-[#5A5863]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, SKU..."
                className="rounded-xl border border-[#D5CFC4] bg-[#FCFBF8] pl-8 pr-3 py-1.5 text-xs text-[#24232A] focus:border-[#563487] focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl border border-[#E6E2DA] bg-[#FBF9F5] p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  filterMode === 'all'
                    ? 'bg-white text-[#563487] shadow-xs'
                    : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('with_photo')}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  filterMode === 'with_photo'
                    ? 'bg-white text-[#563487] shadow-xs'
                    : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Com Foto
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('pending_photo')}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  filterMode === 'pending_photo'
                    ? 'bg-white text-[#563487] shadow-xs'
                    : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Foto Pendente
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('featured')}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  filterMode === 'featured'
                    ? 'bg-white text-[#563487] shadow-xs'
                    : 'text-[#5A5863] hover:text-[#24232A]'
                }`}
              >
                Destaques
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E2DA] text-[11px] text-[#5A5863] uppercase tracking-wider">
                <th className="py-3 pr-3">Foto / SKU / Peça</th>
                <th className="py-3 pr-3">Material & Prazo</th>
                <th className="py-3 pr-3">Consumo</th>
                <th className="py-3 pr-3">Custo Direto</th>
                <th className="py-3 pr-3">Preço Venda & Margem</th>
                <th className="py-3 pr-3">Estoque</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E2DA] text-[#24232A]">
              {filteredProducts.map((p) => {
                let imgs: string[] = [];
                try {
                  imgs = JSON.parse(p.images_json || '[]');
                } catch {
                  imgs = [];
                }
                const hasPhoto = Array.isArray(imgs) && imgs.length > 0;
                const coverImg = hasPhoto ? imgs[0] : null;
                const grossMarginPct =
                  p.price_cents > 0
                    ? Math.round(((p.price_cents - p.cost_cents) / p.price_cents) * 100)
                    : 0;

                const isCurrentEditing = editingId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`transition hover:bg-[#FCFBF8] ${
                      isCurrentEditing ? 'bg-[#F3EFFA]/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E6E2DA] bg-[#FCFBF8]">
                          {coverImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coverImg}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-800">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                          {p.featured && (
                            <span
                              title="Produto em destaque"
                              className="absolute top-0.5 right-0.5 rounded-full bg-amber-400 p-0.5 text-white"
                            >
                              <Star className="h-2 w-2 fill-white" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <strong className="block truncate text-[#24232A]">{p.name}</strong>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#563487]">
                            <span>{p.sku}</span>
                            {hasPhoto ? (
                              <span className="text-[10px] text-emerald-800 font-sans">
                                • {imgs.length} foto(s)
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-800 font-sans font-bold">
                                • Foto pendente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-3">
                      <span className="font-semibold text-[#24232A]">{p.material}</span>
                      <span className="block text-[11px] text-[#5A5863]">
                        {p.lead_time_days}d ({p.finish})
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 font-mono text-[#24232A]">
                      {p.filament_grams_per_unit}g
                      <span className="block text-[10px] text-[#5A5863]">
                        {p.dimensions_mm || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 text-[#5A5863]">
                      {formatBRLFromCents(p.cost_cents)}
                    </td>

                    <td className="py-3.5 pr-3">
                      <strong className="text-sm text-[#24232A]">
                        {formatBRLFromCents(p.price_cents)}
                      </strong>
                      <span
                        className={`block text-[10px] font-bold ${
                          grossMarginPct >= 50
                            ? 'text-emerald-800'
                            : grossMarginPct >= 25
                            ? 'text-amber-800'
                            : 'text-red-700'
                        }`}
                      >
                        Margem: {grossMarginPct}%
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 font-semibold text-[#24232A]">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          p.stock_qty > 0
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            : 'bg-red-50 text-red-900 border border-red-200'
                        }`}
                      >
                        {p.stock_qty} un
                      </span>
                    </td>

                    <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleEditClick(p)}
                        title="Editar produto e fotos"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D5CFC4] bg-white px-2.5 py-1 text-[11px] font-bold text-[#563487] hover:border-[#563487] hover:bg-[#F3EFFA]"
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </button>

                      {/* Pricing Link */}
                      <Link
                        href={`/admin/precificador?product=${p.id}`}
                        title="Simular custos no precificador 3D"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F3EFFA] px-2.5 py-1 text-[11px] font-semibold text-[#563487] hover:bg-[#563487] hover:text-white"
                      >
                        Precificar
                      </Link>

                      {/* View on Public Store */}
                      <Link
                        href={`/produto/${p.slug}`}
                        target="_blank"
                        title="Ver como o cliente enxerga na loja"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E6E2DA] bg-white px-2.5 py-1 text-[11px] text-[#24232A] hover:border-[#563487]"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deletingId === p.id}
                        title="Excluir produto do catálogo"
                        className="inline-flex items-center rounded-lg p-1 text-[#5A5863] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#5A5863]">
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, DollarSign, Image as ImageIcon, Trash2, Package, Box, PlayCircle, Film, Image as ImageIconLucide, Check, Save } from 'lucide-react';
import { Product } from '../../types';
import { apiProducts, apiUpload } from '../../api';
import { NexusInput, NexusSelect, NexusTextarea } from '../ui/NexusInputs';
import { NexusSectionButton, NexusCardButton } from '../ui/NexusButton';
import { NexusSection } from '../ui/NexusSection';

interface ProductFormProps {
  initialData?: Product;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onCancel, onSave, onValidationChange, showToast }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [productType, setProductType] = useState<'BIRD' | 'ITEM'>((initialData?.type?.toUpperCase() as 'BIRD' | 'ITEM') || 'BIRD');
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  const [status, setStatus] = useState(initialData?.status || 'available');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const [ringNumber, setRingNumber] = useState(initialData?.ringNumber || '');
  const [age, setAge] = useState<Product['age']>(initialData?.age || 'STAG');
  const [purpose, setPurpose] = useState<Product['purpose']>(initialData?.purpose || 'COMBAT');
  
  const [stock, setStock] = useState(initialData?.stock?.toString() || '');

  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialData?.gallery || []);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]); 

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = !!coverUrl && !!name && !!price && (productType === 'BIRD' ? !!ringNumber : !!stock) && !isProcessing;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const isVideo = useMemo(() => {
    if (coverFile) return coverFile.type.startsWith('video/');
    if (coverUrl) {
       const lower = coverUrl.toLowerCase();
       return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
    }
    return false;
  }, [coverFile, coverUrl]);

  const isVideoUrl = (url: string) => {
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setTimeout(() => {
          setCoverFile(file);
          setCoverUrl(URL.createObjectURL(file));
          setIsProcessing(false);
      }, 400);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files) as File[];
      setGalleryFiles(prev => [...prev, ...newFiles]);
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setGalleryUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeGalleryImage = (index: number) => {
    const existingCount = (initialData?.gallery?.length || 0);
    if (index >= existingCount) {
        const fileIndex = index - existingCount;
        setGalleryFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    setGalleryUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        const uploadRes = await apiUpload.upload(coverFile);
        finalCoverUrl = uploadRes.url;
      }

      const finalGalleryUrls = galleryUrls.filter(url => !url.startsWith('blob:'));
      for (const file of galleryFiles) {
        const uploadRes = await apiUpload.upload(file);
        finalGalleryUrls.push(uploadRes.url);
      }

      const payload: any = {
        type: productType,
        name,
        price: parseFloat(price),
        description,
        saleStatus: status.toUpperCase(),
        thumbnail: finalCoverUrl,
        gallery: finalGalleryUrls
      };

      if (productType === 'BIRD') {
        payload.ringNumber = ringNumber;
        payload.age = age;
        payload.purpose = purpose;
        payload.stock = 1;
      } else {
        payload.stock = parseInt(stock);
      }
      
      if (initialData?.id) {
        await apiProducts.update(initialData.id, payload);
      } else {
        await apiProducts.create(payload);
      }
      onSave();
    } catch (error) {
      console.error(error);
      showToast?.('Error al guardar el producto.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="product-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row animate-in fade-in duration-700" style={{ gap: 'var(--space-lg)' }}>
      
      {/* COLUMN LEFT: MULTIMEDIA */}
      <div className="flex-1 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
        
        {/* Cover Image Section */}
        <div 
          onClick={() => !isProcessing && coverInputRef.current?.click()}
          className={`relative w-full aspect-square sm:aspect-video lg:aspect-square border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden active:scale-[0.995] ${!coverUrl ? 'border-border-main bg-bg-muted hover:bg-bg-card hover:border-brand-300 cursor-pointer group' : 'border-transparent shadow-xl shadow-stone-200/40 group'}`}
          style={{ borderRadius: 'var(--radius-outer)' }}
        >
          {!coverUrl ? (
            <div className="flex flex-col items-center p-10 text-center pointer-events-none" style={{ gap: 'var(--space-md)' }}>
              <div 
                className="w-20 h-20 bg-bg-card text-brand-500 flex items-center justify-center shadow-sm dark:shadow-none border border-border-main group-hover:scale-110 transition-transform duration-500"
                style={{ borderRadius: 'var(--radius-inner-visual)' }}
              >
                <ImageIcon size={32} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <h3 className="text-h1 text-text-main">Foto de Portada</h3>
                <p className="text-secondary text-text-muted max-w-[240px]">Imagen principal que se mostrará en el catálogo.</p>
              </div>
              <div className="flex" style={{ gap: 'var(--space-sm)' }}>
                <span className="px-3 py-1 bg-stone-100 rounded-lg text-label uppercase tracking-[0.15em] text-text-muted border border-border-main !text-[9px]">JPG</span>
                <span className="px-3 py-1 bg-stone-100 rounded-lg text-label uppercase tracking-[0.15em] text-text-muted border border-border-main !text-[9px]">MP4</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full group cursor-pointer">
              {isVideo ? (
                 <video src={coverUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              ) : (
                 <img src={coverUrl} className="w-full h-full object-cover" alt="Portada" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center" style={{ gap: 'var(--space-sm)' }}>
                <div className="bg-bg-card/20 backdrop-blur-xl p-4 rounded-full border border-white/30 text-white mb-2 scale-90 group-hover:scale-100 transition-transform duration-500">
                    <ImageIconLucide size={32} />
                </div>
                <span className="text-white text-label uppercase tracking-[0.15em]">Cambiar portada</span>
              </div>
              <NexusCardButton 
                variant="ghost" 
                size="icon"
                onClick={(e) => { e.stopPropagation(); setCoverUrl(null); setCoverFile(null); if(coverInputRef.current) coverInputRef.current.value = ''; }}
                className="absolute top-6 right-6 bg-black/20 hover:bg-rose-500 text-white backdrop-blur-xl z-20"
              >
                <X size={18} />
              </NexusCardButton>
              <div 
                className="absolute top-6 left-6 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 flex items-center z-10"
                style={{ borderRadius: 'var(--radius-nested-simple)', gap: 'var(--space-sm)' }}
              >
                {isVideo ? <Film size={12} className="text-white" /> : <ImageIcon size={12} className="text-white" />}
                <span className="text-white text-label uppercase tracking-[0.15em] !text-[9px]">{isVideo ? 'Video' : 'Foto'}</span>
              </div>
            </div>
          )}
          {isProcessing && (
             <div className="absolute inset-0 bg-bg-card/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-in fade-in duration-200" style={{ gap: 'var(--space-md)' }}>
                 <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                 <span className="text-label text-brand-700 uppercase tracking-[0.2em]">Procesando...</span>
             </div>
          )}
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*,video/*" onChange={handleCoverUpload} />
        </div>

        {/* Gallery Section */}
        <NexusSection
          title="Galería Adicional"
          subtitle="Multimedia secundario"
          icon={ImageIcon}
          iconVariant="brand"
          action={
            <NexusSectionButton 
              type="button"
              variant="secondary" 
              isIconOnly
              onClick={() => galleryInputRef.current?.click()}
              icon={Upload}
            />
          }
        >
          <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleGalleryUpload} />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" style={{ gap: 'var(--space-md)' }}>
            {galleryUrls.map((url, idx) => (
              <div 
                key={idx} 
                className="relative aspect-square overflow-hidden group border border-border-main shadow-sm dark:shadow-none bg-stone-100 hover:scale-[1.05] transition-transform duration-500"
                style={{ borderRadius: 'var(--radius-inner-visual)' }}
              >
                {isVideoUrl(url) ? (
                   <video src={url} className="w-full h-full object-cover" />
                ) : (
                   <img src={url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                )}
                {isVideoUrl(url) && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <PlayCircle className="text-white/80 w-8 h-8 drop-shadow-lg" />
                   </div>
                )}
                <button 
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-1.5 right-1.5 p-2 bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 backdrop-blur-sm"
                  style={{ borderRadius: 'var(--radius-nested-simple)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {galleryUrls.length === 0 && (
              <div 
                className="col-span-full py-12 text-center bg-bg-muted border border-dashed border-border-main flex flex-col items-center"
                style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-sm)' }}
              >
                <p className="text-label text-text-muted uppercase tracking-[0.15em]">Sin imágenes adicionales</p>
              </div>
            )}
          </div>
        </NexusSection>
      </div>

      {/* COLUMN RIGHT: DETAILS */}
      <div className="w-full lg:w-[480px]">
        <NexusSection
          title="Detalles"
          subtitle="Información del catálogo"
          icon={productType === 'BIRD' ? Box : Package}
          iconVariant="brand"
          className="h-full"
        >
          <div className="flex flex-col relative" style={{ gap: 'var(--space-lg)' }}>
            
            {/* Product Type Selector */}
            <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
              <label className="text-label uppercase tracking-[0.15em] text-text-muted ml-1">Tipo de Producto</label>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-sm)' }}>
                 <button 
                   type="button"
                   onClick={() => setProductType('BIRD')}
                   className={`flex items-center justify-center py-4 border-2 transition-all text-secondary font-bold active:scale-[0.98]
                      ${productType === 'BIRD' ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-lg shadow-brand-500/10' : 'border-border-main bg-bg-muted text-text-muted hover:border-brand-200'}
                   `}
                   style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-sm)' }}
                 >
                   <Box size={18} strokeWidth={2} />
                   Ave
                 </button>
                 <button 
                   type="button"
                   onClick={() => setProductType('ITEM')}
                   className={`flex items-center justify-center py-4 border-2 transition-all text-secondary font-bold active:scale-[0.98]
                      ${productType === 'ITEM' ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-lg shadow-brand-500/10' : 'border-border-main bg-bg-muted text-text-muted hover:border-brand-200'}
                   `}
                   style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-sm)' }}
                 >
                   <Package size={18} strokeWidth={2} />
                   Artículo
                 </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              <NexusInput 
                label="Nombre del Producto *" 
                placeholder={productType === 'BIRD' ? "Ej. Semental Colorado..." : "Ej. Sombrero de Gala..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                {productType === 'BIRD' ? (
                  <NexusInput 
                    label="No. Anillo *"
                    placeholder="Ej. AB-123"
                    value={ringNumber}
                    onChange={(e) => setRingNumber(e.target.value)}
                  />
                ) : (
                  <NexusInput 
                    label="Stock *"
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                )}
                
                <NexusInput 
                  label="Precio *"
                  type="number"
                  icon={DollarSign}
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {productType === 'BIRD' && (
                <div className="grid grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-500" style={{ gap: 'var(--space-md)' }}>
                  <NexusSelect 
                    label="Edad / Etapa"
                    value={age}
                    onChange={(e) => setAge(e.target.value as any)}
                  >
                    <option value="HEN">Gallina</option>
                    <option value="COCK">Gallo</option>
                    <option value="PULLET">Polla</option>
                    <option value="STAG">Pollo</option>
                  </NexusSelect>
                  
                  <NexusSelect 
                    label="Propósito"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as any)}
                  >
                    <option value="COMBAT">Combate</option>
                    <option value="BREEDING">Cría</option>
                  </NexusSelect>
                </div>
              )}

              <NexusSelect 
                label="Estado de Venta"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="available">Disponible</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
              </NexusSelect>

              <NexusTextarea 
                label="Descripción"
                placeholder="Detalles adicionales, genética, materiales..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {isSubmitting && (
                <div className="absolute inset-0 bg-bg-card/60 backdrop-blur-md z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center bg-bg-card p-10 border border-border-main shadow-2xl animate-in zoom-in duration-500" style={{ borderRadius: 'var(--radius-outer)', gap: 'var(--space-md)' }}>
                        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-label text-brand-700 uppercase tracking-[0.2em]">Guardando cambios...</span>
                    </div>
                </div>
            )}
          </div>
        </NexusSection>
      </div>
    </form>
  );
};

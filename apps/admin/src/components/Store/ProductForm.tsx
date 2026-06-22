import React, { useState, useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Upload, X, DollarSign, Image as ImageIcon, Trash2, Package, Box, PlayCircle, Film, Check, PlusCircle } from 'lucide-react';
import { Product } from '../../types';
import { apiProducts, apiUpload, ASSET_BASE_URL } from '../../api';
import { extractFramesFromVideo } from '../../utils/video';
import { NexusInput, NexusSelect, NexusTextarea } from '../ui/NexusInputs';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusSection } from '../ui/NexusSection';
import { InteractionStage } from '../ui/InteractionStage';
import { UploadPreviewOverlay } from '../ui/UploadPreviewOverlay';

interface ProductFormProps {
  initialData?: Product;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

// Helper para asegurar que las URLs sean absolutas
const getFullUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const baseUrl = ASSET_BASE_URL.endsWith('/') ? ASSET_BASE_URL : `${ASSET_BASE_URL}/`;
  return `${baseUrl}${cleanPath}`;
};

export const ProductForm = forwardRef<{ handleSave: () => void }, ProductFormProps>(
  ({ initialData, onCancel, onSave, onValidationChange, showToast }, ref) => {
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

    const [coverUrl, setCoverUrl] = useState<string | null>(getFullUrl(initialData?.imageUrl) || null);
    const [coverFile, setCoverFile] = useState<File | null>(null);

    const [staticThumbUrl, setStaticThumbUrl] = useState<string | null>(getFullUrl(initialData?.thumbnail) || null);
    const [staticThumbFile, setStaticThumbFile] = useState<File | null>(null);
    const [suggestedThumbs, setSuggestedThumbs] = useState<{ blob: Blob, url: string }[]>([]);
    const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);

    const [galleryUrls, setGalleryUrls] = useState<string[]>(initialData?.gallery?.map(g => getFullUrl(typeof g === 'string' ? g : (g as any).filePath)!) || []);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]); 

    const coverInputRef = useRef<HTMLInputElement>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const isVideo = useMemo(() => {
      if (coverFile) return coverFile.type.startsWith('video/');
      if (coverUrl) {
         const urlWithoutParams = coverUrl.split('?')[0].toLowerCase();
         return urlWithoutParams.endsWith('.mp4') || urlWithoutParams.endsWith('.mov') || urlWithoutParams.endsWith('.webm');
      }
      return false;
    }, [coverFile, coverUrl]);

    const isFormValid = !!coverUrl && !!name && !!price && (productType === 'BIRD' ? !!ringNumber : !!stock) && !isProcessing && (!isVideo || !!staticThumbUrl);

    // Inicialización inteligente para productos con video de portada
    useEffect(() => {
      if (initialData?.gallery && initialData.gallery.length > 0) {
        const firstAsset = initialData.gallery[0];
        const rawUrl = typeof firstAsset === 'string' ? firstAsset : (firstAsset as any).filePath;
        const url = getFullUrl(rawUrl);
        
        if (url) {
          const urlWithoutParams = url.split('?')[0].toLowerCase();
          const isFirstAssetVideo = urlWithoutParams.match(/\.(mp4|mov|webm)$/);

          if (isFirstAssetVideo) {
            setCoverUrl(url);
            setStaticThumbUrl(getFullUrl(initialData.thumbnail) || null);
            setGalleryUrls(initialData.gallery.slice(1).map(g => getFullUrl(typeof g === 'string' ? g : (g as any).filePath)!));
          }
        }
      }
    }, [initialData]);

    // Generar miniaturas sugeridas automáticamente si la portada es un video (para edición)
    useEffect(() => {
      const shouldExtract = coverUrl && isVideo && suggestedThumbs.length === 0 && !isGeneratingThumbs && !coverFile;
      
      if (shouldExtract) {
        const autoExtract = async () => {
          setIsGeneratingThumbs(true);
          try {
            const frames = await extractFramesFromVideo(coverUrl, 3);
            setSuggestedThumbs(frames);
          } catch (err) {
            console.error('Error auto-generating thumbs:', err);
          } finally {
            setIsGeneratingThumbs(false);
          }
        };
        autoExtract();
      }
    }, [coverUrl, isVideo, suggestedThumbs.length, isGeneratingThumbs, coverFile]);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        handleSubmit();
      }
    }));

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const isVideoUrl = (url: string) => {
    const urlWithoutParams = url.split('?')[0].toLowerCase();
    return urlWithoutParams.endsWith('.mp4') || urlWithoutParams.endsWith('.mov') || urlWithoutParams.endsWith('.webm');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setSuggestedThumbs([]);
      try {
        setCoverFile(file);
        setCoverUrl(URL.createObjectURL(file));

        if (file.type.startsWith('video/')) {
          setIsGeneratingThumbs(true);
          const frames = await extractFramesFromVideo(file, 3);
          setSuggestedThumbs(frames);
          if (frames.length >= 2) {
            const defaultFrame = frames[1];
            setStaticThumbUrl(defaultFrame.url);
            setStaticThumbFile(new File([defaultFrame.blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
          }
        } else {
          setStaticThumbUrl(null);
          setStaticThumbFile(null);
        }
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        showToast?.('Error al procesar el multimedia.', 'error');
      } finally {
        setIsProcessing(false);
        setIsGeneratingThumbs(false);
      }
    }
  };

  const selectSuggestedThumb = (frame: { blob: Blob, url: string }) => {
    setStaticThumbFile(new File([frame.blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
    setStaticThumbUrl(frame.url);
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStaticThumbFile(file);
      setStaticThumbUrl(URL.createObjectURL(file));
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 6 - galleryUrls.length;
      if (remainingSlots <= 0) {
        showToast?.('Máximo 6 elementos en la galería.', 'error');
        return;
      }
      const newFiles = Array.from(files).slice(0, remainingSlots) as File[];
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
      let finalStaticThumbUrl = staticThumbUrl;

      if (coverFile) {
        const uploadRes = await apiUpload.upload(coverFile);
        finalCoverUrl = uploadRes.url;
      }

      if (isVideo && staticThumbFile) {
        const uploadRes = await apiUpload.upload(staticThumbFile);
        finalStaticThumbUrl = uploadRes.url;
      }

      const finalGallery = galleryUrls.filter(url => !url.startsWith('blob:')).map(url => ({
        url,
        type: isVideoUrl(url) ? 'VIDEO' : 'PHOTO'
      }));

      if (isVideo && finalCoverUrl) {
        finalGallery.unshift({ url: finalCoverUrl, type: 'VIDEO' });
      }

      for (const file of galleryFiles) {
        const uploadRes = await apiUpload.upload(file);
        finalGallery.push({ url: uploadRes.url, type: file.type.startsWith('video/') ? 'VIDEO' : 'PHOTO' });
      }

      const payload: any = {
        type: productType,
        name,
        price: parseFloat(price),
        description,
        saleStatus: status.toUpperCase(),
        thumbnail: isVideo ? finalStaticThumbUrl : finalCoverUrl,
        gallery: finalGallery
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
    <form
      id="product-form"
      onSubmit={handleSubmit}
      className="flex flex-col animate-in fade-in duration-700"
      style={{ gap: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}
    >
      
      {/* MASTER LAYOUT: 2 MAIN COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: 'var(--space-lg)' }}>
        
        {/* LEFT COLUMN: MULTIMEDIA (SPAN 7/12) */}
        <div className="lg:col-span-7 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
          
          {/* 1. Cover Asset */}
          <div className="w-full">
            {!coverUrl ? (
              <InteractionStage 
                level={1}
                size="normal"
                className="aspect-video w-full shadow-sm"
                icon={Upload}
                title="Portada del Producto"
                description="Imagen o video principal del producto (16:9 recomendado)."
                onClick={() => !isProcessing && coverInputRef.current?.click()}
              />
            ) : (
              <div 
                className="relative w-full aspect-video transition-all duration-500 flex flex-col items-center justify-center overflow-hidden active:scale-[0.995] shadow-xl shadow-stone-200/40 group cursor-pointer"
                style={{ borderRadius: 'var(--radius-outer)' }}
                onClick={() => !isProcessing && coverInputRef.current?.click()}
              >
                {isVideo ? (
                  <video src={coverUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <img src={coverUrl} className="w-full h-full object-cover" alt="Portada" />
                )}
                <UploadPreviewOverlay label="Cambiar Portada" />
                
                {/* Controles Flotantes Nivel 2 (Autonomous Scale) */}
                <div className="absolute top-0 inset-x-0 flex items-center justify-between z-20 pointer-events-none" style={{ padding: 'var(--padding-inner)' }}>
                  
                  {/* Badge de Estado (Usando el componente oficial para heredar proporciones) */}
                  <div className="pointer-events-auto">
                    <NexusAutonomousButton
                      type="button"
                      variant="ghost"
                      icon={isVideo ? Film : ImageIcon}
                      className="bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-none pointer-events-none"
                    >
                      {isVideo ? 'Video' : 'Foto'}
                    </NexusAutonomousButton>
                  </div>

                  {/* Acción de Eliminar (isIconOnly garantiza el 1:1 aspect-square) */}
                  <div className="pointer-events-auto">
                    <NexusAutonomousButton 
                      type="button"
                      variant="ghost" 
                      isIconOnly
                      icon={X}
                      onClick={(e) => { e.stopPropagation(); setCoverUrl(null); setCoverFile(null); setStaticThumbUrl(null); if(coverInputRef.current) coverInputRef.current.value = ''; }}
                      className="bg-black/40 hover:bg-rose-500 backdrop-blur-md border border-white/10 text-white shadow-none"
                    />
                  </div>
                </div>
              </div>
            )}
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*,video/*" onChange={handleCoverUpload} />
          </div>

          {/* 2. Bottom Content: Miniature & Gallery (Always Stacked) */}
          <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
            
            {/* Miniature Selector (Only if Video) */}
            {isVideo && (
              <NexusSection
                title="Miniatura del Video"
                subtitle="Selecciona el fotograma para el catálogo"
                icon={ImageIcon}
                iconVariant="brand"
              >
                <div className="flex flex-col animate-in slide-in-from-top duration-500" style={{ gap: 'var(--space-md)' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5" style={{ gap: 'var(--space-md)' }}>
                    {suggestedThumbs.map((frame, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestedThumb(frame)}
                        className={`relative aspect-video overflow-hidden border-2 transition-all duration-300 group
                          ${staticThumbUrl === frame.url ? 'border-brand-500 ring-4 ring-brand-500/10 scale-[1.02]' : 'border-border-main opacity-60 hover:opacity-100 hover:border-brand-200'}
                        `}
                        style={{ borderRadius: 'var(--radius-inner-visual)' }}
                      >
                        <img src={frame.url} className="w-full h-full object-cover" alt={`Opción ${idx + 1}`} />
                        {staticThumbUrl === frame.url && (
                          <div className="absolute inset-0 bg-brand-500/10 flex items-center justify-center">
                            <div
                              className="bg-brand-500 text-white shadow-lg"
                              style={{
                                padding: 'var(--space-xs)',
                                borderRadius: 'var(--radius-nested-simple)'
                              }}
                            >
                              <Check size={12} strokeWidth={4} />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                    
                    {/* Manual Upload or Existing Server Thumb */}
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className={`relative aspect-video overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 group
                        ${staticThumbUrl && !suggestedThumbs.some(f => f.url === staticThumbUrl) 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : 'border-border-main/60 bg-bg-muted/20 hover:bg-brand-50/20 hover:border-brand-300/50 text-text-muted'}
                      `}
                      style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-xs)' }}
                    >
                      {staticThumbUrl && !suggestedThumbs.some(f => f.url === staticThumbUrl) ? (
                        <>
                          <img src={staticThumbUrl!} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Manual" />
                          <Check size={16} className="z-10 text-emerald-600" />
                          <span className="z-10 text-label uppercase tracking-[0.15em] text-emerald-700">
                            {staticThumbFile ? 'Manual' : 'Actual'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div 
                            className="bg-stone-100 text-stone-400 group-hover:bg-brand-100 group-hover:text-brand-500 transition-colors"
                            style={{ borderRadius: 'var(--radius-nested-simple)', padding: 'var(--space-sm)' }}
                          >
                            <Upload size={20} strokeWidth={2} />
                          </div>
                          <span className="text-label uppercase tracking-[0.15em] text-text-muted group-hover:text-brand-600 transition-colors">Manual</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input type="file" ref={thumbInputRef} className="hidden" accept="image/*" onChange={handleThumbUpload} />
                </div>
              </NexusSection>
            )}

            {/* Gallery Section - Organic Grid Look */}
            <NexusSection
              title="Galería Adicional"
              subtitle="Multimedia secundario (Máx. 6)"
              icon={Film}
              iconVariant="brand"
            >
              <div className="flex flex-col animate-in slide-in-from-top duration-500" style={{ gap: 'var(--space-md)' }}>
                <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleGalleryUpload} />
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6" style={{ gap: 'var(--space-md)' }}>
                  {/* Gallery Items */}
                  {galleryUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative aspect-square overflow-hidden group border border-border-main shadow-sm bg-bg-card hover:scale-[1.05] transition-transform duration-500"
                      style={{ borderRadius: 'var(--radius-inner-visual)' }}
                    >
                      {isVideoUrl(url) ? (
                        <video 
                          src={`${url}#t=0.5`} 
                          className="w-full h-full object-cover" 
                          preload="metadata" 
                          playsInline
                        />
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
                        className="absolute bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 backdrop-blur-sm z-20"
                        style={{
                          top: 'var(--space-xs)',
                          right: 'var(--space-xs)',
                          borderRadius: 'var(--radius-nested-simple)',
                          padding: 'var(--space-sm)'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Organic Add Button (Always visible if < 6) */}
                  {galleryUrls.length < 6 && (
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border-main/60 bg-bg-muted/20 hover:bg-brand-50/20 hover:border-brand-300/50 transition-all duration-300 group"
                      style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-xs)' }}
                    >
                      <div 
                        className="bg-stone-100 text-stone-400 group-hover:bg-brand-100 group-hover:text-brand-500 transition-colors"
                        style={{ borderRadius: 'var(--radius-nested-simple)', padding: 'var(--space-sm)' }}
                      >
                        <PlusCircle size={20} strokeWidth={2} />
                      </div>
                      <span className="text-label uppercase tracking-[0.15em] text-text-muted group-hover:text-brand-600 transition-colors">Añadir</span>
                    </button>
                  )}
                </div>
              </div>
            </NexusSection>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS (SPAN 5/12) */}
        <div className="lg:col-span-5">
          <NexusSection title="Detalles del Producto" subtitle="Configuración técnica" icon={productType === 'BIRD' ? Box : Package} iconVariant="brand">
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              
              {/* Product Type Toggle */}
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <button 
                  type="button" 
                  onClick={() => setProductType('BIRD')} 
                  className={`flex items-center justify-center text-label uppercase tracking-[0.15em] transition-all border-2
                    ${productType === 'BIRD' ? 'border-brand-500 bg-brand-50/30 text-brand-600 shadow-sm shadow-brand-500/10' : 'border-border-main bg-bg-card text-text-muted hover:border-brand-300 hover:bg-bg-muted'}
                  `} 
                  style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-xs)', height: 'var(--h-input)' }}
                >
                  <Box size={14} strokeWidth={2.5} /> Ave
                </button>
                <button 
                  type="button" 
                  onClick={() => setProductType('ITEM')} 
                  className={`flex items-center justify-center text-label uppercase tracking-[0.15em] transition-all border-2
                    ${productType === 'ITEM' ? 'border-brand-500 bg-brand-50/30 text-brand-600 shadow-sm shadow-brand-500/10' : 'border-border-main bg-bg-card text-text-muted hover:border-brand-300 hover:bg-bg-muted'}
                  `} 
                  style={{ borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-xs)', height: 'var(--h-input)' }}
                >
                  <Package size={14} strokeWidth={2.5} /> Artículo
                </button>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                  <NexusInput label="Nombre del Producto *" value={name} onChange={(e) => setName(e.target.value)} />
                  
                  <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                    <NexusInput label="Precio *" type="number" icon={DollarSign} value={price} onChange={(e) => setPrice(e.target.value)} />
                    <NexusSelect label="Estado Venta" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="available">Disponible</option>
                      <option value="reserved">Reservado</option>
                      <option value="sold">Vendido</option>
                    </NexusSelect>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                    {productType === 'BIRD' ? (
                      <>
                        <NexusInput label="No. Anillo *" value={ringNumber} onChange={(e) => setRingNumber(e.target.value)} />
                        <NexusSelect label="Edad" value={age} onChange={(e) => setAge(e.target.value as any)}>
                          <option value="STAG">Pollo</option>
                          <option value="COCK">Gallo</option>
                          <option value="PULLET">Polla</option>
                          <option value="HEN">Gallina</option>
                        </NexusSelect>
                      </>
                    ) : (
                      <NexusInput label="Stock *" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
                    )}
                  </div>

                  {productType === 'BIRD' && (
                    <NexusSelect label="Propósito" value={purpose} onChange={(e) => setPurpose(e.target.value as any)}>
                      <option value="COMBAT">Combate</option>
                      <option value="BREEDING">Cría</option>
                    </NexusSelect>
                  )}

                  <NexusTextarea label="Descripción y Genética" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
              </div>

              {isSubmitting && (
                <div
                  className="flex items-center justify-center bg-brand-50 border border-brand-100 animate-pulse"
                  style={{
                    gap: 'var(--space-sm)',
                    paddingBlock: 'var(--space-sm)',
                    borderRadius: 'var(--radius-inner-visual)'
                  }}
                >
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-label text-brand-700 uppercase tracking-widest">Guardando cambios...</span>
                </div>
              )}
            </div>
          </NexusSection>
        </div>
      </div>
    </form>
  );
});

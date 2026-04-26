import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, DollarSign, ChevronDown, Image as ImageIcon, Trash2, Package, Box, PlayCircle, Loader2, Film, Image as ImageIconLucide } from 'lucide-react';
import { Product } from '../../types';
import { apiProducts } from '../../api';

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
  
  const [productType, setProductType] = useState<'ave' | 'articulo'>(initialData?.type || 'ave');
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  const [status, setStatus] = useState(initialData?.status || 'available');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const [ringNumber, setRingNumber] = useState(initialData?.ringNumber || '');
  const [age, setAge] = useState(initialData?.age || 'pollo');
  const [purpose, setPurpose] = useState(initialData?.purpose || 'combate');
  
  const [stock, setStock] = useState(initialData?.stock?.toString() || '');

  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialData?.gallery || []);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]); 

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = !!coverUrl && !!name && !!price && (productType === 'ave' ? !!ringNumber : !!stock) && !isProcessing;

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
      }, 600);
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
      const formData = new FormData();
      if (initialData?.id) formData.append('id', initialData.id);
      
      formData.append('tipo', productType);
      formData.append('nombre', name);
      formData.append('precio', price);
      formData.append('descripcion', description);
      
      // CORRECCIÓN: Mapear y enviar el estado para TODOS los productos (Aves y Artículos)
      const statusMap: Record<string, string> = {
        'available': 'disponible',
        'reserved': 'reservado',
        'sold': 'vendido'
      };
      formData.append('estado_venta', statusMap[status] || 'disponible');
      
      if (productType === 'ave') {
        formData.append('anillo', ringNumber);
        formData.append('edad', age);
        formData.append('proposito', purpose);
        // Enviar siempre 1 en el stock si es un ave (producto único)
        formData.append('stock', '1');
      } else {
        formData.append('stock', stock);
      }
      
      if (coverFile) formData.append('portada', coverFile);
      galleryFiles.forEach((file) => {
        formData.append('galeria[]', file);
      });
      
      await apiProducts.create(formData);
      onSave();
    } catch (error) {
      console.error(error);
      showToast?.('Error al guardar el producto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="product-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Columna Izquierda (Igual: Portada y Galería) */}
      <div className="flex-1 space-y-6">
        <div 
          onClick={() => !isProcessing && coverInputRef.current?.click()}
          className={`relative w-full aspect-square sm:aspect-video lg:aspect-square rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden ${!coverUrl ? 'border-stone-200 bg-stone-50 hover:bg-white hover:border-brand-300 cursor-pointer group' : 'border-transparent shadow-2xl shadow-stone-200 group'}`}
        >
          {!coverUrl ? (
            <div className="flex flex-col items-center p-10 text-center pointer-events-none">
              <div className="w-20 h-20 bg-white text-brand-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-stone-100 group-hover:scale-110 transition-transform duration-500">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-xl font-black text-stone-800 tracking-tight mb-2">Foto de Portada</h3>
              <p className="text-stone-400 text-sm font-medium max-w-[200px] mb-6">Imagen principal que se verá en el catálogo.</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">JPG</span>
                <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">PNG</span>
                <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">MP4</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full group cursor-pointer">
              {isVideo ? (
                 <video src={coverUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              ) : (
                 <img src={coverUrl} className="w-full h-full object-cover" alt="Portada" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                <div className="bg-white/20 backdrop-blur-xl p-4 rounded-full border border-white/30 text-white mb-2">
                    <ImageIconLucide size={32} />
                </div>
                <span className="text-white font-bold tracking-wider text-xs uppercase">Cambiar portada</span>
              </div>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setCoverUrl(null); setCoverFile(null); if(coverInputRef.current) coverInputRef.current.value = ''; }}
                className="absolute top-4 right-4 p-3 bg-black/20 hover:bg-rose-500 backdrop-blur-xl rounded-full text-white transition-all active:scale-90 border border-white/10 z-20"
              >
                <X size={20} />
              </button>
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2 z-10">
                {isVideo ? (
                    <>
                        <Film size={14} className="text-white" />
                        <span className="text-white text-[10px] font-black uppercase tracking-wider">Video</span>
                    </>
                ) : (
                    <>
                        <ImageIcon size={14} className="text-white" />
                        <span className="text-white text-[10px] font-black uppercase tracking-wider">Fotografía</span>
                    </>
                )}
              </div>
            </div>
          )}
          {isProcessing && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                 <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
                 <span className="text-sm font-bold text-stone-600 uppercase tracking-wider">Procesando archivo...</span>
             </div>
          )}
          <input type="file" ref={coverInputRef} className="hidden" accept="image/*,video/*" onChange={handleCoverUpload} />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Multimedia</span>
                <h4 className="text-lg font-black text-stone-800 tracking-tight">Galería Adicional</h4>
             </div>
             <button 
               type="button"
               onClick={() => galleryInputRef.current?.click()}
               className="p-3 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-2xl transition-all active:scale-90 border border-stone-200"
             >
                <Upload size={20} />
             </button>
             <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleGalleryUpload} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {galleryUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-stone-200 shadow-sm bg-stone-100">
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
                  className="absolute top-1 right-1 p-1.5 bg-rose-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90 backdrop-blur-sm"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {galleryUrls.length === 0 && (
              <div className="col-span-full py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">No hay imágenes adicionales</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha */}
      <div className="w-full lg:w-[480px] flex flex-col gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200 space-y-8 h-full">
          
          <div className="flex items-center gap-3 pb-2 border-b border-stone-100">
             <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                {productType === 'ave' ? <Box size={20} /> : <Package size={20} />}
             </div>
             <div>
                <h4 className="text-lg font-black text-stone-800 tracking-tight">Detalles del Producto</h4>
                <p className="text-xs text-stone-400 font-medium">Información para el catálogo de venta.</p>
             </div>
          </div>
          
          {/* 1. TIPO */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Tipo de Producto</label>
            <div className="grid grid-cols-2 gap-3">
               <button 
                 type="button"
                 onClick={() => setProductType('ave')}
                 className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest
                    ${productType === 'ave' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-300'}
                 `}
               >
                 <Box size={18} />
                 Ave
               </button>
               <button 
                 type="button"
                 onClick={() => setProductType('articulo')}
                 className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest
                    ${productType === 'articulo' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-300'}
                 `}
               >
                 <Package size={18} />
                 Artículo
               </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* 2. NOMBRE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Nombre del Producto *</label>
              <input 
                type="text" 
                required
                placeholder={productType === 'ave' ? "Ej. Semental Colorado..." : "Ej. Sombrero de Gala..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            {/* 3. ATRIBUTOS TANGIBLES (Anillo / Stock) */}
            <div className="space-y-2">
                {productType === 'ave' ? (
                  <>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">No. Anillo *</label>
                    <input 
                        type="text" 
                        required
                        placeholder="Ej. AB-123"
                        value={ringNumber}
                        onChange={(e) => setRingNumber(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Stock *</label>
                    <input 
                        type="number" 
                        required
                        placeholder="Cantidad en inventario"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </>
                )}
            </div>

            {/* 4. TAXONOMÍA BIOLÓGICA (Solo Aves) */}
            {productType === 'ave' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                 <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Edad / Etapa</label>
                  <div className="relative">
                    <select 
                      value={age}
                      onChange={(e) => setAge(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    >
                      <option value="gallina">Gallina</option>
                      <option value="gallo">Gallo</option>
                      <option value="polla">Polla</option>
                      <option value="pollo">Pollo</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Propósito</label>
                  <div className="relative">
                    <select 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    >
                      <option value="combate">Combate</option>
                      <option value="cria">Cría</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DATOS FINANCIEROS/COMERCIALES */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Precio *</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            required
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-brand-500">
                            <DollarSign size={18} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Estado de Venta</label>
                    <div className="relative">
                        <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        >
                        <option value="available">Disponible</option>
                        <option value="reserved">Reservado</option>
                        <option value="sold">Vendido</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                        <ChevronDown size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. DESCRIPCIÓN */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Descripción</label>
              <textarea 
                rows={4}
                placeholder="Detalles adicionales, genética, materiales..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
              />
            </div>

            <button type="submit" className="hidden" disabled={!isFormValid || isSubmitting} />
            
            {/* Feedback Visual */}
            {isSubmitting && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2.5rem]">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                        <span className="text-sm font-bold text-brand-700">Guardando...</span>
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>
    </form>
  );
};
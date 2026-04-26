import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, MapPin, ImageIcon, Film, ChevronDown, PlayCircle, Loader2, Image as ImageIconLucide, Plus, Check } from 'lucide-react';
import { Media, Category, Subcategory } from '../../types';
import { apiGallery, apiCategories } from '../../api';

interface MediaFormProps {
  initialData?: Media;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const MediaForm: React.FC<MediaFormProps> = ({ initialData, onCancel, onSave, onValidationChange }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Estados del Formulario
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.categoryId?.toString() || '');
  const [subcategory, setSubcategory] = useState(initialData?.subcategoryId?.toString() || ''); 
  const [location, setLocation] = useState(initialData?.location || '');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.url || null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NUEVOS ESTADOS PARA MODAL CREACIÓN RÁPIDA ---
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isSavingSub, setIsSavingSub] = useState(false);

  const availableSubcategories = useMemo(() => {
    if (!category) return [];
    const selectedCat = categories.find(c => c.id.toString() === category);
    return selectedCat?.subcategorias || [];
  }, [category, categories]);

  useEffect(() => {
    if (category && initialData?.categoryId?.toString() !== category) {
        setSubcategory('');
    }
  }, [category]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await apiCategories.getAll();
      setCategories(data);
      if (!category && initialData) {
          if (initialData.categoryId) {
              setCategory(initialData.categoryId.toString());
          } else if (initialData.category) {
              const foundCat = data.find(c => c.name.toLowerCase() === initialData.category.toLowerCase());
              if (foundCat) setCategory(foundCat.id);
          }
      }
    } catch (error) {
      console.error("Error cargando categorías", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [initialData]);

  // --- LÓGICA DE CREACIÓN RÁPIDA DE SUBCATEGORÍA ---
  const handleQuickSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !category) return;
    setIsSavingSub(true);

    try {
      const selectedCat = categories.find(c => c.id.toString() === category);
      if (!selectedCat) return;

      const currentSubs = selectedCat.subcategorias ? selectedCat.subcategorias.map(s => s.nombre) : [];
      const updatedSubs = [...currentSubs, newSubName.trim()];

      // Actualizar en el servidor
      await apiCategories.update(selectedCat.id, {
        nombre: selectedCat.name,
        icono: selectedCat.icon,
        subcategorias: updatedSubs
      });

      // Recargar lista y auto-seleccionar la nueva (asumimos que la nueva es la última agregada, 
      // pero para estar seguros, la buscaremos por nombre en los datos frescos)
      const data = await apiCategories.getAll();
      setCategories(data);
      
      const refreshedCat = data.find(c => c.id === selectedCat.id);
      const newlyCreatedSub = refreshedCat?.subcategorias?.find(s => s.nombre.toLowerCase() === newSubName.trim().toLowerCase());
      
      if (newlyCreatedSub) {
        setSubcategory(newlyCreatedSub.id); // Auto-seleccionar
      }

      setIsSubModalOpen(false);
      setNewSubName('');
    } catch (error) {
      console.error("Error guardando subcategoría rápida:", error);
      alert("Hubo un error al crear la subcategoría.");
    } finally {
      setIsSavingSub(false);
    }
  };


  const isFormValid = (!!file || !!initialData?.url) && title.trim().length > 0 && category !== '' && !isProcessing;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const isVideo = useMemo(() => {
    if (file) return file.type.startsWith('video/');
    if (previewUrl && typeof previewUrl === 'string') {
       const lower = previewUrl.toLowerCase();
       if (initialData?.type === 'video') return true;
       return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
    }
    return false;
  }, [file, previewUrl, initialData]);

  const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 1; 

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setIsProcessing(true); 
      setTimeout(async () => {
        setFile(selectedFile);
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        if (selectedFile.type.startsWith('video/')) {
            try {
              const thumb = await generateVideoThumbnail(selectedFile);
              setVideoThumbnail(thumb);
            } catch (err) {
              console.error("Error generando miniatura", err);
            }
        } else {
            setVideoThumbnail(null);
        }
        setIsProcessing(false); 
      }, 600);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (initialData?.id) formData.append('id', initialData.id);
      formData.append('titulo', title);
      formData.append('descripcion', description);
      formData.append('categoria_id', category);
      if (subcategory) formData.append('subcategoria_id', subcategory); 
      formData.append('ubicacion', location);
      formData.append('tipo', file ? (isVideo ? 'video' : 'foto') : (initialData?.type === 'video' ? 'video' : 'foto'));
      
      if (!initialData?.id) {
         formData.append('fecha_media', new Date().toISOString().split('T')[0]);
      }

      if (file) {
        formData.append('archivo', file);
        if (videoThumbnail) {
            formData.append('video_thumbnail', videoThumbnail);
        }
      }

      if (initialData?.id) {
        await apiGallery.update(formData);
      } else {
        await apiGallery.create(formData);
      }

      onSave();

    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form id="media-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Columna Izquierda (Igual) */}
        <div className="flex-1 space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
              relative w-full aspect-square sm:aspect-video lg:aspect-square rounded-[2.5rem] 
              border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden
              ${!previewUrl 
                ? 'border-stone-200 bg-stone-50 hover:bg-white hover:border-brand-300 cursor-pointer group' 
                : 'border-transparent shadow-2xl shadow-stone-200 group'
              }
            `}
          >
            {!previewUrl ? (
              <div className="flex flex-col items-center p-10 text-center pointer-events-none">
                <div className="w-20 h-20 bg-white text-brand-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-stone-100 group-hover:scale-110 transition-transform duration-500">
                  <Upload size={32} />
                </div>
                <h3 className="text-xl font-black text-stone-800 tracking-tight mb-2">Subir Medio</h3>
                <p className="text-stone-400 text-sm font-medium max-w-[200px] mb-6">
                  Arrastra o selecciona fotos y videos para la galería.
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">JPG</span>
                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">PNG</span>
                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest border border-stone-200">MP4</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 w-full h-full group cursor-pointer">
                {isVideo ? (
                  <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-xl p-4 rounded-full border border-white/30 text-white mb-2">
                      <ImageIconLucide size={32} />
                  </div>
                  <span className="text-white font-bold tracking-wider text-xs uppercase">Cambiar archivo</span>
                </div>

                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="w-full lg:w-[480px] flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200 space-y-8 h-full">
            
            <div className="flex items-center gap-3 pb-2 border-b border-stone-100">
               <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  {isVideo ? <Film size={20} /> : <ImageIcon size={20} />}
               </div>
               <div>
                  <h4 className="text-lg font-black text-stone-800 tracking-tight">Detalles del Medio</h4>
                  <p className="text-xs text-stone-400 font-medium">Información para la galería pública.</p>
               </div>
            </div>

            <div className="space-y-6">
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Título *</label>
                  <input 
                  type="text" 
                  required
                  placeholder="Ej. Atardecer en los Agaves"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
              </div>

              {/* TAXONOMÍA (Categoría y Subcategoría) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Categoría *</label>
                      <div className="relative">
                          <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          disabled={isLoadingCategories}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50"
                          >
                          <option value="">Seleccionar...</option>
                          {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                          {isLoadingCategories ? <Loader2 size={18} className="animate-spin" /> : <ChevronDown size={18} />}
                          </div>
                      </div>
                  </div>

                  {/* NUEVA LÓGICA DE UX PARA SUBCATEGORÍA */}
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Subcategoría</label>
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <select 
                                  value={subcategory}
                                  onChange={(e) => setSubcategory(e.target.value)}
                                  disabled={!category || availableSubcategories.length === 0}
                                  className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50 disabled:text-stone-400"
                              >
                                  {availableSubcategories.length > 0 ? (
                                      <>
                                        <option value="">Ninguna</option>
                                        {availableSubcategories.map((sub) => (
                                            <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                        ))}
                                      </>
                                  ) : (
                                      <option value="">Sin subcategorías definidas</option>
                                  )}
                              </select>
                              {/* Icono animado indicando estado */}
                              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                                  {(!category || availableSubcategories.length === 0) ? <X size={16} className="opacity-50" /> : <ChevronDown size={18} />}
                              </div>
                          </div>
                          
                          {/* Botón de Atajo para Crear Subcategoría */}
                          <button 
                            type="button"
                            disabled={!category}
                            onClick={() => setIsSubModalOpen(true)}
                            title={!category ? "Selecciona una categoría primero" : "Añadir nueva subcategoría"}
                            className={`p-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center shrink-0 border
                                ${!category ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed' : 'bg-brand-50 hover:bg-brand-100 border-brand-100/50 text-brand-600'}
                            `}
                          >
                            <Plus size={20} strokeWidth={3} />
                          </button>
                      </div>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Ubicación (Opcional)</label>
                  <div className="relative">
                      <input 
                      type="text" 
                      placeholder="Ej. Sector Sur"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      />
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-brand-400">
                      <MapPin size={18} />
                      </div>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Descripción</label>
                  <textarea 
                  rows={4}
                  placeholder="Cuéntanos más sobre este medio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-medium placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                  />
              </div>
            </div>

            <button type="submit" className="hidden" disabled={!isFormValid || isSubmitting} />

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
      </form>

      {/* --- MODAL DE CREACIÓN RÁPIDA DE SUBCATEGORÍA --- */}
      {isSubModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsSubModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500">
            <div className="px-8 pt-8 pb-6 border-b border-stone-100 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">
                    Nueva Subcategoría
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-800 tracking-tight leading-none">
                    En {categories.find(c => c.id.toString() === category)?.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsSubModalOpen(false)}
                  className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleQuickSaveSubcategory} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                    Nombre de la Subcategoría *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej. Instalaciones, Equipo..."
                    value={newSubName}
                    autoFocus
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="flex-1 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-[0.98] border border-stone-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={!newSubName.trim() || isSavingSub}
                    className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2
                      ${!newSubName.trim() ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600'}
                    `}
                  >
                    {isSavingSub ? (
                      <span className="animate-pulse">Guardando...</span>
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} />
                        Crear y Seleccionar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};
import React, { useState, useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, MapPin, ImageIcon, Film, PlayCircle, Image as ImageIconLucide, Plus, Check, Save } from 'lucide-react';
import { Media, Category } from '../../types';
import { apiGallery, apiCategories, apiUpload } from '../../api';
import { NexusInput, NexusSelect, NexusTextarea } from '../ui/NexusInputs';
import { NexusSectionButton, NexusCardButton } from '../ui/NexusButton';
import { NexusSection } from '../ui/NexusSection';
import { NexusSpinner } from '../ui/NexusSpinner';

interface MediaFormProps {
  initialData?: Media;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const MediaForm = forwardRef<{ handleSave: () => void }, MediaFormProps>(
  ({ initialData, onCancel, onSave, onValidationChange }, ref) => {
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

    const [categories, setCategories] = useState<Category[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        handleSubmit();
      }
    }));

  // --- MODAL CREACIÓN RÁPIDA ---
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isSavingSub, setIsSavingSub] = useState(false);

  const availableSubcategories = useMemo(() => {
    if (!category) return [];
    const selectedCat = categories.find(c => c.id.toString() === category);
    return selectedCat?.subcategories || [];
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

  const handleQuickSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !category) return;
    setIsSavingSub(true);
    try {
      const selectedCat = categories.find(c => c.id.toString() === category);
      if (!selectedCat) return;
      const currentSubs = selectedCat.subcategories ? selectedCat.subcategories.map(s => s.name) : [];
      const updatedSubs = [...currentSubs, newSubName.trim()];
      await apiCategories.update(selectedCat.id, {
        name: selectedCat.name,
        icon: selectedCat.icon,
        subcategories: updatedSubs
      });
      const data = await apiCategories.getAll();
      setCategories(data);
      const refreshedCat = data.find(c => c.id === selectedCat.id);
      const newlyCreatedSub = refreshedCat?.subcategories?.find(s => s.name.toLowerCase() === newSubName.trim().toLowerCase());
      if (newlyCreatedSub) setSubcategory(newlyCreatedSub.id);
      setIsSubModalOpen(false);
      setNewSubName('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSub(false);
    }
  };

  const isFormValid = (!!file || !!initialData?.url) && title.trim().length > 0 && category !== '' && !isProcessing;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const isVideo = useMemo(() => {
    if (file) return file.type.startsWith('video/');
    if (previewUrl && typeof previewUrl === 'string') {
       const lower = previewUrl.toLowerCase();
       return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
    }
    return false;
  }, [file, previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setIsProcessing(true); 
      setTimeout(() => {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setIsProcessing(false); 
      }, 600);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalFilePath = initialData?.url || '';
      if (file) {
        const uploadRes = await apiUpload.upload(file);
        finalFilePath = uploadRes.url;
      }
      const mediaData = {
        title,
        description,
        categoryId: parseInt(category),
        subcategoryId: subcategory ? parseInt(subcategory) : undefined,
        location,
        type: isVideo ? 'VIDEO' : 'PHOTO',
        filePath: finalFilePath
      };
      if (initialData?.id) {
        await apiGallery.update(initialData.id, mediaData);
      } else {
        await apiGallery.create(mediaData);
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
      <form id="media-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row animate-in fade-in duration-700" style={{ gap: 'var(--space-lg)' }}>
        
        {/* COLUMN LEFT: MULTIMEDIA */}
        <div className="flex-1 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`relative w-full aspect-square sm:aspect-video lg:aspect-square border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden active:scale-[0.995] ${!previewUrl ? 'border-border-main bg-bg-muted hover:bg-bg-card hover:border-brand-300 cursor-pointer group' : 'border-transparent shadow-xl shadow-stone-200/40 group'}`}
            style={{ borderRadius: 'var(--radius-outer)' }}
          >
            {!previewUrl ? (
              <div className="flex flex-col items-center p-10 text-center pointer-events-none" style={{ gap: 'var(--space-md)' }}>
                <div 
                  className="w-20 h-20 bg-bg-card text-brand-500 flex items-center justify-center shadow-sm dark:shadow-none border border-border-main group-hover:scale-110 transition-transform duration-500"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <Upload size={32} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <h3 className="text-h1 text-text-main">Subir Medio</h3>
                  <p className="text-secondary text-text-muted max-w-[240px]">Arrastra o selecciona fotos y videos para la galería.</p>
                </div>
                <div className="flex" style={{ gap: 'var(--space-sm)' }}>
                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-label uppercase tracking-[0.15em] text-text-muted border border-border-main !text-[9px]">JPG</span>
                  <span className="px-3 py-1 bg-stone-100 rounded-lg text-label uppercase tracking-[0.15em] text-text-muted border border-border-main !text-[9px]">MP4</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 w-full h-full group cursor-pointer">
                {isVideo ? (
                  <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center" style={{ gap: 'var(--space-sm)' }}>
                  <div className="bg-bg-card/20 backdrop-blur-xl p-4 rounded-full border border-white/30 text-white mb-2 scale-90 group-hover:scale-100 transition-transform duration-500">
                      <ImageIconLucide size={32} />
                  </div>
                  <span className="text-white text-label uppercase tracking-[0.15em]">Cambiar archivo</span>
                </div>

                <NexusCardButton 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
               <div className="absolute inset-0 bg-bg-card/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-in fade-in duration-200">
                   <NexusSpinner label="Procesando archivo..." fullPage={false} />
               </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
          </div>
        </div>

        {/* COLUMN RIGHT: DETAILS */}
        <div className="w-full lg:w-[480px]">
          <NexusSection
            title="Detalles"
            subtitle="Información del medio"
            icon={isVideo ? Film : ImageIcon}
            iconVariant="brand"
            className="h-full"
          >
            <div className="flex flex-col relative" style={{ gap: 'var(--space-lg)' }}>
              <NexusInput 
                label="Título *" 
                placeholder="Ej. Atardecer en los Agaves"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <NexusSelect 
                  label="Categoría *"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </NexusSelect>

                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label uppercase tracking-[0.15em] text-text-muted ml-1">Subcategoría</label>
                  <div className="flex" style={{ gap: 'var(--space-sm)' }}>
                    <NexusSelect 
                      label="" // Hidden label since we use the one above
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      disabled={!category || availableSubcategories.length === 0}
                      className="flex-1"
                    >
                      {availableSubcategories.length > 0 ? (
                        <>
                          <option value="">Ninguna</option>
                          {availableSubcategories.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </>
                      ) : (
                        <option value="">Sin definir</option>
                      )}
                    </NexusSelect>
                    <NexusCardButton 
                      type="button"
                      variant="secondary"
                      onClick={() => setIsSubModalOpen(true)}
                      disabled={!category}
                      isIconOnly
                      icon={Plus}
                      className="h-[var(--h-input)] w-[var(--h-input)]"
                    />
                  </div>
                </div>
              </div>

              <NexusInput 
                label="Ubicación (Opcional)"
                placeholder="Ej. Sector Sur"
                icon={MapPin}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <NexusTextarea 
                label="Descripción"
                placeholder="Cuéntanos más sobre este medio..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              {isSubmitting && (
                <div className="absolute inset-0 bg-bg-card/60 backdrop-blur-md z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center bg-bg-card p-10 border border-border-main shadow-2xl animate-in zoom-in duration-500" style={{ borderRadius: 'var(--radius-outer)', gap: 'var(--space-md)' }}>
                        <NexusSpinner label="Guardando..." fullPage={false} />
                    </div>
                </div>
              )}
            </div>
          </NexusSection>
        </div>
      </form>

      {/* --- MODAL DE CREACIÓN RÁPIDA --- */}
      {isSubModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsSubModalOpen(false)} />
          <div 
            className="relative w-full max-w-lg bg-bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500"
            style={{ borderRadius: 'var(--radius-outer)' }}
          >
            <div className="px-8 pt-8 pb-6 border-b border-border-main shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label font-black text-brand-500 uppercase tracking-widest">
                    Nueva Subcategoría
                  </span>
                  <h3 className="text-h1 text-text-main">
                    En {categories.find(c => c.id.toString() === category)?.name}
                  </h3>
                </div>
                <NexusCardButton variant="ghost" size="icon" onClick={() => setIsSubModalOpen(false)} icon={X} />
              </div>
            </div>

            <div className="flex-1 p-8">
              <form onSubmit={handleQuickSaveSubcategory} className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
                <NexusInput 
                  label="Nombre de la Subcategoría *"
                  placeholder="Ej. Instalaciones, Equipo..."
                  value={newSubName}
                  autoFocus
                  onChange={(e) => setNewSubName(e.target.value)}
                />

                <div className="flex gap-4 pt-4">
                  <NexusSectionButton 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setIsSubModalOpen(false)} 
                    className="flex-1"
                  >
                    Cancelar
                  </NexusSectionButton>
                  <NexusSectionButton 
                    type="submit" 
                    disabled={!newSubName.trim() || isSavingSub}
                    isLoading={isSavingSub}
                    className="flex-[2]"
                    variant="brand"
                    icon={Check}
                  >
                    Crear y Seleccionar
                  </NexusSectionButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};

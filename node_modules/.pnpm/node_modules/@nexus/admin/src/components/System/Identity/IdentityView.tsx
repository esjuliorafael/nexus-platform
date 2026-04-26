import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { apiSystem, ASSET_BASE_URL } from '../../../api';

export interface IdentityViewRef {
  handleSave: () => void;
  handleCancel: () => void;
}

interface IdentityViewProps {
  status: 'empty' | 'preview' | 'editing';
  setStatus: (status: 'empty' | 'preview' | 'editing') => void;
  onTempLogoChange: (hasTemp: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const IdentityView = forwardRef<IdentityViewRef, IdentityViewProps>(
  ({ status, setStatus, onTempLogoChange, showToast }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const [currentLogo, setCurrentLogo] = useState<string | null>(null);
    const [tempLogoUrl, setTempLogoUrl] = useState<string | null>(null);
    const [tempFile, setTempFile] = useState<File | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadCurrentLogo = async () => {
      setIsLoading(true);
      try {
        const config = await apiSystem.getConfig();
        if (config['sistema_logo']) {
          setCurrentLogo(`${ASSET_BASE_URL}${config['sistema_logo']}?t=${new Date().getTime()}`);
          setStatus('preview');
        } else {
          setStatus('empty');
        }
      } catch (error) {
        console.error("Error al cargar logo:", error);
        showToast('No se pudo cargar el logo del sistema', 'error');
        setStatus('empty');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadCurrentLogo();
    }, []);

    useEffect(() => {
      onTempLogoChange(!!tempFile);
    }, [tempFile, onTempLogoChange]);

    useImperativeHandle(ref, () => ({
      handleSave: async () => {
        if (tempFile) {
          setIsUploading(true);
          try {
            const response = await apiSystem.updateLogo(tempFile);
            setCurrentLogo(`${ASSET_BASE_URL}${response.path}?t=${new Date().getTime()}`);
            setStatus('preview');
            setTempFile(null);
            setTempLogoUrl(null);
            showToast('Logo actualizado correctamente', 'success');
            window.dispatchEvent(new Event('logoUpdated'));
          } catch (error) {
            showToast('Error al guardar el logo', 'error');
          } finally {
            setIsUploading(false);
          }
        }
      },
      handleCancel: () => {
        setStatus(currentLogo ? 'preview' : 'empty');
        setTempFile(null);
        setTempLogoUrl(null);
      }
    }));

    const handleFileSelect = (file: File) => {
      if (file && (file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/jpeg' || file.type === 'image/webp')) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('La imagen es muy pesada. El límite es 2MB.', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setTempLogoUrl(e.target?.result as string);
          setTempFile(file);
        };
        reader.readAsDataURL(file);
      } else {
        showToast('Por favor, selecciona un formato válido (PNG, JPG, SVG, WEBP).', 'error');
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando identidad visual...</p>
        </div>
      );
    }

    return (
      <div className="relative w-full bg-white border border-stone-200 rounded-[2.5rem] shadow-sm p-6 sm:p-12 transition-all duration-300 min-h-[420px] flex flex-col justify-center">
        
        {isUploading && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2.5rem]">
                 <div className="flex flex-col items-center gap-2">
                     <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                     <span className="text-sm font-bold text-brand-700">Subiendo logo...</span>
                 </div>
             </div>
        )}

        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-24 h-24 bg-stone-50 border border-stone-200 rounded-[2rem] flex items-center justify-center text-stone-300 mb-6">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">No hay ningún logo cargado.</h3>
            <p className="text-stone-500">Haz clic en 'Subir logo' arriba para comenzar.</p>
          </div>
        )}

        {status === 'preview' && currentLogo && (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-stone-50 py-16 px-8 rounded-[2rem] w-full flex items-center justify-center mb-8 border border-stone-200">
              <img 
                src={currentLogo} 
                alt="Logo actual del sistema" 
                className="max-h-[180px] sm:max-h-[220px] w-auto object-contain drop-shadow-sm transition-all duration-300"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-stone-400 font-medium">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-stone-300"/> Formato optimizado</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-stone-300"/> Tamaño optimizado</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400"/> Activo en Sistema</span>
            </div>
          </div>
        )}

        {status === 'editing' && (
          <div className="h-full flex flex-col justify-center w-full">
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-stone-200 rounded-[2rem] p-10 sm:p-16 text-center cursor-pointer hover:bg-brand-50/20 hover:border-brand-300 transition-colors w-full flex flex-col items-center justify-center min-h-[320px] group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/svg+xml, image/jpeg, image/webp" 
                onChange={(e) => {
                  if(e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              
              {tempLogoUrl ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-200 mb-6 relative group-hover:shadow-md transition-all">
                    <img src={tempLogoUrl} alt="Vista previa del nuevo logo" className="max-h-[180px] object-contain" />
                    <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem] backdrop-blur-[1px]">
                      <span className="bg-stone-800 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl">
                        <RefreshCw size={14} /> Cambiar imagen
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-stone-500">Vista previa generada. Recuerda guardar los cambios.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white shadow-sm border border-stone-200 rounded-full flex items-center justify-center text-stone-400 mb-6 group-hover:scale-110 group-hover:text-stone-600 transition-all">
                    <Upload size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-xl font-bold text-stone-700 mb-2">Haz clic o arrastra una imagen aquí</h4>
                  <p className="text-sm font-medium text-stone-400 mt-2 bg-white px-4 py-1.5 rounded-full border border-stone-200 shadow-sm">
                    Recomendado: PNG o SVG con fondo transparente. Max 2MB.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
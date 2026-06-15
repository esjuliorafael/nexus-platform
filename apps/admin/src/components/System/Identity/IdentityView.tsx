import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, Loader2, Palette, ShieldCheck, CheckCircle2, PlusCircle } from 'lucide-react';
import { apiSystem, apiUpload } from '../../../api';
import { NexusSection } from '../../ui/NexusSection';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { EmptyState } from '../../ui/EmptyState';
import { InteractionStage } from '../../ui/InteractionStage';

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
        if (config['branding_logo_url']) {
          setCurrentLogo(config['branding_logo_url']);
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
            // Fase 1: Subir a Cloudflare R2
            const uploadRes = await apiUpload.upload(tempFile);
            const finalUrl = uploadRes.url;

            // Fase 2: Guardar URL en la configuración
            await apiSystem.updateLogo(finalUrl);
            
            setCurrentLogo(finalUrl);
            setStatus('preview');
            setTempFile(null);
            setTempLogoUrl(null);
            showToast('Logo actualizado correctamente', 'success');
            window.dispatchEvent(new Event('logoUpdated'));
          } catch (error) {
            console.error(error);
            showToast('Error al guardar el logo. Verifica Cloudflare R2.', 'error');
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
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
           </div>
           <p className="text-label text-text-muted">Consultando Identidad...</p>
        </div>
      );
    }

    const handleTriggerFile = () => {
      setStatus('editing');
      setTimeout(() => fileInputRef.current?.click(), 100);
    };

    return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-300">
        
        <NexusHero
          title={status === 'preview' ? 'Identidad Visual' : 'Personalizar Marca'}
          subtitle={status === 'preview' ? 'Gestión de activos de marca globales' : 'Actualiza la imagen de tu plataforma'}
          icon={Palette}
          variant="dark"
          badge={status === 'preview' ? "Logo Activo" : "Esperando Logo"}
          badgeValue={status === 'preview' ? "Desplegado" : "Pendiente"}
        />

        <NexusSection
          title="Branding Global"
          subtitle="Logo Principal del Sistema"
          icon={ImageIcon}
          delay="200ms"
          action={(status === 'preview' || status === 'empty' || (status === 'editing' && !!tempFile)) ? (
            <NexusSectionButton 
              onClick={handleTriggerFile} 
              icon={status === 'empty' ? PlusCircle : RefreshCw} 
              variant="brand"
            >
              {status === 'empty' ? 'Subir Logo' : 'Cambiar Logo'}
            </NexusSectionButton>
          ) : null}
        >
          <div 
            className="transition-all duration-700 animate-in fade-in min-h-[380px] flex flex-col justify-center overflow-hidden relative"
          >
            {/* Input oculto pero accesible vía ref */}
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

            {isUploading && (
              <div className="absolute inset-0 bg-bg-card/60 backdrop-blur-sm z-50 flex items-center justify-center" style={{ borderRadius: 'var(--radius-inner-visual)' }}>
                 <div className="flex flex-col items-center gap-2">
                    <div className="relative w-12 h-12 mb-4">
                        <div className="absolute inset-0 border-4 border-brand-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-label uppercase tracking-widest text-brand-700">Subiendo activos...</span>
                 </div>
              </div>
            )}

            {status === 'empty' && (
              <EmptyState 
                icon={ImageIcon} 
                title="Sin Identidad Visual" 
                description="Haz clic debajo para cargar el logotipo oficial de tu rancho y personalizar tu panel." 
                action={
                  <NexusSectionButton onClick={handleTriggerFile} icon={PlusCircle}>
                    Subir Logo
                  </NexusSectionButton>
                }
              />
            )}

            {status === 'preview' && currentLogo && (
              <div className="flex flex-col items-center justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div 
                  className="group/logo-stage bg-bg-muted py-16 px-8 w-full flex items-center justify-center mb-10 border border-border-main/50 relative cursor-pointer overflow-hidden transition-colors hover:bg-bg-muted/80"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                  onClick={handleTriggerFile}
                >
                  <img 
                    src={currentLogo} 
                    alt="Logo actual del sistema" 
                    className="max-h-[180px] sm:max-h-[220px] w-auto object-contain drop-shadow-sm transition-all duration-500 group-hover/logo-stage:scale-105"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100/50">
                      <ShieldCheck size={20} />
                    </div>
                    <p className="text-secondary font-medium">Formato Válido</p>
                    <p className="text-label text-text-muted">PNG / SVG optimizado</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100/50">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-secondary font-medium">Distribución</p>
                    <p className="text-label text-text-muted">Global en el panel</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100/50">
                      <RefreshCw size={20} />
                    </div>
                    <p className="text-secondary font-medium">Cloud Proxy</p>
                    <p className="text-label text-text-muted">Edge Delivery</p>
                  </div>
                </div>
              </div>
            )}

            {status === 'editing' && (
              <div className="h-full flex flex-col justify-center w-full animate-in fade-in zoom-in-95 duration-500">
                {tempLogoUrl ? (
                  <div className="flex flex-col items-center animate-in fade-in scale-in duration-300">
                    <div 
                      className="group/logo-preview bg-bg-card p-8 border border-border-main mb-6 relative group-hover:shadow-2xl transition-all duration-500 cursor-pointer"
                      style={{ borderRadius: 'var(--radius-inner-visual)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <img src={tempLogoUrl} alt="Vista previa del nuevo logo" className="max-h-[180px] object-contain transition-transform group-hover/logo-preview:scale-105 duration-500" />
                    </div>
                    <p className="text-secondary font-medium text-text-muted italic">Activo listo para procesar</p>
                  </div>
                ) : (
                  <InteractionStage 
                    icon={Upload}
                    title="Suelte el archivo aquí"
                    description="Formatos aceptados: PNG o SVG optimizados."
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    action={
                      <NexusSectionButton onClick={() => fileInputRef.current?.click()}>
                        Seleccionar Archivo
                      </NexusSectionButton>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </NexusSection>
      </div>
    );
  }
);
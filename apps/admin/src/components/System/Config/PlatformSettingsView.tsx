import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Server, Key, ShieldCheck, Globe, Cloud, HardDrive, ExternalLink, MessageCircle, Percent, CreditCard } from 'lucide-react';
import { apiSystem } from '../../../api';
import { NexusInput } from '../../ui/NexusInputs';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';

export interface PlatformSettingsViewRef {
  handleSave: () => void;
  handleSaveConfig: () => void;
}

interface PlatformSettingsProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const PlatformSettingsView = forwardRef<PlatformSettingsViewRef, PlatformSettingsProps>(
  ({ showToast }, ref) => {
    const [config, setConfig] = useState({
      evolutionUrl: '',
      evolutionKey: '',
      evolutionInstance: '',
      r2AccountId: '',
      r2AccessKey: '',
      r2SecretKey: '',
      r2BucketName: '',
      r2PublicDomain: '',
      mpFee: '0'
    });

    useEffect(() => {
      const loadConfig = async () => {
        try {
          const data = await apiSystem.getConfig();
          setConfig({
            evolutionUrl: data.whatsapp_evolution_url || '',
            evolutionKey: data.whatsapp_evolution_key || '',
            evolutionInstance: data.whatsapp_evolution_instance || '',
            r2AccountId: data.storage_r2_account_id || '',
            r2AccessKey: data.storage_r2_access_key || '',
            r2SecretKey: data.storage_r2_secret_key || '',
            r2BucketName: data.storage_r2_bucket_name || '',
            r2PublicDomain: data.storage_r2_public_domain || '',
            mpFee: data.mp_app_fee_percentage || data.mp_application_fee || '0'
          });
        } catch (error) {
          console.error("Error loading config:", error);
          showToast('Error al cargar la configuración', 'error');
        }
      };
      loadConfig();
    }, []);

    const handleSaveConfig = async () => {
      try {
        const payload = {
          whatsapp_evolution_url: config.evolutionUrl,
          whatsapp_evolution_key: config.evolutionKey,
          whatsapp_evolution_instance: config.evolutionInstance,
          storage_r2_account_id: config.r2AccountId,
          storage_r2_access_key: config.r2AccessKey,
          storage_r2_secret_key: config.r2SecretKey,
          storage_r2_bucket_name: config.r2BucketName,
          storage_r2_public_domain: config.r2PublicDomain,
          mp_app_fee_percentage: config.mpFee
        };
        await apiSystem.updateConfig(payload);
        showToast('Configuración global actualizada');
      } catch (error) {
        showToast('Error al guardar configuración', 'error');
      }
    };

    useImperativeHandle(ref, () => ({
      handleSave: handleSaveConfig,
      handleSaveConfig: handleSaveConfig
    }));

    return (
      <div key="platform-settings-content" className="space-y-8 pb-12 animate-in fade-in duration-300">
        
        <NexusHero
          title="Ajustes Globales"
          subtitle="Infraestructura"
          icon={ShieldCheck}
          variant="dark"
          badge="Impacto Inmediato"
          badgeValue="Todos los servicios"
        />

        {/* MERCADO PAGO MARKETPLACE SECTION */}
        <NexusSection
          title="Mercado Pago Marketplace"
          subtitle="Comisiones de la plataforma"
          icon={CreditCard}
          iconVariant="blue"
          delay="200ms"
        >
          <div className="grid grid-cols-1 gap-y-12">
            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '100ms' }}>
              <NexusInput 
                label="Comisión de Plataforma (%)"
                type="number"
                value={config.mpFee} 
                onChange={(e) => setConfig({ ...config, mpFee: e.target.value })}
                placeholder="Ej. 3.00" 
                icon={Percent}
                helperText="Porcentaje que Nexus retiene por cada transacción procesada."
              />
            </div>
            <p className="text-secondary text-text-muted leading-relaxed">
              Las credenciales de Nexus Platform y la vinculación OAuth se administran de forma central y segura. Cada canal conserva únicamente su propia cuenta vinculada de Mercado Pago.
            </p>
          </div>
        </NexusSection>

        {/* EVOLUTION API SECTION */}
        <NexusSection
          title="Evolution API"
          subtitle="Motor de mensajería multi-instancia"
          icon={Globe}
          iconVariant="emerald"
          delay="400ms"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '100ms' }}>
              <NexusInput 
                label="Endpoint URL"
                value={config.evolutionUrl} 
                onChange={(e) => setConfig({ ...config, evolutionUrl: e.target.value })}
                placeholder="Ej. https://api.tu-servidor.com" 
                icon={Server}
                copyable
                helperText="URL base donde se encuentra hosteada la Evolution API."
              />
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '200ms' }}>
              <NexusInput 
                label="Global API Key"
                type="password" 
                value={config.evolutionKey} 
                onChange={(e) => setConfig({ ...config, evolutionKey: e.target.value })}
                placeholder="Tu API Key secreta" 
                icon={Key}
                copyable
                helperText="Llave maestra definida en la configuración del servidor."
              />
            </div>

            <div className="md:col-span-2 animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '300ms' }}>
              <NexusInput 
                label="Tenant Prefix (WhatsApp)"
                value={config.evolutionInstance.split('_')[0]} 
                onChange={(e) => setConfig({ ...config, evolutionInstance: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                placeholder="Ej. manzana" 
                icon={MessageCircle}
                copyable
                helperText="Nombre raíz de tu marca. El sistema gestionará automáticamente las instancias técnicas (_main, _combat, etc.) usando este prefijo."
              />
            </div>
          </div>
        </NexusSection>

        {/* CLOUDFLARE R2 SECTION */}
        <NexusSection
          title="Cloud Storage (R2/S3)"
          subtitle="Almacenamiento de Medios y Galería"
          icon={Cloud}
          iconVariant="brand"
          delay="600ms"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '100ms' }}>
              <NexusInput 
                label="Account ID"
                value={config.r2AccountId} 
                onChange={(e) => setConfig({ ...config, r2AccountId: e.target.value })}
                placeholder="Cloudflare Account ID" 
                icon={ShieldCheck}
                copyable
              />
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '200ms' }}>
              <NexusInput 
                label="Bucket Name"
                value={config.r2BucketName} 
                onChange={(e) => setConfig({ ...config, r2BucketName: e.target.value })}
                placeholder="ej. nexus-assets" 
                icon={HardDrive}
                copyable
              />
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '300ms' }}>
              <NexusInput 
                label="Access Key ID"
                value={config.r2AccessKey} 
                onChange={(e) => setConfig({ ...config, r2AccessKey: e.target.value })}
                placeholder="S3 Access Key" 
                icon={Key}
                copyable
              />
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '400ms' }}>
              <NexusInput 
                label="Secret Access Key"
                type="password" 
                value={config.r2SecretKey} 
                onChange={(e) => setConfig({ ...config, r2SecretKey: e.target.value })}
                placeholder="S3 Secret Key" 
                icon={Key}
                copyable
              />
            </div>

            <div className="md:col-span-2 animate-in fade-in zoom-in-95 duration-300 [animation-fill-mode:both]" style={{ animationDelay: '500ms' }}>
              <NexusInput 
                label="Public Domain URL"
                value={config.r2PublicDomain} 
                onChange={(e) => setConfig({ ...config, r2PublicDomain: e.target.value })}
                placeholder="https://pub-xxxx.r2.dev" 
                icon={ExternalLink}
                copyable
                helperText="URL pública para servir los archivos (Configurada en Cloudflare R2)."
              />
            </div>
          </div>
        </NexusSection>

        <div className="bg-bg-muted rounded-[3rem] p-8 sm:p-10 border border-dashed border-border-main animate-in fade-in delay-[300ms] duration-300 [animation-fill-mode:both]">
          <div className="flex gap-4">
             <div className="text-text-muted shrink-0 mt-0.5"><ExternalLink size={16} /></div>
             <p className="text-secondary text-text-muted leading-relaxed">
              <span className="text-label text-text-main block mb-1">Nota de Seguridad</span>
              Los cambios realizados en esta sección se aplican inmediatamente a todos los servicios centrales. Asegúrate de que las credenciales sean correctas antes de guardar para evitar interrupciones en el servicio.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

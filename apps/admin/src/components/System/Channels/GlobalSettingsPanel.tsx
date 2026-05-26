import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  User, 
  CreditCard, 
  Hash, 
  CheckCircle2, 
  Zap,
  ShieldCheck,
  Link as LinkIcon
} from 'lucide-react';
import { apiSystem } from '../../../api';
import { NexusInput } from '../../ui/NexusInputs';
import { NexusButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';

interface GlobalSettingsPanelProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({ showToast }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>({});
  const [isConnectingMP, setIsConnectingMP] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await apiSystem.getConfig();
        setConfig(data);
      } catch (error) {
        showToast('Error al cargar configuración global', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiSystem.updateConfig(config);
      showToast('Configuración global guardada correctamente', 'success');
    } catch (error) {
      showToast('Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectMP = async () => {
    setIsConnectingMP(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mp/auth-url`);
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      showToast('Error al conectar con Mercado Pago', 'error');
    } finally {
      setIsConnectingMP(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-12 mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 [animation-fill-mode:both]">
      <NexusSection
        title="Canal Principal"
        subtitle="Fallback bancario y pasarela principal para flujos sin canal especializado"
        icon={ShieldCheck}
        iconVariant="muted"
        action={
          <NexusButton onClick={handleSave} isLoading={isSaving} size="sm" icon={Zap}>
            Guardar Cambios
          </NexusButton>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Identidad Bancaria */}
          <div className="space-y-8">
            <h4 className="text-label text-text-muted ml-1">Informacion bancaria principal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NexusInput label="Banco" name="bank_main_name" value={config['bank_main_name'] || ''} onChange={handleChange} icon={Building2} placeholder="Ej. BBVA" />
              <NexusInput label="Beneficiario" name="bank_main_beneficiary" value={config['bank_main_beneficiary'] || ''} onChange={handleChange} icon={User} placeholder="Nombre completo" />
              <NexusInput label="CLABE" name="bank_main_clabe" value={config['bank_main_clabe'] || ''} onChange={handleChange} icon={Hash} placeholder="18 dígitos" />
              <NexusInput label="No. Tarjeta" name="bank_main_card" value={config['bank_main_card'] || ''} onChange={handleChange} icon={CreditCard} placeholder="16 dígitos" />
            </div>
          </div>

          {/* Mercado Pago Principal */}
          <div className="space-y-8">
            <h4 className="text-label text-text-muted ml-1">Pasarela principal</h4>
            <div className="flex flex-col gap-6">
              <NexusInput 
                label="Identidad en Extracto" 
                name="mp_statement_descriptor"
                value={config['mp_statement_descriptor'] || ''} 
                onChange={(e) => setConfig({ ...config, [e.target.name]: e.target.value.substring(0, 16).toUpperCase() })} 
                placeholder="Ej. NEXUS*SHOP" 
                icon={CreditCard}
                helperText="Máximo 16 caracteres para evitar rechazos."
              />
              
              <div className="bg-bg-muted border border-border-main p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="relative z-10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${config['mp_seller_access_token'] ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-400'}`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-secondary font-black text-text-main">Mercado Pago Principal</p>
                      <p className="text-label text-text-muted">{config['mp_seller_access_token'] ? 'Cuenta Vinculada' : 'Pendiente de Vincular'}</p>
                    </div>
                  </div>
                  {!config['mp_seller_access_token'] && (
                    <NexusButton size="sm" onClick={handleConnectMP} isLoading={isConnectingMP} icon={LinkIcon}>Vincular</NexusButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </NexusSection>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Layers, Save, X, Calendar, 
  Hash, Image as ImageIcon, Layout,
  Loader2, DollarSign, Info, AlertTriangle,
  Trash2, Check
} from 'lucide-react';
import { Raffle } from '../../types';
import { apiRaffles, apiUpload } from '../../api';
import { NexusInput, NexusTextarea, NexusSelect } from '../ui/NexusInputs';
import { NexusSectionButton } from '../ui/NexusButton';

interface RaffleFormProps {
  initialData?: Raffle;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const RaffleForm: React.FC<RaffleFormProps> = ({ 
  initialData, 
  onCancel, 
  onSave, 
  onValidationChange,
  showToast
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasActiveSales = !!initialData && 
    ((initialData.ticketStats?.paid ?? 0) > 0 || 
     (initialData.ticketStats?.pending ?? 0) > 0);
  
  // Section 1: Type
  const [raffleType, setRaffleType] = useState<'SIMPLE' | 'OPPORTUNITIES'>(
    initialData && initialData.opportunities > 1 ? 'OPPORTUNITIES' : 'SIMPLE'
  );

  // Section 2: Universe
  const [ticketQuantity, setTicketQuantity] = useState(initialData?.ticketQuantity?.toString() || '');
  const [opportunities, setOpportunities] = useState(initialData?.opportunities?.toString() || '1');
  const [distribution, setDistribution] = useState<'LINEAR' | 'RANDOM'>(initialData?.distribution || 'LINEAR');

  // Section 3: Details
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ticketPrice, setTicketPrice] = useState(initialData?.ticketPrice?.toString() || '');
  const [drawDate, setDrawDate] = useState(initialData?.drawDate ? new Date(initialData.drawDate).toISOString().split('T')[0] : '');
  const [imageUrl, setImageUrl] = useState(initialData?.image || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Raffle['status']>(initialData?.status || 'ACTIVE');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Universe Calculation Logic
  const universePreview = useMemo(() => {
    const qty = parseInt(ticketQuantity) || 0;
    const opps = raffleType === 'SIMPLE' ? 1 : (parseInt(opportunities) || 0);
    const universo = qty * opps;
    
    if (universo <= 0) return null;

    const isPowerOf10 = (() => {
      let n = universo;
      if (n < 10) return false;
      while (n % 10 === 0) n /= 10;
      return n === 1;
    })();

    const startFromZero = isPowerOf10;
    const digits = startFromZero ? Math.round(Math.log10(universo)) : String(universo).length;
    
    const pad = (n: number) => String(n).padStart(digits, '0');
    const rangeStart = pad(startFromZero ? 0 : 1);
    const rangeEnd = pad(startFromZero ? universo - 1 : universo);

    // Assignment Example
    let example = "";
    if (opps > 1 && qty > 0) {
        const ticketStart = 1; // tickets always start at 1 in OPPORTUNITIES
        const mainNum = pad(ticketStart);
        const extras: string[] = [];
        for (let k = 1; k < Math.min(opps, 4); k++) {
            extras.push(pad((ticketStart + k * qty) % universo));
        }
        example = `Boleto ${mainNum} → ${extras.join(', ')}${opps > 4 ? '...' : ''}`;
    }

    return { universo, startFromZero, digits, rangeStart, rangeEnd, example };
  }, [ticketQuantity, opportunities, raffleType]);

  // Validation by step
  const isStep1Valid = true; // Always valid since it has default
  const isStep2Valid = useMemo(() => {
    const qty = parseInt(ticketQuantity) || 0;
    const opps = raffleType === 'SIMPLE' ? 1 : (parseInt(opportunities) || 0);
    const universe = qty * opps;
    return qty > 0 && (raffleType === 'SIMPLE' || (opps >= 2 && universe > qty)) && universe <= 100000;
  }, [ticketQuantity, opportunities, raffleType]);

  const isStep3Valid = useMemo(() => {
    return title.trim() !== '' && parseFloat(ticketPrice) > 0;
  }, [title, ticketPrice]);

  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;

      // Fase 1: Subir a R2 si hay archivo nuevo
      if (imageFile) {
        const uploadRes = await apiUpload.upload(imageFile);
        finalImageUrl = uploadRes.url;
      }

      const payload: any = {
        title,
        description,
        ticketPrice: parseFloat(ticketPrice),
        ticketQuantity: parseInt(ticketQuantity),
        opportunities: raffleType === 'SIMPLE' ? 1 : parseInt(opportunities),
        distribution,
        drawDate: drawDate ? new Date(drawDate).toISOString() : null,
        image: finalImageUrl,
        status
      };

      if (initialData?.id) {
        await apiRaffles.update(initialData.id, payload);
      } else {
        await apiRaffles.create(payload);
      }
      onSave();
    } catch (error) {
      console.error(error);
      showToast('Error al procesar archivos o guardar la rifa. Verifica Cloudflare R2.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Estructura', icon: Layout },
    { id: 2, name: 'Universo', icon: Hash },
    { id: 3, name: 'Escaparate', icon: Ticket }
  ];

  return (
    <form id="raffle-form" onSubmit={handleSubmit} className="pb-32 relative">
      
      {/* STEPPER INDICATOR */}
      <div className="flex items-center justify-between mb-8 md:mb-12 px-2 max-w-xl mx-auto">
         {steps.map((step, idx) => (
           <React.Fragment key={step.id}>
             <button
               type="button"
               disabled={step.id > 1 && !isStep1Valid}
               onClick={() => {
                 if (step.id === 1) setCurrentStep(1);
                 if (step.id === 2 && isStep1Valid) setCurrentStep(2);
                 if (step.id === 3 && isStep1Valid && isStep2Valid) setCurrentStep(3);
               }}
               className={`flex flex-col items-center gap-2 md:gap-3 transition-all duration-300 ${currentStep === step.id ? 'opacity-100 scale-105 md:scale-110' : 'opacity-40 hover:opacity-60 scale-100'}`}
             >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${currentStep === step.id ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-stone-100 text-stone-400'}`}>
                   <step.icon size={18} className="md:w-5 md:h-5" />
                </div>
                <span className={`hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] ${currentStep === step.id ? 'text-text-main' : 'text-stone-400'}`}>
                   {step.name}
                </span>
             </button>
             {idx < steps.length - 1 && (
               <div className="flex-1 h-[2px] mx-2 md:mx-4 bg-stone-100 mb-0 sm:mb-8 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                    style={{ width: currentStep > step.id ? '100%' : '0%' }}
                  />
               </div>
             )}
           </React.Fragment>
         ))}
      </div>

      <div className="relative min-h-[400px]">
        {/* STEP 1: RAFFLE TYPE */}
        {currentStep === 1 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-2xl font-black tracking-tighter text-text-main">Estructura de la Rifa</h3>
              <p className="text-sm font-medium text-stone-400">Define cómo se distribuirán las oportunidades entre los boletos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button
                 type="button"
                 onClick={() => { setRaffleType('SIMPLE'); setOpportunities('1'); }}
                 className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] flex flex-col gap-4 ${raffleType === 'SIMPLE' ? 'bg-bg-card border-brand-500 shadow-2xl shadow-brand-500/10' : 'bg-bg-muted border-border-main hover:border-border-main hover:bg-bg-card'}`}
               >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${raffleType === 'SIMPLE' ? 'bg-brand-500 text-white rotate-0' : 'bg-stone-200 text-stone-400 group-hover:bg-stone-300 -rotate-3'}`}>
                    <Ticket size={28} />
                 </div>
                 <div>
                    <h4 className={`text-xl font-black tracking-tight ${raffleType === 'SIMPLE' ? 'text-text-main' : 'text-stone-400'}`}>Simple</h4>
                    <p className="text-sm font-bold text-stone-400/80">Un número por boleto</p>
                 </div>
                 <p className="text-xs font-medium text-text-muted/80 leading-relaxed max-w-[90%]">
                   Ideal para rifas rápidas y directas donde cada folio comprado representa una sola oportunidad.
                 </p>
                 <div className={`mt-auto pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${raffleType === 'SIMPLE' ? 'text-brand-600' : 'text-stone-300'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${raffleType === 'SIMPLE' ? 'bg-brand-500 animate-pulse' : 'bg-stone-200'}`} />
                    oportunidades = 1
                 </div>
               </button>

               <button
                 type="button"
                 onClick={() => setRaffleType('OPPORTUNITIES')}
                 className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] flex flex-col gap-4 ${raffleType === 'OPPORTUNITIES' ? 'bg-bg-card border-brand-500 shadow-2xl shadow-brand-500/10' : 'bg-bg-muted border-border-main hover:border-border-main hover:bg-bg-card'}`}
               >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${raffleType === 'OPPORTUNITIES' ? 'bg-brand-500 text-white rotate-0' : 'bg-stone-200 text-stone-400 group-hover:bg-stone-300 rotate-3'}`}>
                    <Layers size={28} />
                 </div>
                 <div>
                    <h4 className={`text-xl font-black tracking-tight ${raffleType === 'OPPORTUNITIES' ? 'text-text-main' : 'text-stone-400'}`}>Oportunidades</h4>
                    <p className="text-sm font-bold text-stone-400/80">Múltiples números por boleto</p>
                 </div>
                 <p className="text-xs font-medium text-text-muted/80 leading-relaxed max-w-[90%]">
                   Asigna varios números a un mismo comprador. Mayor emoción y probabilidad de ganar.
                 </p>
                 <div className={`mt-auto pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${raffleType === 'OPPORTUNITIES' ? 'text-brand-600' : 'text-stone-300'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${raffleType === 'OPPORTUNITIES' ? 'bg-brand-500 animate-pulse' : 'bg-stone-200'}`} />
                    oportunidades {'>'} 1
                 </div>
               </button>
            </div>
            <div className="flex justify-end pt-4">
               <NexusSectionButton
                 type="button"
                 onClick={() => setCurrentStep(2)}
                 className="px-12"
               >
                 Configurar Universo
               </NexusSectionButton>
            </div>
          </section>
        )}

        {/* STEP 2: UNIVERSE CONFIGURATION */}
        {currentStep === 2 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-2xl font-black tracking-tighter text-text-main">Configuración del Universo</h3>
              <p className="text-sm font-medium text-stone-400">Establece la cantidad total de números y cómo se generarán.</p>
            </div>
            
            <div className="bg-bg-card rounded-[2.5rem] p-6 md:p-10 border border-border-main/60 shadow-sm dark:shadow-none space-y-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  <NexusInput 
                    label="Número de Boletos (Folios)"
                    type="number"
                    inputMode="numeric"
                    required
                    disabled={!!initialData && hasActiveSales}
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(e.target.value)}
                    placeholder="Ej: 100"
                    helperText="Cantidad de personas diferentes que pueden comprar."
                  />

                  {raffleType === 'OPPORTUNITIES' && (
                    <>
                      <NexusInput 
                        label="Oportunidades por boleto"
                        type="number"
                        inputMode="numeric"
                        required
                        min="2"
                        disabled={!!initialData && hasActiveSales}
                        value={opportunities}
                        onChange={(e) => setOpportunities(e.target.value)}
                        placeholder="Mínimo 2"
                        helperText="Números asignados a cada comprador."
                      />

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-stone-400 tracking-[0.15em] ml-1">Distribución</label>
                        <div className="flex bg-stone-100/80 p-1 rounded-2xl h-14">
                           <button
                             type="button"
                             onClick={() => setDistribution('LINEAR')}
                             className={`flex-1 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.96] ${distribution === 'LINEAR' ? 'bg-bg-card text-brand-600 shadow-sm dark:shadow-none border border-border-main/20' : 'text-stone-400 hover:text-text-muted'}`}
                           >
                             Lineal
                           </button>
                           <button
                             type="button"
                             onClick={() => setDistribution('RANDOM')}
                             className={`flex-1 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.96] ${distribution === 'RANDOM' ? 'bg-bg-card text-brand-600 shadow-sm dark:shadow-none border border-border-main/20' : 'text-stone-400 hover:text-text-muted'}`}
                           >
                             Aleatoria
                           </button>
                        </div>
                      </div>
                    </>
                  )}
               </div>

               {/* UNIVERSE PREVIEW */}
               {universePreview && (
                  <div className="p-10 bg-[#0C0C0C] rounded-[2.5rem] text-white space-y-8 relative overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted flex items-center gap-3">
                        <div className="w-6 h-[1px] bg-stone-800" />
                        <Hash size={12} className="text-brand-400" /> Vista Previa del Sistema
                      </h4>
                      <div className="flex gap-2">
                        {universePreview.universo > 10000 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/5 text-amber-500 text-[9px] font-black uppercase border border-amber-500/10 tracking-wider">
                            <AlertTriangle size={10} /> Universo Grande
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                       <div className="space-y-2">
                          <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Universo Total</p>
                          <p className="text-4xl font-black tabular-nums tracking-tighter">{universePreview.universo.toLocaleString()}</p>
                       </div>
                       <div className="space-y-2 border-l border-white/5 pl-8">
                          <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Rango</p>
                          <p className="text-2xl font-black tabular-nums text-stone-200">{universePreview.rangeStart} – {universePreview.rangeEnd}</p>
                       </div>
                       <div className="space-y-2 border-l border-white/5 pl-8">
                          <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Cifras</p>
                          <p className="text-2xl font-black text-stone-200">{universePreview.digits}</p>
                       </div>
                       <div className="space-y-2 border-l border-white/5 pl-8">
                          <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Inicia en Cero</p>
                          <p className="text-2xl font-black uppercase text-brand-400">{universePreview.startFromZero ? 'SÍ' : 'NO'}</p>
                       </div>
                    </div>

                    {universePreview.example && (
                      <div className="pt-8 border-t border-white/5 space-y-3 relative z-10">
                         <p className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Ejemplo de Asignación</p>
                         <div className="bg-bg-card/[0.03] border border-white/5 p-5 rounded-2xl font-mono text-[11px] text-brand-400 tracking-tight leading-relaxed">
                            <span className="text-text-muted mr-2 opacity-50">$</span> {universePreview.example}
                         </div>
                      </div>
                    )}
                  </div>
               )}
            </div>
            <div className="flex justify-between pt-4">
               <NexusSectionButton
                 type="button"
                 variant="secondary"
                 onClick={() => setCurrentStep(1)}
                 className="px-10"
               >
                 Atrás
               </NexusSectionButton>
               <NexusSectionButton
                 type="button"
                 disabled={!isStep2Valid}
                 onClick={() => setCurrentStep(3)}
                 className="px-10"
               >
                 Siguiente Paso
               </NexusSectionButton>
            </div>
          </section>
        )}

        {/* STEP 3: RAFFLE DETAILS */}
        {currentStep === 3 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-2xl font-black tracking-tighter text-text-main">Escaparate de la Rifa</h3>
              <p className="text-sm font-medium text-stone-400">Personaliza cómo verán los compradores tu rifa.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 space-y-8">
                  <div className="bg-bg-card rounded-[2.5rem] p-6 md:p-10 border border-border-main/60 shadow-sm dark:shadow-none space-y-10">
                     <div className="space-y-8">
                        <NexusInput 
                          label="Título Público"
                          icon={Layout}
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ej: Gran Rifa Semental Hatch"
                        />

                        <NexusTextarea 
                          label="Descripción y Premios"
                          rows={6}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe el ejemplar, las bases del sorteo y los premios adicionales..."
                        />

                        <NexusInput 
                          label="Precio por Boleto"
                          icon={DollarSign}
                          type="number"
                          inputMode="decimal"
                          required
                          value={ticketPrice}
                          onChange={(e) => setTicketPrice(e.target.value)}
                          placeholder="0.00"
                          className="text-xl font-black"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="bg-bg-card rounded-[2.5rem] p-6 md:p-10 border border-border-main/60 shadow-sm dark:shadow-none space-y-8">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2 px-1">
                        <Calendar size={12} className="text-brand-500/50" /> Programación
                     </h4>
                     
                     <NexusInput 
                       label="Fecha del Sorteo"
                       icon={Calendar}
                       type="date"
                       value={drawDate}
                       onChange={(e) => setDrawDate(e.target.value)}
                     />

                     <NexusSelect 
                       label="Estatus Actual"
                       icon={Layers}
                       value={status}
                       onChange={(e) => setStatus(e.target.value as any)}
                     >
                        <option value="ACTIVE">Activa</option>
                        <option value="FINISHED">Finalizada</option>
                        <option value="CANCELLED">Cancelada</option>
                     </NexusSelect>
                  </div>

                  <div className="bg-bg-card rounded-[2.5rem] p-6 md:p-10 border border-border-main/60 shadow-sm dark:shadow-none space-y-8">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2">
                        <ImageIcon size={12} className="text-brand-500/50" /> Portada
                     </h4>
                     <div className="space-y-4">
                        <div 
                          onClick={() => !isProcessing && fileInputRef.current?.click()}
                          className="aspect-square rounded-[2rem] bg-bg-muted border-2 border-dashed border-border-main/60 overflow-hidden flex items-center justify-center group relative cursor-pointer hover:bg-bg-card hover:border-brand-500/40 transition-all duration-300 active:scale-[0.98]"
                        >
                           {imageUrl ? (
                             <>
                               <img src={imageUrl} className="w-full h-full object-cover" alt="Portada" />
                               <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                  <ImageIcon size={24} className="mb-2" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Cambiar</span>
                               </div>
                             </>
                           ) : (
                             <div className="flex flex-col items-center gap-3 text-stone-400 group-hover:text-brand-500 transition-colors">
                                <ImageIcon size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Subir Imagen</span>
                             </div>
                           )}
                        </div>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                     </div>
                  </div>
               </div>
            </div>
            <div className="flex justify-between pt-4">
               <NexusSectionButton
                 type="button"
                 variant="secondary"
                 onClick={() => setCurrentStep(2)}
                 className="px-10"
               >
                 Atrás
               </NexusSectionButton>
               <NexusSectionButton
                 type="submit"
                 isLoading={isSubmitting}
                 disabled={!isStep3Valid}
                 className="px-10"
               >
                 {initialData ? 'Actualizar Rifa' : 'Publicar Rifa'}
               </NexusSectionButton>
            </div>
          </section>
        )}
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-[4px] z-[300] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-bg-card p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 border border-border-main animate-in zoom-in-95 duration-300">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <span className="font-black text-text-main uppercase tracking-[0.2em] text-[10px]">Guardando Rifa...</span>
          </div>
        </div>
      )}
    </form>
  );
};

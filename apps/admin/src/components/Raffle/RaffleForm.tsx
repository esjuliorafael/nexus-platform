import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Layers, Save, X, Calendar, 
  Hash, Image as ImageIcon, Layout,
  Loader2, DollarSign, Info, AlertTriangle,
  Trash2, Check
} from 'lucide-react';
import { Raffle } from '../../types';
import { apiRaffles } from '../../api';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  const [status, setStatus] = useState<Raffle['status']>(initialData?.status || 'ACTIVE');

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
        const mainNum = pad(startFromZero ? 0 : 1);
        const extras: string[] = [];
        for (let k = 1; k < Math.min(opps, 4); k++) {
            extras.push(pad((startFromZero ? 0 : 1) + k * qty));
        }
        example = `Boleto ${mainNum} → ${extras.join(', ')}${opps > 4 ? '...' : ''}`;
    }

    return { universo, startFromZero, digits, rangeStart, rangeEnd, example };
  }, [ticketQuantity, opportunities, raffleType]);

  // Validation
  const isFormValid = useMemo(() => {
    const qty = parseInt(ticketQuantity) || 0;
    const opps = raffleType === 'SIMPLE' ? 1 : (parseInt(opportunities) || 0);
    const universe = qty * opps;

    return title.trim() !== '' && 
           parseFloat(ticketPrice) > 0 &&
           qty > 0 &&
           (raffleType === 'SIMPLE' || opps >= 2) &&
           universe > 0 &&
           universe <= 100000 &&
           (raffleType === 'SIMPLE' || universe > qty);
  }, [title, ticketPrice, ticketQuantity, opportunities, raffleType]);

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        ticketPrice: parseFloat(ticketPrice),
        ticketQuantity: parseInt(ticketQuantity),
        opportunities: raffleType === 'SIMPLE' ? 1 : parseInt(opportunities),
        distribution,
        drawDate: drawDate ? new Date(drawDate).toISOString() : null,
        image: imageUrl,
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
      showToast('Error al guardar la rifa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="raffle-form" onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 space-y-12">
      
      {/* SECTION 1: RAFFLE TYPE */}
      <section className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2 px-1">
          <Layout size={16} /> 1. Tipo de Rifa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <button
             type="button"
             onClick={() => { setRaffleType('SIMPLE'); setOpportunities('1'); }}
             className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex flex-col gap-4 group ${raffleType === 'SIMPLE' ? 'bg-white border-brand-500 shadow-xl shadow-brand-500/5' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}
           >
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${raffleType === 'SIMPLE' ? 'bg-brand-500 text-white' : 'bg-stone-200 text-stone-400 group-hover:bg-stone-300'}`}>
                <Ticket size={28} />
             </div>
             <div>
                <h4 className={`text-xl font-black ${raffleType === 'SIMPLE' ? 'text-stone-800' : 'text-stone-500'}`}>Simple</h4>
                <p className="text-sm font-bold text-stone-400">Un número por boleto</p>
             </div>
             <p className="text-xs font-medium text-stone-500 leading-relaxed">
               Ideal para rifas rápidas y directas donde cada folio comprado representa una sola oportunidad.
             </p>
             <div className={`mt-auto pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${raffleType === 'SIMPLE' ? 'text-brand-600' : 'text-stone-300'}`}>
                <Check size={14} strokeWidth={3} /> oportunidades = 1
             </div>
           </button>

           <button
             type="button"
             onClick={() => setRaffleType('OPPORTUNITIES')}
             className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex flex-col gap-4 group ${raffleType === 'OPPORTUNITIES' ? 'bg-white border-brand-500 shadow-xl shadow-brand-500/5' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}
           >
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${raffleType === 'OPPORTUNITIES' ? 'bg-brand-500 text-white' : 'bg-stone-200 text-stone-400 group-hover:bg-stone-300'}`}>
                <Layers size={28} />
             </div>
             <div>
                <h4 className={`text-xl font-black ${raffleType === 'OPPORTUNITIES' ? 'text-stone-800' : 'text-stone-500'}`}>Oportunidades</h4>
                <p className="text-sm font-bold text-stone-400">Múltiples números por boleto</p>
             </div>
             <p className="text-xs font-medium text-stone-500 leading-relaxed">
               Asigna varios números a un mismo comprador. Mayor emoción y probabilidad de ganar.
             </p>
             <div className={`mt-auto pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${raffleType === 'OPPORTUNITIES' ? 'text-brand-600' : 'text-stone-300'}`}>
                <Check size={14} strokeWidth={3} /> oportunidades {'>'} 1
             </div>
           </button>
        </div>
      </section>

      {/* SECTION 2: UNIVERSE CONFIGURATION */}
      <section className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2 px-1">
          <Hash size={16} /> 2. Configuración del Universo
        </h3>
        
        <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Número de Boletos (Folios)</label>
                 <input 
                   type="number"
                   required
                   value={ticketQuantity}
                   onChange={(e) => setTicketQuantity(e.target.value)}
                   className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                   placeholder="Ej: 100"
                 />
                 <p className="text-[10px] text-stone-400 font-medium italic">Cantidad de personas diferentes que pueden comprar.</p>
              </div>

              {raffleType === 'OPPORTUNITIES' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Oportunidades por boleto</label>
                    <input 
                      type="number"
                      required
                      min="2"
                      value={opportunities}
                      onChange={(e) => setOpportunities(e.target.value)}
                      className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                      placeholder="Mínimo 2"
                    />
                    <p className="text-[10px] text-stone-400 font-medium italic">Números asignados a cada comprador.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Distribución</label>
                    <div className="flex bg-stone-100 p-1 rounded-2xl h-14">
                       <button
                         type="button"
                         onClick={() => setDistribution('LINEAR')}
                         className={`flex-1 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${distribution === 'LINEAR' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                       >
                         Lineal
                       </button>
                       <button
                         type="button"
                         onClick={() => setDistribution('RANDOM')}
                         className={`flex-1 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${distribution === 'RANDOM' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                       >
                         Aleatoria
                       </button>
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium italic text-center">
                       {distribution === 'LINEAR' ? 'Predecible y verificable' : 'Opaca hasta publicar listas'}
                    </p>
                  </div>
                </>
              )}
           </div>

           {/* UNIVERSE PREVIEW */}
           {universePreview && (
              <div className="p-8 bg-stone-900 rounded-[2rem] text-white space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500 flex items-center gap-2">
                    <Hash size={14} className="text-brand-400" /> Vista Previa del Sistema
                  </h4>
                  
                  <div className="flex gap-2">
                    {universePreview.universo > 10000 && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase border border-amber-500/20">
                        <AlertTriangle size={12} /> Universo Grande
                      </span>
                    )}
                    {universePreview.universo > 100000 && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase border border-rose-500/20">
                        <AlertTriangle size={12} /> Límite Excedido
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Universo Total</p>
                      <p className="text-3xl font-black tabular-nums">{universePreview.universo.toLocaleString()}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Rango</p>
                      <p className="text-2xl font-black tabular-nums">{universePreview.rangeStart} – {universePreview.rangeEnd}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Cifras</p>
                      <p className="text-2xl font-black">{universePreview.digits}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Inicia en Cero</p>
                      <p className="text-2xl font-black uppercase">{universePreview.startFromZero ? 'SÍ' : 'NO'}</p>
                   </div>
                </div>

                {universePreview.example && (
                  <div className="pt-6 border-t border-white/5 space-y-2 relative z-10">
                     <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Ejemplo de Asignación</p>
                     <div className="bg-black/20 p-4 rounded-xl font-mono text-xs text-brand-400">
                        {universePreview.example}
                     </div>
                  </div>
                )}

                <div className="pt-2 flex items-start gap-3 relative z-10">
                   <Info size={16} className="text-stone-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                     El sistema calcula automáticamente las cifras y el punto de inicio para optimizar la visualización de los boletos. 
                     Si el total es potencia de 10 (ej. 1,000), el rango será 000-999.
                   </p>
                </div>
              </div>
           )}
        </div>
      </section>

      {/* SECTION 3: RAFFLE DETAILS */}
      <section className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-400 flex items-center gap-2 px-1">
          <Ticket size={16} /> 3. Detalles de la Rifa
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-8">
                 <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Título Público</label>
                      <input 
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                        placeholder="Ej: Gran Rifa Semental Hatch"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Descripción y Premios</label>
                      <textarea 
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 resize-none"
                        placeholder="Describe el ejemplar, las bases del sorteo y los premios adicionales..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Precio por Boleto</label>
                      <div className="relative">
                         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500">
                            <DollarSign size={20} />
                         </div>
                         <input 
                           type="number"
                           required
                           value={ticketPrice}
                           onChange={(e) => setTicketPrice(e.target.value)}
                           className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl pl-12 pr-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                           placeholder="0.00"
                         />
                      </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-6">
                 <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                    <Calendar size={14} /> Programación
                 </h4>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Fecha del Sorteo</label>
                    <input 
                      type="date"
                      value={drawDate}
                      onChange={(e) => setDrawDate(e.target.value)}
                      className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Estatus Actual</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 appearance-none"
                    >
                      <option value="ACTIVE">Activa</option>
                      <option value="FINISHED">Finalizada</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-6">
                 <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                    <ImageIcon size={14} /> Imagen de Portada
                 </h4>
                 <div className="space-y-4">
                    <div className="aspect-video rounded-3xl bg-stone-50 border-2 border-dashed border-stone-200 overflow-hidden flex items-center justify-center group relative">
                       {imageUrl ? (
                         <>
                           <img src={imageUrl} className="w-full h-full object-cover" alt="Portada" />
                           <button 
                             type="button"
                             onClick={() => setImageUrl('')}
                             className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <Trash2 size={14} />
                           </button>
                         </>
                       ) : (
                         <ImageIcon size={32} className="text-stone-200" />
                       )}
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">URL de la Imagen</label>
                       <input 
                         type="url"
                         value={imageUrl}
                         onChange={(e) => setImageUrl(e.target.value)}
                         placeholder="https://..."
                         className="w-full h-12 bg-stone-50 border border-stone-200 rounded-xl px-4 text-xs font-bold text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {isSubmitting && (
        <div className="fixed inset-0 bg-stone-900/10 backdrop-blur-[2px] z-[300] flex items-center justify-center">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-stone-100">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="font-black text-stone-800 uppercase tracking-widest text-xs">Guardando Rifa...</span>
          </div>
        </div>
      )}
    </form>
  );
};

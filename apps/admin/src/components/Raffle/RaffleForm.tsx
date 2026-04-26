import React, { useState, useEffect } from 'react';
import { 
  Ticket, Save, X, Info, Calendar, 
  Hash, Image as ImageIcon, Layout,
  RefreshCw, Loader2, DollarSign, List
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
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ticketPrice, setTicketPrice] = useState(initialData?.ticketPrice?.toString() || '');
  const [ticketQuantity, setTicketQuantity] = useState(initialData?.ticketQuantity?.toString() || '');
  const [opportunities, setOpportunities] = useState(initialData?.opportunities?.toString() || '1');
  const [digits, setDigits] = useState(initialData?.digits || 3);
  const [useZero, setUseZero] = useState(initialData?.useZero || false);
  const [distribution, setDistribution] = useState<'LINEAR' | 'RANDOM'>(initialData?.distribution || 'LINEAR');
  const [drawDate, setDrawDate] = useState(initialData?.drawDate ? new Date(initialData.drawDate).toISOString().split('T')[0] : '');
  const [imageUrl, setImageUrl] = useState(initialData?.image || '');
  const [status, setStatus] = useState<Raffle['status']>(initialData?.status || 'ACTIVE');

  const isFormValid = title.trim() !== '' && 
                      ticketPrice !== '' && 
                      parseFloat(ticketPrice) > 0 &&
                      ticketQuantity !== '' && 
                      parseInt(ticketQuantity) > 0;

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
        opportunities: parseInt(opportunities),
        digits: parseInt(digits as any),
        useZero,
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
    <form id="raffle-form" onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-8">
            
            <div className="space-y-6">
               <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                 <Ticket className="text-brand-500" size={24} /> Información General
               </h3>
               
               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Título de la Rifa</label>
                   <input 
                     required
                     value={title}
                     onChange={(e) => setTitle(e.target.value)}
                     className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                     placeholder="Ej: Sorteo Semental Asil"
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Descripción</label>
                   <textarea 
                     rows={4}
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                     placeholder="Detalles sobre el ejemplar, condiciones del sorteo, etc."
                   />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-stone-50">
               <div className="space-y-6">
                 <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                   <DollarSign className="text-brand-500" size={24} /> Precio y Cantidad
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Costo Boleto</label>
                     <input 
                       type="number"
                       required
                       value={ticketPrice}
                       onChange={(e) => setTicketPrice(e.target.value)}
                       className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                       placeholder="0.00"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Cant. Boletos</label>
                     <input 
                       type="number"
                       required
                       value={ticketQuantity}
                       onChange={(e) => setTicketQuantity(e.target.value)}
                       className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                       placeholder="100"
                     />
                   </div>
                 </div>
               </div>

               <div className="space-y-6">
                 <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                   <Layout className="text-brand-500" size={24} /> Formato
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Cifras (2-4)</label>
                     <select 
                       value={digits}
                       onChange={(e) => setDigits(parseInt(e.target.value))}
                       className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 appearance-none"
                     >
                       <option value={2}>2 Cifras (00-99)</option>
                       <option value={3}>3 Cifras (000-999)</option>
                       <option value={4}>4 Cifras (0000-9999)</option>
                     </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Modo Reparto</label>
                      <select 
                        value={distribution}
                        onChange={(e) => setDistribution(e.target.value as any)}
                        className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 appearance-none"
                      >
                        <option value="LINEAR">Lineal</option>
                        <option value="RANDOM">Aleatorio</option>
                      </select>
                   </div>
                 </div>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white rounded-xl border border-stone-200 flex items-center justify-center text-stone-400">
                   <Hash size={20} />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-stone-700">Incluir Cero</p>
                    <p className="text-[10px] font-medium text-stone-400">Permite números que inicien o sean 0</p>
                 </div>
               </div>
               <button 
                 type="button"
                 onClick={() => setUseZero(!useZero)}
                 className={`w-12 h-6 rounded-full transition-all relative ${useZero ? 'bg-brand-500' : 'bg-stone-300'}`}
               >
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useZero ? 'left-7' : 'left-1'}`} />
               </button>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Media */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
              <Calendar className="text-brand-500" size={24} /> Programación
            </h3>
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
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Estado</label>
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
            <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
              <ImageIcon className="text-brand-500" size={24} /> Portada
            </h3>
            <div className="space-y-4">
              <div className="aspect-video rounded-2xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <ImageIcon size={32} className="text-stone-300" />
                )}
              </div>
              <input 
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-12 bg-stone-50 border border-stone-200 rounded-xl px-4 text-xs font-bold text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="text-[10px] text-stone-400 text-center italic">Ingresa la URL de la imagen principal para la rifa.</p>
            </div>
          </div>

          {isSubmitting && (
            <div className="fixed inset-0 bg-stone-900/10 backdrop-blur-[2px] z-[300] flex items-center justify-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-stone-100">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <span className="font-black text-stone-800 uppercase tracking-widest text-xs">Guardando Rifa...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

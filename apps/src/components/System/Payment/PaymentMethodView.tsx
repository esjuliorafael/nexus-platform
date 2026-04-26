import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, User, CreditCard, Hash, ChevronRight, Briefcase, Info, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { apiSystem, apiPayments } from '../../../api';
import { BankDetails, SalesChannel } from '../../../types';

export interface PaymentMethodViewRef {
  handleSaveConfig: () => void;
  handleCreateChannel: () => void;
}

interface PaymentMethodViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  subView: 'config' | 'channels';
  setSubView: (view: 'config' | 'channels') => void;
}

export const PaymentMethodView = forwardRef<PaymentMethodViewRef, PaymentMethodViewProps>(
  ({ showToast, setConfirmDialog, subView, setSubView }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    
    const [defaultPayment, setDefaultPayment] = useState<BankDetails>({
      bankName: '', beneficiary: '', clabe: '', cardNumber: ''
    });

    const [channels, setChannels] = useState<SalesChannel[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null);
    const [formData, setFormData] = useState({
      name: '', purposeKey: '', bankName: '', beneficiary: '', clabe: '', cardNumber: ''
    });

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [configData, channelsData] = await Promise.all([
          apiSystem.getConfig(),
          apiPayments.getAll()
        ]);
        
        setDefaultPayment({
          bankName: configData['pago_banco_default'] || '',
          beneficiary: configData['pago_beneficiario_default'] || '',
          clabe: configData['pago_clabe_default'] || '',
          cardNumber: configData['pago_tarjeta_default'] || ''
        });
        
        setChannels(channelsData);
      } catch (error) {
        showToast('Error al cargar la información bancaria', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadData();
    }, []);

    useEffect(() => {
      if (isModalOpen) document.body.classList.add('overflow-hidden');
      else document.body.classList.remove('overflow-hidden');
      return () => document.body.classList.remove('overflow-hidden');
    }, [isModalOpen]);

    const handleOpenModal = (channel?: SalesChannel) => {
      if (channel) {
        setEditingChannel(channel);
        setFormData({ 
          name: channel.name, purposeKey: channel.purposeKey, bankName: channel.bankName, 
          beneficiary: channel.beneficiary, clabe: channel.clabe, cardNumber: channel.cardNumber 
        });
      } else {
        setEditingChannel(null);
        setFormData({ name: '', purposeKey: '', bankName: '', beneficiary: '', clabe: '', cardNumber: '' });
      }
      setIsModalOpen(true);
    };

    useImperativeHandle(ref, () => ({
      handleSaveConfig: async () => {
        if (!defaultPayment.bankName.trim() || !defaultPayment.beneficiary.trim()) {
          showToast('Por favor completa el banco y el beneficiario de la cuenta principal.', 'error');
          return;
        }
        try {
          await apiSystem.updateConfig({
            'pago_banco_default': defaultPayment.bankName,
            'pago_beneficiario_default': defaultPayment.beneficiary,
            'pago_clabe_default': defaultPayment.clabe,
            'pago_tarjeta_default': defaultPayment.cardNumber
          });
          showToast('Cuenta principal guardada correctamente', 'success');
        } catch (error) {
          showToast('Error al guardar la cuenta principal', 'error');
        }
      },
      handleCreateChannel: () => {
        handleOpenModal();
      }
    }));

    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDefaultPayment(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveChannel = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.purposeKey.trim() || !formData.bankName.trim()) return;

      try {
        if (editingChannel) {
          await apiPayments.update(editingChannel.id, formData);
          showToast('Canal actualizado correctamente', 'success');
        } else {
          await apiPayments.create(formData);
          showToast('Canal de pago añadido', 'success');
        }
        loadData();
        setIsModalOpen(false);
      } catch (error) {
        showToast('Error al guardar el canal de pago', 'error');
      }
    };

    const handleDeleteChannel = (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar Canal?',
        message: 'Esta acción eliminará la cuenta bancaria de este canal permanentemente.',
        confirmLabel: 'Sí, Eliminar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiPayments.delete(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            showToast('Canal eliminado');
          } catch (error) {
            showToast('Error al eliminar canal', 'error');
          }
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando métodos de pago...</p>
        </div>
      );
    }

    return (
      <>
        {subView === 'channels' ? (
          /* NUEVO: key="channels-view" para forzar montaje limpio */
          <div key="channels-view" className="space-y-6">
            <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm">
              <div className="text-brand-500 mt-1 shrink-0"><Info size={24} /></div>
              <div>
                <h4 className="font-bold text-brand-900">Cuentas Específicas</h4>
                <p className="text-sm text-brand-700 mt-1 leading-relaxed">
                  Define la información bancaria específica para cada propósito. Si un cliente compra un producto de "Cría", verá la cuenta asignada aquí. Si el pedido es mixto, verá la cuenta principal.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {channels.map((channel, idx) => (
                <div 
                  key={channel.id} 
                  className="animate-card-enter bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300"
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-600">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">{channel.name}</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Propósito en sistema: {channel.purposeKey}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenModal(channel)} className="p-3 text-stone-400 hover:text-brand-500 hover:bg-brand-50 rounded-2xl transition-all active:scale-95"><Pencil size={18} /></button>
                      <button onClick={() => handleDeleteChannel(channel.id)} className="p-3 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-95"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Banco</p>
                      <p className="font-bold text-stone-800 ml-1">{channel.bankName}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Beneficiario</p>
                      <p className="font-bold text-stone-800 ml-1">{channel.beneficiary}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">CLABE Interbancaria</p>
                      <p className="font-bold text-stone-800 ml-1">{channel.clabe || 'No especificada'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">No. Tarjeta</p>
                      <p className="font-bold text-stone-800 ml-1">{channel.cardNumber || 'No especificada'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* NUEVO: key="config-view" para forzar montaje limpio */
          <div key="config-view" className="space-y-8">
            <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-6 border-b border-stone-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">Cuenta Bancaria Principal</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Recibe los pagos de órdenes mixtas o globales</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenModal()}
                  className="flex items-center justify-center gap-2 bg-stone-50 text-stone-600 px-5 py-3 rounded-2xl text-xs font-bold hover:bg-stone-100 border border-stone-200 transition-all active:scale-95"
                >
                  <Plus size={16} /> Añadir Canal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Banco</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                      <Building2 size={18} />
                    </div>
                    <input type="text" name="bankName" value={defaultPayment.bankName} onChange={handleDefaultChange} placeholder="Ej. BBVA, Santander..." 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Nombre del Beneficiario</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                      <User size={18} />
                    </div>
                    <input type="text" name="beneficiary" value={defaultPayment.beneficiary} onChange={handleDefaultChange} placeholder="Titular de la cuenta" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">CLABE Interbancaria</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                      <Hash size={18} />
                    </div>
                    <input type="text" name="clabe" value={defaultPayment.clabe} onChange={handleDefaultChange} placeholder="18 dígitos" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">No. Tarjeta</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                      <CreditCard size={18} />
                    </div>
                    <input type="text" name="cardNumber" value={defaultPayment.cardNumber} onChange={handleDefaultChange} placeholder="16 dígitos" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-xs">Desglose por Departamento</h3>
              </div>
              <div className="bg-stone-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row items-center justify-between gap-8 shadow-2xl">
                <div className="flex items-center gap-6 sm:gap-12">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-stone-800 flex items-center justify-center text-stone-400 shrink-0">
                    <Briefcase size={32} />
                  </div>
                  <div className="text-left">
                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Canales Configurables</p>
                    <div className="flex items-end gap-3 mt-1">
                      <p className="text-5xl font-black tracking-tighter">{channels.length}</p>
                      <span className="text-stone-500 font-bold pb-1 text-sm">Departamentos</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSubView('channels')}
                  className="w-full sm:w-auto px-10 py-5 bg-white text-stone-900 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                >
                  Configurar Canales
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Canal (Renderizado fuera del condicional para estar siempre disponible) */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
              <div className="p-8 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-stone-800 tracking-tight">
                    {editingChannel ? 'Editar Canal' : 'Nuevo Canal'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors active:scale-90"><X size={20} strokeWidth={3} /></button>
                </div>
                <form onSubmit={handleSaveChannel} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Nombre</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Depto. Combate" 
                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                    </div>
                    <div className="group space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Propósito</label>
                      <input type="text" required value={formData.purposeKey} onChange={(e) => setFormData({ ...formData, purposeKey: e.target.value })} placeholder="Ej. Combate" 
                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                    </div>
                  </div>
                  <div className="group space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Banco</label>
                    <input type="text" required value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Ej. BBVA" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                  <div className="group space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Beneficiario</label>
                    <input type="text" required value={formData.beneficiary} onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })} placeholder="Titular de la cuenta" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">CLABE</label>
                      <input type="text" value={formData.clabe} onChange={(e) => setFormData({ ...formData, clabe: e.target.value })} placeholder="Opcional" 
                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                    </div>
                    <div className="group space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Tarjeta</label>
                      <input type="text" value={formData.cardNumber} onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })} placeholder="Opcional" 
                        className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-stone-100 transition-all border border-stone-200 active:scale-95">Cancelar</button>
                    <button type="submit" disabled={!formData.name || !formData.bankName} className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 ${(!formData.name || !formData.bankName) ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-500 text-white shadow-lg hover:bg-brand-600'}`}>
                      <Save size={16} strokeWidth={3} /> Guardar Canal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        , document.body)}
      </>
    );
  }
);
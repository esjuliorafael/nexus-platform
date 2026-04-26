import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, FileText, ChevronRight, Briefcase, Info, Smartphone, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { apiSystem, apiWhatsApp } from '../../../api';
import { WhatsAppDetails, WhatsAppChannel } from '../../../types';

export interface WhatsAppViewRef {
  handleSaveConfig: () => void;
  handleCreateChannel: () => void;
}

interface WhatsAppViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  subView: 'config' | 'channels';
  setSubView: (view: 'config' | 'channels') => void;
}

export const WhatsAppView = forwardRef<WhatsAppViewRef, WhatsAppViewProps>(
  ({ showToast, setConfirmDialog, subView, setSubView }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);

    const [defaultWhatsApp, setDefaultWhatsApp] = useState<WhatsAppDetails>({
      active: true, phoneNumber: '', template: ''
    });

    const [channels, setChannels] = useState<WhatsAppChannel[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<WhatsAppChannel | null>(null);
    const [formData, setFormData] = useState({
      name: '', purposeKey: '', phoneNumber: '', template: ''
    });

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [configData, channelsData] = await Promise.all([
          apiSystem.getConfig(),
          apiWhatsApp.getAll()
        ]);
        
        setDefaultWhatsApp({
          active: configData['whatsapp_activo_default'] === '1',
          phoneNumber: configData['whatsapp_telefono_default'] || '',
          template: configData['whatsapp_plantilla_default'] || ''
        });
        
        setChannels(channelsData);
      } catch (error) {
        showToast('Error al cargar la información de WhatsApp', 'error');
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

    const handleOpenModal = (channel?: WhatsAppChannel) => {
      if (channel) {
        setEditingChannel(channel);
        setFormData({ 
          name: channel.name, purposeKey: channel.purposeKey, 
          phoneNumber: channel.phoneNumber, template: channel.template 
        });
      } else {
        setEditingChannel(null);
        setFormData({ name: '', purposeKey: '', phoneNumber: '', template: '' });
      }
      setIsModalOpen(true);
    };

    useImperativeHandle(ref, () => ({
      handleSaveConfig: async () => {
        if (!defaultWhatsApp.phoneNumber.trim()) {
          showToast('Por favor ingresa un número de teléfono válido.', 'error');
          return;
        }
        try {
          await apiSystem.updateConfig({
            'whatsapp_activo_default': defaultWhatsApp.active,
            'whatsapp_telefono_default': defaultWhatsApp.phoneNumber,
            'whatsapp_plantilla_default': defaultWhatsApp.template
          });
          showToast('Configuración principal de WhatsApp guardada', 'success');
        } catch (error) {
          showToast('Error al guardar WhatsApp principal', 'error');
        }
      },
      handleCreateChannel: () => {
        handleOpenModal();
      }
    }));

    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDefaultWhatsApp(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveChannel = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.phoneNumber.trim()) return;

      try {
        if (editingChannel) {
          await apiWhatsApp.update(editingChannel.id, formData);
          showToast('Canal actualizado correctamente', 'success');
        } else {
          await apiWhatsApp.create({ ...formData, active: true });
          showToast('Canal de WhatsApp añadido', 'success');
        }
        loadData();
        setIsModalOpen(false);
      } catch (error) {
        showToast('Error al guardar el canal de WhatsApp', 'error');
      }
    };

    const handleDeleteChannel = (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar Canal?',
        message: 'Esta acción eliminará el número de WhatsApp de este departamento.',
        confirmLabel: 'Sí, Eliminar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiWhatsApp.delete(id);
            setChannels(prev => prev.filter(c => c.id !== id));
            showToast('Canal eliminado');
          } catch (error) {
            showToast('Error al eliminar canal', 'error');
          }
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    const toggleChannelStatus = async (channel: WhatsAppChannel) => {
      try {
        await apiWhatsApp.toggleStatus(channel.id, !channel.active);
        setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, active: !c.active } : c));
        showToast('Estado actualizado', 'success');
      } catch (error) {
        showToast('Error al actualizar estado', 'error');
      }
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando contactos de WhatsApp...</p>
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
                <h4 className="font-bold text-brand-900">Mensajería por Departamento</h4>
                <p className="text-sm text-brand-700 mt-1 leading-relaxed">
                  Personaliza a qué número llega el mensaje y qué texto predeterminado se envía según el tipo de producto comprado.
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-6 border-b border-stone-100 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-600">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">{channel.name}</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Propósito: {channel.purposeKey}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenModal(channel)} className="p-3 text-stone-400 hover:text-brand-500 hover:bg-brand-50 rounded-2xl transition-all active:scale-95"><Pencil size={18} /></button>
                        <button onClick={() => handleDeleteChannel(channel.id)} className="p-3 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-95"><Trash2 size={18} /></button>
                      </div>
                      <button 
                        onClick={() => toggleChannelStatus(channel)}
                        className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${channel.active ? 'bg-brand-500' : 'bg-stone-300'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${channel.active ? 'left-8' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: channel.active ? 1 : 0.5, pointerEvents: channel.active ? 'auto' : 'none' }}>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Número de WhatsApp</p>
                      <p className="font-bold text-stone-800 ml-1">{channel.phoneNumber}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Plantilla del Mensaje</p>
                      <p className="font-medium text-stone-600 ml-1 whitespace-pre-line text-sm">{channel.template}</p>
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">WhatsApp Principal</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Recibe mensajes de órdenes mixtas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-stone-50 text-stone-600 px-5 py-3 rounded-2xl text-xs font-bold hover:bg-stone-100 border border-stone-200 transition-all active:scale-95"
                  >
                    <Plus size={16} /> Añadir Canal
                  </button>
                  <button 
                    onClick={() => setDefaultWhatsApp({ ...defaultWhatsApp, active: !defaultWhatsApp.active })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${defaultWhatsApp.active ? 'bg-green-500' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${defaultWhatsApp.active ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: defaultWhatsApp.active ? 1 : 0.5, pointerEvents: defaultWhatsApp.active ? 'auto' : 'none' }}>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Número de WhatsApp Principal</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-green-500 transition-colors">
                      <Smartphone size={18} />
                    </div>
                    <input type="text" name="phoneNumber" value={defaultWhatsApp.phoneNumber} onChange={handleDefaultChange} placeholder="Ej. 524432020019" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Plantilla del Mensaje</label>
                  <div className="relative">
                    <div className="absolute top-5 left-4 flex items-start pointer-events-none text-stone-400 group-focus-within:text-green-500 transition-colors">
                      <FileText size={18} />
                    </div>
                    <textarea name="template" value={defaultWhatsApp.template} onChange={handleDefaultChange} rows={6} placeholder="Escribe la plantilla del mensaje..." 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20 rounded-2xl py-4 pl-12 pr-6 outline-none transition-all font-bold text-stone-700 shadow-sm resize-none leading-relaxed"></textarea>
                  </div>
                  <p className="text-[10px] text-stone-400 font-medium ml-1">Variables: <span className="font-bold text-green-600">{`{id_orden}`}</span>, <span className="font-bold text-green-600">{`{nombre_cliente}`}</span>, <span className="font-bold text-green-600">{`{total}`}</span>, <span className="font-bold text-green-600">{`{lista_productos}`}</span></p>
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
                    <MessageCircle size={32} />
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
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Número WhatsApp</label>
                    <input type="text" required value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="Incluir código de país (Ej. 52...)" 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm" />
                  </div>
                  <div className="group space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Plantilla de Mensaje</label>
                    <textarea required value={formData.template} onChange={(e) => setFormData({ ...formData, template: e.target.value })} rows={5} placeholder="Escribe el mensaje..." 
                      className="w-full bg-stone-50 border border-stone-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-2xl p-4 outline-none transition-all font-bold text-stone-700 shadow-sm resize-none"></textarea>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-stone-100 transition-all border border-stone-200 active:scale-95">Cancelar</button>
                    <button type="submit" disabled={!formData.name || !formData.phoneNumber} className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 ${(!formData.name || !formData.phoneNumber) ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-500 text-white shadow-lg hover:bg-brand-600'}`}>
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
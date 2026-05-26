import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Server, Globe, Wrench, Receipt, Plus, Trash2, CheckCircle2, AlertCircle, Tag, Calendar as CalendarIcon, Pencil, Save, Check, ShieldCheck, Box, DollarSign, Wallet, History, FileText } from 'lucide-react';
import { AnnualService, ExtraCharge, BillingPayment } from '../../../types';
import { apiBilling } from '../../../api';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect, NexusTextarea } from '../../ui/NexusInputs';
import { EmptyState } from '../../ui/EmptyState';
import { NexusSection } from '../../ui/NexusSection';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSectionCard } from '../../ui/NexusCard';
import { NexusModal } from '../../ui/NexusModal';

export interface BillingViewRef {
  handleSaveConfig: () => void;
  handleCreateCharge: () => void;
  handleCreatePayment: () => void;
}

interface BillingViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

// --- UTILIDADES ---
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const pureDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = pureDate.split('-');
  if (parts.length < 3) return pureDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const formatDateForInput = (dateStr?: string | null) => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

export const BillingView = forwardRef<BillingViewRef, BillingViewProps>(
  ({ showToast, setConfirmDialog }, ref) => {
    // --- ESTADO ---
    const [isLoading, setIsLoading] = useState(true);
    const [services, setServices] = useState<AnnualService[]>([]);
    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
    const [payments, setPayments] = useState<BillingPayment[]>([]);
    
    // Modales
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<AnnualService | null>(null);
    const [serviceFormData, setServiceFormData] = useState({ 
      concept: '', description: '', amount: '', contractDate: '', dueDate: '', iconType: 'default' 
    });

    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [editingCharge, setEditingCharge] = useState<ExtraCharge | null>(null);
    const [chargeFormData, setChargeFormData] = useState({ concept: '', amount: '' });

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<BillingPayment | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({ 
      concept: '', amount: '', notes: '', paymentDate: new Date().toISOString().split('T')[0] 
    });

    // Permisos
    const [userRole] = useState<string>(() => {
      const authString = localStorage.getItem('admin_session');
      if (!authString) return 'staff';
      try { return (JSON.parse(authString).role || 'staff').toLowerCase(); } catch { return 'staff'; }
    });
    const isSuperadmin = userRole === 'superadmin';

    // --- CARGA DE DATOS ---
    const loadBillingData = async () => {
      setIsLoading(true);
      try {
        const data = await apiBilling.getAll();
        setServices(data.services);
        setExtraCharges(data.charges);
        setPayments(data.payments);
      } catch (error) {
        showToast('Error al cargar facturación', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => { loadBillingData(); }, []);

    // --- HANDLERS SERVICIOS ---
    const handleOpenServiceModal = (service?: AnnualService) => {
      if (service) {
        setEditingService(service);
        setServiceFormData({ 
          concept: service.concept, 
          description: service.description || '', 
          amount: service.amount.toString(), 
          contractDate: formatDateForInput(service.contractDate), 
          dueDate: formatDateForInput(service.dueDate), 
          iconType: service.iconType 
        });
      } else {
        setEditingService(null);
        setServiceFormData({ concept: '', description: '', amount: '', contractDate: '', dueDate: '', iconType: 'default' });
      }
      setIsServiceModalOpen(true);
    };

    const handleSaveService = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          concept: serviceFormData.concept,
          description: serviceFormData.description || null,
          amount: parseFloat(serviceFormData.amount),
          contractDate: serviceFormData.contractDate || null,
          expirationDate: serviceFormData.dueDate || null,
          iconType: serviceFormData.iconType
        };
        if (editingService) await apiBilling.updateService(editingService.id, payload);
        else await apiBilling.createService(payload);
        
        showToast(editingService ? 'Servicio actualizado' : 'Servicio añadido');
        loadBillingData();
        setIsServiceModalOpen(false);
      } catch (error) { showToast('Error al guardar servicio', 'error'); }
    };

    const toggleServiceStatus = async (id: string) => {
      const service = services.find(s => s.id === id);
      if (!service) return;
      try {
        await apiBilling.toggleService(id, !service.isPaid);
        setServices(prev => prev.map(s => s.id === id ? { ...s, isPaid: !s.isPaid } : s));
        showToast('Estado de pago actualizado');
      } catch (error) { showToast('Error al actualizar estado', 'error'); }
    };

    const removeService = (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar Servicio?',
        message: 'Esta acción es irreversible y afectará el plan anual.',
        confirmLabel: 'Sí, Eliminar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiBilling.deleteService(id);
            setServices(prev => prev.filter(s => s.id !== id));
            showToast('Servicio eliminado');
          } catch (error) { showToast('Error al eliminar', 'error'); }
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    // --- HANDLERS CARGOS ---
    const handleOpenChargeModal = (charge?: ExtraCharge) => {
      if (charge) {
        setEditingCharge(charge);
        setChargeFormData({ concept: charge.concept, amount: charge.amount.toString() });
      } else {
        setEditingCharge(null);
        setChargeFormData({ concept: '', amount: '' });
      }
      setIsChargeModalOpen(true);
    };

    const handleSaveCharge = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          concept: chargeFormData.concept,
          amount: parseFloat(chargeFormData.amount),
          chargeDate: new Date().toISOString().split('T')[0]
        };
        if (editingCharge) await apiBilling.updateCharge(editingCharge.id, payload);
        else await apiBilling.createCharge(payload);
        
        showToast(editingCharge ? 'Cargo actualizado' : 'Cargo añadido');
        loadBillingData();
        setIsChargeModalOpen(false);
      } catch (error) { showToast('Error al guardar cargo', 'error'); }
    };

    const toggleChargeStatus = async (id: string) => {
      const charge = extraCharges.find(c => c.id === id);
      if (!charge) return;
      try {
        const isPaid = charge.status === 'paid';
        await apiBilling.toggleCharge(id, !isPaid);
        setExtraCharges(prev => prev.map(c => c.id === id ? { ...c, status: !isPaid ? 'paid' : 'pending' } : c));
        showToast('Estado de cargo actualizado');
      } catch (error) { showToast('Error al actualizar estado', 'error'); }
    };

    const removeCharge = (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar Cargo?',
        message: 'El cargo será eliminado permanentemente de la cuenta.',
        confirmLabel: 'Sí, Eliminar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiBilling.deleteCharge(id);
            setExtraCharges(prev => prev.filter(c => c.id !== id));
            showToast('Cargo eliminado');
          } catch (error) { showToast('Error al eliminar', 'error'); }
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    // --- HANDLERS PAGOS (ABONOS) ---
    const handleOpenPaymentModal = (payment?: BillingPayment | React.MouseEvent) => {
      // Si recibimos un evento (del botón) o nada, es un nuevo abono
      if (!payment || 'nativeEvent' in payment) {
        setEditingPayment(null);
        setPaymentFormData({ 
          concept: '', 
          amount: '', 
          notes: '', 
          paymentDate: new Date().toISOString().split('T')[0] 
        });
      } else {
        // Es un objeto BillingPayment real para editar
        const p = payment as BillingPayment;
        setEditingPayment(p);
        setPaymentFormData({ 
          concept: p.concept, 
          amount: p.amount.toString(), 
          notes: p.notes || '', 
          paymentDate: formatDateForInput(p.paymentDate) 
        });
      }
      setIsPaymentModalOpen(true);
    };

    const handleSavePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload = {
          concept: paymentFormData.concept,
          amount: parseFloat(paymentFormData.amount),
          paymentDate: paymentFormData.paymentDate,
          notes: paymentFormData.notes || null
        };
        
        if (editingPayment) {
          await apiBilling.updatePayment(editingPayment.id, payload);
          showToast('Abono actualizado con éxito', 'success');
        } else {
          await apiBilling.createPayment(payload);
          showToast('Abono registrado con éxito', 'success');
        }
        
        loadBillingData();
        setIsPaymentModalOpen(false);
      } catch (error) {
        showToast('Error al guardar abono', 'error');
      }
    };

    const removePayment = (id: string) => {
      setConfirmDialog({
        isOpen: true,
        title: '¿Eliminar Registro de Pago?',
        message: 'Esta acción restará este abono del saldo actual.',
        confirmLabel: 'Sí, Eliminar',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiBilling.deletePayment(id);
            setPayments(prev => prev.filter(p => p.id !== id));
            showToast('Registro de pago eliminado');
          } catch (error) { showToast('Error al eliminar', 'error'); }
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    // --- CÁLCULOS ---
    const totalObligations = services.filter(s => !s.isPaid).reduce((acc, s) => acc + s.amount, 0) +
                             extraCharges.filter(c => c.status === 'pending').reduce((acc, c) => acc + c.amount, 0);
    
    const totalAbonado = payments.reduce((acc, p) => acc + p.amount, 0);
    const netBalance = Math.max(0, totalObligations - totalAbonado);
    
    const nextDueDate = services.filter(s => !s.isPaid && s.dueDate)
                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate;

    useImperativeHandle(ref, () => ({
      handleSaveConfig: () => loadBillingData(),
      handleCreateCharge: () => handleOpenChargeModal(),
      handleCreatePayment: () => handleOpenPaymentModal()
    }));

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
           </div>
           <p className="text-label text-text-muted">Consultando Estado de Cuenta...</p>
        </div>
      );
    }

    return (
      <div key="billing-view-content" className="space-y-8 pb-12 animate-in fade-in duration-300">
        
        <NexusHero
          title={`$${netBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          subtitle={netBalance > 0 ? 'Saldo Neto Pendiente' : 'Cuenta Liquidada'}
          icon={netBalance > 0 ? AlertCircle : CheckCircle2}
          variant={netBalance > 0 ? 'dark' : 'success'}
          badge={netBalance > 0 && nextDueDate ? "Próximo Vencimiento" : undefined}
          badgeValue={netBalance > 0 && nextDueDate ? formatDate(nextDueDate) : undefined}
        />

        {/* SERVICIOS ANUALES */}
        <NexusSection
          title="Servicios Anuales"
          subtitle="Infraestructura y Licenciamiento"
          icon={Server}
          delay="200ms"
          action={isSuperadmin && (
            <NexusSectionButton 
              onClick={() => handleOpenServiceModal()} 
              icon={Plus} 
              variant="brand"
            >
              Nuevo Servicio
            </NexusSectionButton>
          )}
        >
          <div className="flex flex-col gap-5">
            {services.length === 0 ? (
              <EmptyState icon={Server} title="Sin Servicios" description="No hay servicios anuales registrados." />
            ) : (
              services.map((service, idx) => (
                <NexusSectionCard
                  key={service.id}
                  delay={`${idx * 70}ms`}
                  icon={service.iconType === 'server' ? Server : service.iconType === 'globe' ? Globe : service.iconType === 'wrench' ? Wrench : service.iconType === 'shield' ? ShieldCheck : Box}
                  title={service.concept}
                  isMuted={service.isPaid}
                  subtitle={
                    <div className="flex items-center gap-1.5 text-secondary">
                      <CalendarIcon size={12} /> 
                      {service.contractDate ? formatDate(service.contractDate) : 'S/F'} — 
                      <span className={service.isPaid ? '' : 'text-brand-500 font-bold'}>
                        {service.dueDate ? formatDate(service.dueDate) : 'S/F'}
                      </span>
                    </div>
                  }
                  rightContent={
                    <>
                      <p className="text-label uppercase tracking-[0.15em] text-stone-400">Importe Anual</p>
                      <div className="flex items-baseline text-h1 text-brand-700">
                        <span className="text-secondary mr-0.5 opacity-50">$</span>
                        {service.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  }
                  actions={isSuperadmin && (
                    <NexusCardButton 
                      onClick={() => toggleServiceStatus(service.id)}
                      variant={service.isPaid ? 'secondary' : 'brand'}
                    >
                      {service.isPaid ? 'Saldado' : 'Saldar'}
                    </NexusCardButton>
                  )}
                  onEdit={isSuperadmin ? () => handleOpenServiceModal(service) : undefined}
                  onDelete={isSuperadmin ? () => removeService(service.id) : undefined}
                  swipeable={isSuperadmin}
                />
              ))
            )}
          </div>
        </NexusSection>

        {/* CARGOS ADICIONALES */}
        <NexusSection
          title="Cargos Adicionales"
          subtitle="Soporte y Requerimientos Extra"
          icon={Receipt}
          delay="400ms"
          action={isSuperadmin && (
            <NexusSectionButton 
              onClick={() => handleOpenChargeModal()} 
              icon={Plus} 
              variant="brand"
            >
              Nuevo Cargo
            </NexusSectionButton>
          )}
        >
          <div className="flex flex-col gap-5">
            {extraCharges.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin Pendientes" description="No hay cargos adicionales registrados." />
            ) : (
              extraCharges.map((charge, idx) => (
                <NexusSectionCard
                  key={charge.id}
                  delay={`${idx * 70}ms`}
                  icon={Receipt}
                  title={charge.concept}
                  isMuted={charge.status === 'paid'}
                  subtitle={
                    <div className="flex items-center gap-1.5 text-secondary">
                      <CalendarIcon size={12} /> {formatDate(charge.date)}
                    </div>
                  }
                  rightContent={
                    <>
                      <p className="text-label uppercase tracking-[0.15em] text-stone-400">Importe Total</p>
                      <div className="flex items-baseline text-h1 text-brand-700">
                        <span className="text-secondary mr-0.5 opacity-50">$</span>
                        {charge.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  }
                  actions={isSuperadmin && (
                    <NexusCardButton 
                      onClick={() => toggleChargeStatus(charge.id)}
                      variant={charge.status === 'paid' ? 'secondary' : 'brand'}
                    >
                      {charge.status === 'paid' ? 'Saldado' : 'Finalizar'}
                    </NexusCardButton>
                  )}
                  onEdit={isSuperadmin ? () => handleOpenChargeModal(charge) : undefined}
                  onDelete={isSuperadmin ? () => removeCharge(charge.id) : undefined}
                  swipeable={isSuperadmin}
                />
              ))
            )}
          </div>
        </NexusSection>

        {/* HISTORIAL DE PAGOS */}
        <NexusSection
          title="Pagos Recibidos"
          subtitle="Trazabilidad de Abonos y Liquidaciones"
          icon={Wallet}
          delay="600ms"
          action={isSuperadmin && (
            <NexusSectionButton 
              onClick={handleOpenPaymentModal} 
              icon={Plus} 
              variant="success"
            >
              Nuevo Abono
            </NexusSectionButton>
          )}
        >
          <div className="flex flex-col gap-5">
            {payments.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin Pagos" description="No se han registrado abonos aún." />
            ) : (
              payments.map((payment, idx) => (
                <NexusSectionCard
                  key={payment.id}
                  delay={`${idx * 70}ms`}
                  icon={CheckCircle2}
                  iconVariant="emerald"
                  title={payment.concept}
                  subtitle={
                    <div className="flex items-center gap-1.5 text-secondary">
                      <CalendarIcon size={12} /> {formatDate(payment.paymentDate)}
                      {payment.notes && <span className="opacity-50 ml-2">• {payment.notes}</span>}
                    </div>
                  }
                  rightContent={
                    <>
                      <p className="text-label uppercase tracking-[0.15em] text-stone-400">Monto Abonado</p>
                      <div className="flex items-baseline text-h1 text-emerald-600">
                        <span className="text-secondary mr-0.5 opacity-50">$</span>
                        {payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  }
                  onEdit={isSuperadmin ? () => handleOpenPaymentModal(payment) : undefined}
                  onDelete={isSuperadmin ? () => removePayment(payment.id) : undefined}
                  swipeable={isSuperadmin}
                />
              ))
            )}
          </div>
        </NexusSection>

        {/* MODAL SERVICIO */}
        <NexusModal
          isOpen={isServiceModalOpen}
          title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
          onClose={() => setIsServiceModalOpen(false)}
        >
                <form onSubmit={handleSaveService} className="space-y-6">
                  <div className="space-y-4">
                    <NexusSelect label="Icono" value={serviceFormData.iconType} onChange={(e) => setServiceFormData({...serviceFormData, iconType: e.target.value})}>
                      <option value="default">General</option>
                      <option value="globe">Web/SSL</option>
                      <option value="server">Cloud/Hosting</option>
                      <option value="shield">Seguridad</option>
                      <option value="wrench">Mantenimiento</option>
                    </NexusSelect>
                    <NexusInput label="Concepto" required value={serviceFormData.concept} onChange={(e) => setServiceFormData({...serviceFormData, concept: e.target.value})} icon={Tag} />
                    <NexusTextarea label="Descripción" rows={2} value={serviceFormData.description} onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})} />
                    <NexusInput label="Monto (MXN)" type="number" required step="0.01" value={serviceFormData.amount} onChange={(e) => setServiceFormData({...serviceFormData, amount: e.target.value})} icon={DollarSign} />
                    <div className="grid grid-cols-2 gap-4">
                      <NexusInput label="Inicio" type="date" value={serviceFormData.contractDate} onChange={(e) => setServiceFormData({...serviceFormData, contractDate: e.target.value})} />
                      <NexusInput label="Vencimiento" type="date" value={serviceFormData.dueDate} onChange={(e) => setServiceFormData({...serviceFormData, dueDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <NexusSectionButton 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setIsServiceModalOpen(false)} 
                      className="flex-1"
                    >
                      Cerrar
                    </NexusSectionButton>
                    <NexusSectionButton 
                      type="submit" 
                      className="flex-[2]" 
                      icon={editingService ? Save : Check}
                      variant="brand"
                    >
                      {editingService ? 'Guardar' : 'Crear'}
                    </NexusSectionButton>
                  </div>
                </form>
        </NexusModal>

        {/* MODAL CARGO */}
        <NexusModal
          isOpen={isChargeModalOpen}
          title={editingCharge ? 'Editar Cargo' : 'Nuevo Cargo'}
          onClose={() => setIsChargeModalOpen(false)}
        >
                <form onSubmit={handleSaveCharge} className="space-y-6">
                  <div className="space-y-4">
                    <NexusInput label="Concepto" required value={chargeFormData.concept} onChange={(e) => setChargeFormData({...chargeFormData, concept: e.target.value})} icon={Tag} />
                    <NexusInput label="Monto (MXN)" type="number" required step="0.01" value={chargeFormData.amount} onChange={(e) => setChargeFormData({...chargeFormData, amount: e.target.value})} icon={DollarSign} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <NexusSectionButton 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setIsChargeModalOpen(false)} 
                      className="flex-1"
                    >
                      Cerrar
                    </NexusSectionButton>
                    <NexusSectionButton 
                      type="submit" 
                      className="flex-[2]" 
                      icon={editingCharge ? Save : Check}
                      variant="brand"
                    >
                      {editingCharge ? 'Guardar' : 'Crear'}
                    </NexusSectionButton>
                  </div>
                </form>
        </NexusModal>

        {/* MODAL ABONO (PAGO) */}
        <NexusModal
          isOpen={isPaymentModalOpen}
          title={editingPayment ? 'Editar Abono' : 'Nuevo Abono'}
          onClose={() => setIsPaymentModalOpen(false)}
        >
                <form onSubmit={handleSavePayment} className="space-y-6">
                  <div className="space-y-4">
                    <NexusInput label="Concepto / Referencia" required value={paymentFormData.concept} onChange={(e) => setPaymentFormData({...paymentFormData, concept: e.target.value})} placeholder="Ej. Abono Quincenal, Transferencia..." icon={Wallet} />
                    <NexusInput label="Monto Recibido (MXN)" type="number" required step="0.01" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})} icon={DollarSign} />
                    <NexusInput label="Fecha de Pago" type="date" value={paymentFormData.paymentDate} onChange={(e) => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} />
                    <NexusTextarea label="Notas adicionales" rows={2} value={paymentFormData.notes} onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})} placeholder="Banco, folio, etc." />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <NexusSectionButton 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setIsPaymentModalOpen(false)} 
                      className="flex-1"
                    >
                      Cerrar
                    </NexusSectionButton>
                    <NexusSectionButton 
                      type="submit" 
                      className="flex-[2]" 
                      icon={editingPayment ? Save : Check}
                      variant="success"
                    >
                      {editingPayment ? 'Guardar Cambios' : 'Crear Abono'}
                    </NexusSectionButton>
                  </div>
                </form>
        </NexusModal>
      </div>
    );
  }
);

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, X, Save, Check, User as UserIcon, Mail, Shield, Search, Users, AlertCircle, Edit2, ShieldCheck, UserPlus } from 'lucide-react';
import { User } from '../../../types';
import { apiUsers } from '../../../api';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { EmptyState } from '../../ui/EmptyState';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';

interface UsersViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

export interface UsersViewRef {
  handleCreateUser: () => void;
}

export const UsersView = forwardRef<UsersViewRef, UsersViewProps>(({ showToast, setConfirmDialog }, ref) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<{
    name: string; email: string; username: string; password: string; role: 'superadmin' | 'admin' | 'staff';
  }>({
    name: '', email: '', username: '', password: '', role: 'staff'
  });

  const currentUserString = localStorage.getItem('admin_session');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiUsers.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      showToast("Error al cargar la lista de usuarios", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isModalOpen]);

  useImperativeHandle(ref, () => ({
    handleCreateUser: () => {
      setEditingUser(null);
      setFormData({ name: '', email: '', username: '', password: '', role: 'staff' });
      setIsModalOpen(true);
    }
  }));

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name, email: user.email, username: user.username, password: '', role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar Usuario?',
      message: `¿Estás seguro de eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiUsers.delete(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          showToast(`Usuario ${user.name} eliminado correctamente`, 'success');
        } catch (error) {
          showToast('Error al eliminar usuario', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const toggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    try {
      await apiUsers.toggleStatus(id, !user.isActive);
      setUsers(prev => prev.map(u => 
        u.id === id ? { ...u, isActive: !u.isActive } : u
      ));
      showToast(`Usuario ${user.name} ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
    } catch (error) {
      showToast('Error al cambiar el estado del usuario', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        role: formData.role.toUpperCase()
      };

      if (editingUser) {
        await apiUsers.update(editingUser.id, payload);
        showToast('Cambios guardados correctamente');
      } else {
        await apiUsers.create(payload);
        showToast('Usuario creado correctamente');
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (error) {
      showToast('Error al guardar el usuario', 'error');
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
         <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
            <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
         </div>
         <p className="text-label text-text-muted">Sincronizando Equipo...</p>
      </div>
    );
  }

  return (
    <div key="users-view-content" className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      <NexusHero
        title="Miembros"
        subtitle="Control de Equipo"
        icon={Users}
        variant="dark"
        badge="Total Activos"
        badgeValue={users.filter(u => u.isActive).length.toString()}
      />

      <NexusSection
        title="Miembros del Equipo"
        subtitle="Administradores y Staff con acceso al sistema"
        icon={Users}
        delay="300ms"
        action={currentUser?.role !== 'staff' && (
          <NexusSectionButton 
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', username: '', password: '', role: 'staff' });
              setIsModalOpen(true);
            }}
            icon={UserPlus}
            variant="brand"
          >
            Nuevo Miembro
          </NexusSectionButton>
        )}
      >
        <div className="flex flex-col gap-5">
          {users.length === 0 ? (
            <EmptyState 
              icon={Users}
              title="No hay usuarios"
              description="Comienza creando tu primer usuario para gestionar el sistema."
            />
          ) : (
            users.map((user, idx) => (
              <NexusSectionCard
                key={user.id}
                delay={`${idx * 70}ms`}
                icon={UserIcon}
                iconVariant="muted"
                title={user.name}
                isMuted={!user.isActive}
                subtitle={
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-bg-muted text-text-muted/60 rounded-full text-label">
                      @{user.username}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                      !user.isActive ? 'bg-stone-100 text-stone-400' :
                      user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      'bg-stone-100 text-text-muted'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                }
                rightContent={
                  <p className={`text-secondary transition-colors duration-500 ${user.isActive ? 'text-text-muted' : 'text-text-muted/40'}`}>
                    {user.email}
                  </p>
                }
                actions={
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-label transition-all duration-500 ${
                      user.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' : 'bg-stone-100 text-text-muted/40 border border-stone-200/50'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    
                    {(currentUser?.role === 'superadmin' || user.role !== 'superadmin') && user.email !== currentUser?.email && (
                      <button 
                        onClick={() => toggleStatus(user.id)}
                        className={`w-12 h-6 rounded-full transition-all relative active:scale-90 ${
                          user.isActive ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-200'
                        }`}
                        style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${user.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    )}
                  </div>
                }
                onEdit={(currentUser?.role === 'superadmin' || user.role !== 'superadmin' || user.email === currentUser?.email) ? () => handleEdit(user) : undefined}
                onDelete={(currentUser?.role === 'superadmin' || user.role !== 'superadmin') && user.email !== currentUser?.email ? () => handleDeleteClick(user) : undefined}
                swipeable={true}
              />
            ))
          )}
        </div>
      </NexusSection>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-bg-card rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 sm:p-12">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-display text-text-main">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Miembro'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 bg-bg-muted hover:bg-stone-200 text-text-muted rounded-2xl transition-all active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <NexusInput 
                      label="Nombre Completo *"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Ricardo Montes"
                      icon={UserIcon}
                      required
                    />
                    
                    <NexusInput 
                      label="Correo Electrónico *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ejemplo@rancho.com"
                      icon={Mail}
                      required
                    />
                  </div>

                  <div className="p-6 bg-bg-muted rounded-[2rem] border border-border-main space-y-6">
                    <NexusSelect 
                      label="Rol de Seguridad *"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      icon={Shield}
                      required
                    >
                      {currentUser?.role === 'superadmin' && (
                        <option value="superadmin">Super Administrador</option>
                      )}
                      <option value="admin">Administrador de Tienda</option>
                      <option value="staff">Personal de Apoyo (Staff)</option>
                    </NexusSelect>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <NexusInput 
                        label="Username *"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="usuario"
                        icon={() => <span className="font-bold text-sm">@</span>}
                        required
                      />
                      
                      <NexusInput 
                        label={editingUser ? "Nueva Clave (opcional)" : "Contraseña *"}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingUser ? "••••••••" : "Clave segura"}
                        icon={ShieldCheck}
                        required={!editingUser}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <NexusSectionButton 
                    type="button" 
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 bg-bg-muted border-border-main rounded-2xl"
                  >
                    Cerrar
                  </NexusSectionButton>
                  <NexusSectionButton 
                    type="submit" 
                    disabled={!(formData.name.trim() && formData.email.trim() && formData.username.trim() && (editingUser || formData.password.trim()))} 
                    className="flex-[2] rounded-2xl shadow-lg shadow-brand-500/20"
                    icon={editingUser ? Save : Check}
                  >
                    {editingUser ? 'Guardar Cambios' : 'Confirmar Registro'}
                  </NexusSectionButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
});

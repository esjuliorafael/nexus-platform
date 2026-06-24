import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { ArrowLeft, Save, Check, User as UserIcon, Mail, Shield, Users, ShieldCheck, UserPlus, Phone, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import { User } from '../../../types';
import { apiUsers } from '../../../api';
import { NexusSectionButton, NexusAutonomousButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { EmptyState } from '../../ui/EmptyState';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { NexusModal, NexusModalActions } from '../../ui/NexusModal';
import { NexusCardBadge, type NexusBadgeVariant } from '../../ui/NexusBadge';
import { NexusSwitch } from '../../ui/NexusSwitch';
import { PublicContactView } from '../../Profile/PublicContactView';
import type { ContactProfileOwner } from '../../Profile/profileTypes';

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
  const [contactUser, setContactUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<{
    name: string; email: string; phone: string; username: string; password: string; role: 'superadmin' | 'admin' | 'staff';
  }>({
    name: '', email: '', phone: '', username: '', password: '', role: 'staff'
  });

  const currentUserString = localStorage.getItem('admin_session');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;
  const currentUserRole = String(currentUser?.role || 'staff').toLowerCase();
  const normalizeRole = (role: unknown): 'superadmin' | 'admin' | 'staff' => {
    const normalized = String(role || 'staff').toLowerCase();
    if (normalized === 'superadmin' || normalized === 'admin') return normalized;
    return 'staff';
  };
  const getRoleLabel = (role: unknown) => {
    const normalized = normalizeRole(role);
    if (normalized === 'superadmin') return 'Superadmin';
    if (normalized === 'admin') return 'Admin';
    return 'Staff';
  };

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

  useImperativeHandle(ref, () => ({
    handleCreateUser: () => {
      setEditingUser(null);
      setFormData({ name: '', email: '', phone: '', username: '', password: '', role: 'staff' });
      setIsModalOpen(true);
    }
  }));

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name, email: user.email, phone: user.phone || '', username: user.username, password: '', role: normalizeRole(user.role)
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
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        username: formData.username,
        role: formData.role.toUpperCase(),
        ...(formData.password ? { password: formData.password } : {}),
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
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Error al guardar el usuario', 'error');
    }
  };

  const getRoleBadgeVariant = (user: User): NexusBadgeVariant => {
    const role = normalizeRole(user.role);
    if (!user.isActive) return 'muted';
    if (role === 'superadmin') return 'brand';
    if (role === 'admin') return 'info';
    return 'muted';
  };

  const canManageUser = (user: User) => {
    const role = normalizeRole(user.role);
    if (currentUserRole === 'superadmin') return true;
    return currentUserRole === 'admin' && role === 'staff';
  };

  const canEditPublicContact = (user: User) => {
    const role = normalizeRole(user.role);
    if (currentUserRole === 'superadmin') return role === 'admin' || role === 'staff';
    return currentUserRole === 'admin' && role === 'staff';
  };

  const isCurrentUser = (user: User) => user.id === String(currentUser?.id);

  const toContactProfileOwner = (user: User): ContactProfileOwner => ({
    id: user.id,
    name: user.name,
    role: user.role.toUpperCase() as ContactProfileOwner['role'],
    contactProfile: user.contactProfile,
  });

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

  if (contactUser) {
    return (
      <div className="flex flex-col pb-12 animate-in fade-in duration-300" style={{ gap: 'var(--space-lg)' }}>
        <div>
          <NexusSectionButton
            type="button"
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => setContactUser(null)}
          >
            Volver a usuarios
          </NexusSectionButton>
        </div>
        <PublicContactView
          profile={toContactProfileOwner(contactUser)}
          showToast={showToast}
          saveLabel="Guardar y volver"
          successMessage="Contacto publico actualizado"
          saveContact={(data) => apiUsers.updateContact(contactUser.id, data)}
          onSaved={async () => {
            await fetchUsers();
            setContactUser(null);
          }}
        />
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
        action={currentUserRole !== 'staff' && (
          <NexusSectionButton
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', phone: '', username: '', password: '', role: 'staff' });
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
                title={
                  <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <div className="flex min-w-0 flex-wrap items-center" style={{ gap: 'var(--space-sm)' }}>
                      <h4 className={`truncate text-h2 transition-colors duration-500 ${user.isActive ? 'text-text-main' : 'text-text-muted'}`}>
                        {user.name}
                      </h4>
                      <NexusCardBadge
                        variant={getRoleBadgeVariant(user)}
                        className={`transition-all duration-500 ${!user.isActive ? 'text-text-muted/40' : ''}`}
                      >
                        {getRoleLabel(user.role)}
                      </NexusCardBadge>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center" style={{ gap: 'var(--space-sm)' }}>
                      <NexusCardBadge variant="muted" className="text-text-muted/60">
                        @{user.username}
                      </NexusCardBadge>
                      {user.email && (
                        <span className={`truncate text-secondary transition-colors duration-500 ${user.isActive ? 'text-text-muted' : 'text-text-muted/40'}`}>
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                }
                isMuted={!user.isActive}
                actions={
                  <div
                    className="flex w-full items-center justify-between md:justify-end"
                    style={{ gap: 'var(--space-md)' }}
                  >
                    <div
                      className="flex flex-col items-center"
                      style={{ gap: 'var(--space-xs)' }}
                    >
                      <NexusSwitch
                        checked={user.isActive}
                        onChange={() => toggleStatus(user.id)}
                        disabled={!canManageUser(user) || isCurrentUser(user)}
                        aria-label={user.isActive ? `Desactivar ${user.name}` : `Activar ${user.name}`}
                      />
                      <span className={`text-label uppercase tracking-[0.15em] transition-colors duration-500 ${user.isActive ? 'text-text-muted' : 'text-text-muted/40'}`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center" style={{ gap: 'var(--space-sm)' }}>
                      {canEditPublicContact(user) && (
                        <NexusCardButton
                          variant="secondary"
                          isIconOnly
                          icon={MessageCircle}
                          onClick={() => setContactUser(user)}
                          aria-label={`Configurar contacto publico de ${user.name}`}
                          title="Contacto publico"
                        />
                      )}

                      {canManageUser(user) && (
                        <NexusCardButton
                          variant="secondary"
                          isIconOnly
                          icon={Edit2}
                          onClick={() => handleEdit(user)}
                          aria-label={`Editar ${user.name}`}
                          title="Editar"
                        />
                      )}

                      {canManageUser(user) && !isCurrentUser(user) && (
                        <NexusCardButton
                          variant="secondary"
                          isIconOnly
                          icon={Trash2}
                          onClick={() => handleDeleteClick(user)}
                          aria-label={`Eliminar ${user.name}`}
                          title="Eliminar"
                          className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                        />
                      )}
                    </div>
                  </div>
                }
                swipeable={true}
              />
            ))
          )}
        </div>
      </NexusSection>

      <NexusModal
        isOpen={isModalOpen}
        title={editingUser ? formData.name || 'Miembro del equipo' : 'Miembro del equipo'}
        eyebrow={editingUser ? 'Editar Usuario' : 'Nuevo Miembro'}
        icon={UserPlus}
        onClose={() => setIsModalOpen(false)}
      >
              <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
                <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                  <div className="grid grid-cols-1" style={{ gap: 'var(--space-md)' }}>
                    <NexusInput
                      label="Nombre Completo *"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Ricardo Montes"
                      icon={UserIcon}
                      required
                    />

                    <NexusInput
                      label="Teléfono privado"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+521234567890"
                      icon={Phone}
                      helperText="No se publica automáticamente."
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

                  <div
                    className="flex flex-col bg-bg-muted border border-border-main"
                    style={{
                      gap: 'var(--space-md)',
                      padding: 'var(--padding-inner)',
                      borderRadius: 'var(--radius-card-inner)'
                    }}
                  >
                    <NexusSelect
                      label="Rol de Seguridad *"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      icon={Shield}
                      required
                    >
                      {currentUserRole === 'superadmin' && (
                        <option value="superadmin">Super Administrador</option>
                      )}
                      {currentUserRole === 'superadmin' && (
                        <option value="admin">Administrador de Tienda</option>
                      )}
                      <option value="staff">Personal de Apoyo (Staff)</option>
                    </NexusSelect>

                    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
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
                        minLength={8}
                        helperText="Mínimo 8 caracteres."
                        required={!editingUser}
                      />
                    </div>
                  </div>
                </div>

                <NexusModalActions>
                  <NexusAutonomousButton
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </NexusAutonomousButton>
                  <NexusAutonomousButton
                    type="submit"
                    disabled={!(
                      formData.name.trim()
                      && formData.email.trim()
                      && formData.username.trim()
                      && (editingUser ? !formData.password || formData.password.length >= 8 : formData.password.length >= 8)
                    )}
                    className="flex-[2]"
                    icon={editingUser ? Save : Check}
                    variant="brand"
                  >
                    {editingUser ? 'Guardar Cambios' : 'Confirmar Registro'}
                  </NexusAutonomousButton>
                </NexusModalActions>
              </form>
      </NexusModal>

    </div>
  );
});

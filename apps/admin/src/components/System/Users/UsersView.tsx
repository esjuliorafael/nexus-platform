import React, { useState, useEffect } from 'react';
import type { PermissionId } from '@nexus/types';
import { ArrowLeft, User as UserIcon, Users, UserPlus, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import { User } from '../../../types';
import { apiUsers } from '../../../api';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { EmptyState } from '../../ui/EmptyState';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { NexusCardBadge, type NexusBadgeVariant } from '../../ui/NexusBadge';
import { NexusSwitch } from '../../ui/NexusSwitch';
import { PublicContactView } from '../../Profile/PublicContactView';
import type { ContactProfileOwner } from '../../Profile/profileTypes';

interface UsersViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ showToast, setConfirmDialog, onCreateUser, onEditUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [contactUser, setContactUser] = useState<User | null>(null);

  const currentUserString = localStorage.getItem('admin_session');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;
  const currentUserPermissions = (currentUser?.permissions || []) as PermissionId[];
  const canManageUsers = currentUserPermissions.includes('users.manage');
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

  const handleDeleteClick = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar usuario?',
      message: `¿Estás seguro de eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
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

  const getRoleBadgeVariant = (user: User): NexusBadgeVariant => {
    const role = normalizeRole(user.role);
    if (!user.isActive) return 'muted';
    if (role === 'superadmin') return 'brand';
    if (role === 'admin') return 'info';
    return 'muted';
  };

  const canManageUser = (user: User) => {
    return canManageUsers && !isCurrentUser(user);
  };

  const canEditPublicContact = (user: User) => {
    return canManageUsers && !isCurrentUser(user);
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
         <p className="text-label text-text-muted">Sincronizando equipo...</p>
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
          canPublish={canManageUsers}
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
        subtitle="Control de equipo"
        icon={Users}
        variant="dark"
        badge="Total activos"
        badgeValue={users.filter(u => u.isActive).length.toString()}
      />

      <NexusSection
        title="Miembros del equipo"
        subtitle="Administradores y staff con acceso al sistema"
        icon={Users}
        delay="300ms"
        action={canManageUsers && (
          <NexusSectionButton
            onClick={onCreateUser}
            icon={UserPlus}
            variant="brand"
          >
            Nuevo miembro
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
                          onClick={() => onEditUser(user)}
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

    </div>
  );
};

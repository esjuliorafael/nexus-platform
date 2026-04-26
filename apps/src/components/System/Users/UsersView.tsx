import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, X, Save, Check, User as UserIcon, Mail, Shield, Loader2 } from 'lucide-react';
import { User } from '../../../types';
import { apiUsers } from '../../../api';

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
    fullName: string; email: string; username: string; password: string; role: 'superadmin' | 'admin' | 'staff';
  }>({
    fullName: '', email: '', username: '', password: '', role: 'staff'
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
      setFormData({ fullName: '', email: '', username: '', password: '', role: 'staff' });
      setIsModalOpen(true);
    }
  }));

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName, email: user.email, username: user.username, password: '', role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar Usuario?',
      message: `¿Estás seguro de eliminar a ${user.fullName}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiUsers.delete(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          showToast(`Usuario ${user.fullName} eliminado correctamente`, 'success');
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
      showToast(`Usuario ${user.fullName} ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
    } catch (error) {
      showToast('Error al cambiar el estado del usuario', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiUsers.update(editingUser.id, formData);
        showToast('Cambios guardados correctamente');
      } else {
        await apiUsers.create(formData);
        showToast('Usuario creado correctamente');
      }
      fetchUsers(); // Recargar datos reales
      setIsModalOpen(false);
    } catch (error) {
      showToast('Error al guardar el usuario', 'error');
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
         <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
         <p className="text-stone-500 font-medium">Cargando usuarios...</p>
      </div>
    );
  }

  // --- REGLA: Cero animaciones in/fade de tailwind-animate en contenedores estáticos
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {users.map((user, idx) => (
          // --- REGLA: Animación card-enter con stagger para tarjetas múltiples ---
          // --- REGLA 1: Tarjetas base con diseño estricto (padding ajustado por jerarquía) ---
          <div 
            key={user.id} 
            className="animate-card-enter bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-md transition-all duration-300"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <div className="flex items-center gap-5 w-full sm:w-auto">
              {/* REGLA 3: Icono interno rounded-2xl */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${user.isActive ? 'bg-stone-50 text-stone-400 border-stone-200' : 'bg-stone-100 text-stone-300 border-stone-100'}`}>
                <UserIcon size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {/* REGLA 4: Título font-black text-stone-800 tracking-tight */}
                  <h4 className="text-lg font-black text-stone-800 tracking-tight">{user.fullName}</h4>
                  <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-widest">@{user.username}</span>
                  {/* NUEVO: BADGE DE ROL */}
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-stone-500 text-sm font-medium mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-stone-100">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500'}`}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
                
                {/* RESTricción: No puedes desactivar a un superadmin si no eres uno, y no puedes desactivarte a ti mismo */}
                {(currentUser?.role === 'superadmin' || user.role !== 'superadmin') && user.email !== currentUser?.email && (
                  <button 
                    onClick={() => toggleStatus(user.id)}
                    className={`w-12 h-6 rounded-full transition-all relative ${user.isActive ? 'bg-brand-500' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${user.isActive ? 'left-7' : 'left-1'}`} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* RESTricción: Un admin no puede editar a un superadmin */}
                {(currentUser?.role === 'superadmin' || user.role !== 'superadmin' || user.email === currentUser?.email) && (
                  <button onClick={() => handleEdit(user)} className="p-3 bg-stone-50 text-stone-400 border border-transparent hover:border-stone-200 hover:text-brand-500 hover:bg-brand-50 rounded-2xl transition-all active:scale-95" title="Editar Usuario">
                    <Pencil size={18} />
                  </button>
                )}
                
                {/* RESTricción: No puedes eliminar a un superadmin si no eres uno, y no puedes eliminarte a ti mismo */}
                {(currentUser?.role === 'superadmin' || user.role !== 'superadmin') && user.email !== currentUser?.email && (
                  <button onClick={() => handleDeleteClick(user)} className="p-3 bg-stone-50 text-stone-400 border border-transparent hover:border-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-95" title="Eliminar Usuario">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          {/* Modal contenedor */}
          <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                {/* REGLA 4 */}
                <h3 className="text-2xl font-black text-stone-800 tracking-tight">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="group">
                    {/* REGLA 4: Labels */}
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-1">Nombre Completo *</label>
                    <div className="relative">
                      <span className="absolute left-5 inset-y-0 flex items-center justify-center text-stone-400 pointer-events-none group-focus-within:text-brand-500 transition-colors"><UserIcon size={18} /></span>
                      {/* REGLA 5: Inputs Burbuja */}
                      <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ej. Ricardo Montes" 
                        className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-1">Correo Electrónico *</label>
                    <div className="relative">
                      <span className="absolute left-5 inset-y-0 flex items-center justify-center text-stone-400 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Mail size={18} /></span>
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ejemplo@rancho.com" 
                        className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-1">Rol de Usuario *</label>
                    <div className="relative">
                      <span className="absolute left-5 inset-y-0 flex items-center justify-center text-stone-400 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Shield size={18} /></span>
                      <select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm appearance-none cursor-pointer">
                      {currentUser?.role === 'superadmin' && (
                        <option value="superadmin">Super Administrador</option>
                      )}
                        <option value="admin">Administrador</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-1">Nombre de Usuario *</label>
                      <div className="relative">
                        <span className="absolute left-5 inset-y-0 flex items-center justify-center text-stone-400 font-bold text-sm pointer-events-none group-focus-within:text-brand-500 transition-colors">@</span>
                        <input type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="usuario" 
                          className="w-full bg-stone-50 border border-stone-200 p-4 pl-10 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" />
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-1">Contraseña {editingUser ? '' : '*'}</label>
                      <div className="relative">
                        <span className="absolute left-5 inset-y-0 flex items-center justify-center text-stone-400 pointer-events-none group-focus-within:text-brand-500 transition-colors"><Shield size={18} /></span>
                        <input type="password" required={!editingUser} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? "••••••••" : "Contraseña"} 
                          className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  {/* REGLA 6: Botones */}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-95 border border-stone-200">Cancelar</button>
                  <button type="submit" disabled={!(formData.fullName.trim() && formData.email.trim() && formData.username.trim() && (editingUser || formData.password.trim()))} className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${!(formData.fullName.trim() && formData.email.trim() && formData.username.trim() && (editingUser || formData.password.trim())) ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600'}`}>
                    {editingUser ? <Save size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
});
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { KeyRound, Mail, Phone, Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { normalizePermissionIds, PERMISSIONS, PERMISSION_GROUPS, type PermissionId } from "@nexus/types";
import { apiUsers } from "../../../api";
import type { User } from "../../../types";
import { NexusCheckboxControl } from "../../ui/NexusCheckboxControl";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";

export interface UserFormRef {
  handleSave: () => void;
}

interface UserFormProps {
  user?: User | null;
  currentUserPermissions: PermissionId[];
  canManagePermissions: boolean;
  canManageRoles: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onSavingChange: (isSaving: boolean) => void;
  onValidationChange: (isValid: boolean) => void;
  onSaved: () => void;
}

type UserFormData = {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  role: User["role"];
  permissions: PermissionId[];
};

const permissionResourceLabel = (id: PermissionId) => {
  if (id.startsWith("raffles.coupons.")) return "Cupones de rifas";
  if (id.startsWith("raffles.participations.")) return "Participaciones";
  if (id.startsWith("raffles.intelligence.")) return "Audiencias e inteligencia";
  if (id.startsWith("raffles.settings.")) return "Configuración de rifas";
  if (id.startsWith("raffles.results.")) return "Resultados";
  if (id.startsWith("raffles.")) return "Rifas";
  if (id.startsWith("storefront.heroes.")) return "Héroes de tienda";
  if (id.startsWith("storefront.slides.")) return "Slider de inicio";
  if (id.startsWith("storefront.announcements.")) return "Avisos del Storefront";
  if (id.startsWith("storefront.status.")) return "Estado del Storefront";
  if (id.startsWith("storefront.branding.")) return "Identidad visual";
  if (id.startsWith("payment-links.")) return "Enlaces de pago";
  if (id.startsWith("orders.")) return "Pedidos";
  if (id.startsWith("products.")) return "Productos";
  if (id.startsWith("inventory.")) return "Inventario e integridad";
  if (id.startsWith("categories.")) return "Categorías y subcategorías";
  if (id.startsWith("media.vault.")) return "Bóveda de medios";
  if (id === "media.upload") return "Carga de archivos";
  if (id.startsWith("media.")) return "Galería de medios";
  if (id.startsWith("coupons.")) return "Cupones de tienda";
  if (id.startsWith("messaging.")) return "Comunicaciones";
  return "Otras acciones";
};

export const UserForm = forwardRef<UserFormRef, UserFormProps>(
  ({ user, currentUserPermissions, canManagePermissions, canManageRoles, showToast, onSavingChange, onValidationChange, onSaved }, ref) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const normalizedInitialPermissions = normalizePermissionIds(user?.permissions || []);
    const [formData, setFormData] = useState<UserFormData>(() => ({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      username: user?.username || "",
      password: "",
      role: user?.role || "staff",
      permissions: normalizedInitialPermissions,
    }));
    const isEditing = Boolean(user);
    const normalizedPhone = formData.phone.trim().replace(/[\s()-]/g, "");
    const isPhoneValid = !normalizedPhone || /^\+[1-9]\d{7,14}$/.test(normalizedPhone);
    const [activePermissionGroupId, setActivePermissionGroupId] = useState<string>(
      () => {
        const groupSummaries = PERMISSION_GROUPS.map((group) => {
          const permissions = PERMISSIONS.filter(
            (permission) => permission.group === group.id,
          );
          return {
            id: group.id,
            selectedCount: permissions.filter((permission) =>
              normalizedInitialPermissions.includes(permission.id),
            ).length,
            totalCount: permissions.length,
          };
        });
        groupSummaries.sort(
          (left, right) =>
            right.selectedCount - left.selectedCount ||
            right.totalCount - left.totalCount,
        );
        return groupSummaries[0]?.id ?? PERMISSION_GROUPS[0].id;
      },
    );
    const activePermissionGroup =
      PERMISSION_GROUPS.find((group) => group.id === activePermissionGroupId) ??
      PERMISSION_GROUPS[0];
    const activeGroupPermissions = PERMISSIONS.filter(
      (permission) => permission.group === activePermissionGroup.id,
    );
    const activePermissionSections = activeGroupPermissions.reduce<
      Array<{ label: string; permissions: typeof activeGroupPermissions }>
    >((sections, permission) => {
      const label = permissionResourceLabel(permission.id);
      const section = sections.find((item) => item.label === label);
      if (section) section.permissions.push(permission);
      else sections.push({ label, permissions: [permission] });
      return sections;
    }, []);
    const getGroupSelectionCount = (groupId: string) => {
      const groupPermissions = PERMISSIONS.filter(
        (permission) => permission.group === groupId,
      );
      return {
        selected: groupPermissions.filter((permission) =>
          formData.permissions.includes(permission.id),
        ).length,
        total: groupPermissions.length,
      };
    };
    const isValid = Boolean(
      formData.name.trim() &&
        formData.email.trim() &&
        formData.username.trim() &&
        isPhoneValid &&
        (isEditing || formData.password.length >= 8) &&
        (!formData.password || formData.password.length >= 8),
    );

    useImperativeHandle(
      ref,
      () => ({
        handleSave: () => formRef.current?.requestSubmit(),
      }),
      [],
    );

    useEffect(() => {
      onValidationChange(isValid);
    }, [isValid, onValidationChange]);

    useEffect(
      () => () => onValidationChange(false),
      [onValidationChange],
    );

    const updateField = <K extends keyof UserFormData>(
      field: K,
      value: UserFormData[K],
    ) => {
      setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isValid || isSaving) return;

      setIsSaving(true);
      onSavingChange(true);
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: normalizedPhone || null,
        username: formData.username.trim(),
        ...(formData.password ? { password: formData.password } : {}),
      };
      if (canManageRoles) payload.role = formData.role.toUpperCase();
      if (canManagePermissions) payload.permissions = formData.permissions;

      try {
        if (user) {
          await apiUsers.update(user.id, payload);
          showToast("Cambios guardados correctamente");
        } else {
          await apiUsers.create(payload);
          showToast("Usuario creado correctamente");
        }
        onSaved();
      } catch (error: any) {
        showToast(
          error?.response?.data?.message || "Error al guardar el usuario",
          "error",
        );
      } finally {
        setIsSaving(false);
        onSavingChange(false);
      }
    };

    return (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col"
        style={{ gap: "var(--space-lg)" }}
      >
        <NexusSection
          title="Cuenta e identidad"
          subtitle="Datos de acceso y contacto privado del miembro del equipo."
          icon={UserIcon}
          animate={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Nombre completo *"
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ej. Ricardo Montes"
              icon={UserIcon}
              autoComplete="name"
              required
            />
            <NexusInput
              label="Nombre de usuario *"
              value={formData.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="usuario"
              icon={UserIcon}
              autoComplete="username"
              required
            />
            <NexusInput
              label="Correo electrónico *"
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="nombre@rancho.com"
              icon={Mail}
              autoComplete="email"
              required
            />
            <NexusInput
              label="Teléfono privado"
              type="tel"
              value={formData.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+521234567890"
              icon={Phone}
              autoComplete="tel"
              helperText={isPhoneValid ? "Formato internacional. No se publica automáticamente." : "Usa formato internacional, por ejemplo +521234567890."}
            />
          </div>
        </NexusSection>

        <NexusSection
          title="Rol y credenciales"
          subtitle="El rol describe la cuenta; los permisos determinan lo que puede hacer."
          icon={Shield}
          animate={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            <NexusSelect
              label="Rol del usuario *"
              value={formData.role}
              onChange={(event) => updateField("role", event.target.value as User["role"])}
              icon={Shield}
              disabled={!canManageRoles}
              required
            >
              <option value="superadmin">Super administrador</option>
              <option value="admin">Administrador</option>
              <option value="staff">Staff</option>
            </NexusSelect>
            <NexusInput
              label={isEditing ? "Nueva contraseña (opcional)" : "Contraseña inicial *"}
              type="password"
              value={formData.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder={isEditing ? "Dejar en blanco para conservarla" : "Mínimo 8 caracteres"}
              icon={KeyRound}
              autoComplete="new-password"
              minLength={8}
              required={!isEditing}
              helperText={isEditing ? "Solo completa este campo si deseas cambiarla." : "El usuario podrá cambiarla desde su perfil."}
            />
          </div>
          <p className="mt-[var(--space-md)] text-secondary text-text-muted">
            {canManageRoles
              ? "El rol no concede permisos automáticamente. El acceso se configura de forma individual abajo."
              : "El rol de la cuenta está reservado a Superadmin. Los permisos determinan el acceso operativo."}
          </p>
        </NexusSection>

        <NexusSection
          title="Permisos"
          subtitle="Asigna únicamente las acciones que necesita este usuario."
          icon={ShieldCheck}
          animate={false}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div className="flex flex-wrap items-baseline justify-between" style={{ gap: "var(--space-xs) var(--space-md)" }}>
              <p className="text-secondary text-text-muted" aria-live="polite">
                {formData.permissions.length} de {PERMISSIONS.length} acciones asignadas
              </p>
              <p className="text-secondary text-text-muted">
                Solo puedes conceder permisos que ya tienes.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(13rem,0.34fr)_minmax(0,1fr)]" style={{ gap: "var(--space-lg)" }}>
              <nav
                aria-label="Áreas de permisos"
                className="hidden min-w-0 flex-col border-r border-border-main pr-[var(--space-md)] lg:flex"
              >
                {PERMISSION_GROUPS.map((group) => {
                  const counts = getGroupSelectionCount(group.id);
                  const isActive = group.id === activePermissionGroup.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setActivePermissionGroupId(group.id)}
                      className={`flex min-h-[var(--h-input)] w-full items-center justify-between text-left text-secondary transition-colors ${isActive ? "bg-brand-50 text-brand-600" : "text-text-main hover:bg-bg-muted"}`}
                      style={{ gap: "var(--space-sm)", paddingInline: "var(--space-sm)", borderRadius: "var(--radius-inner-visual)" }}
                    >
                      <span className="min-w-0">{group.label}</span>
                      <span className="shrink-0 text-caption text-text-muted">
                        {counts.selected}/{counts.total}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="min-w-0">
                <div className="mb-[var(--space-md)] lg:hidden">
                  <NexusSelect
                    label="Área de permisos"
                    value={activePermissionGroup.id}
                    onChange={(event) => setActivePermissionGroupId(event.target.value)}
                    icon={ShieldCheck}
                  >
                    {PERMISSION_GROUPS.map((group) => {
                      const counts = getGroupSelectionCount(group.id);
                      return (
                        <option key={group.id} value={group.id}>
                          {group.label} ({counts.selected}/{counts.total})
                        </option>
                      );
                    })}
                  </NexusSelect>
                </div>

                <div className="flex items-center justify-between border-b border-border-main pb-[var(--space-sm)] lg:pt-0" style={{ gap: "var(--space-md)" }}>
                  <h3 className="text-h3 font-semibold text-text-main">
                    {activePermissionGroup.label}
                  </h3>
                  <span className="shrink-0 text-caption text-text-muted">
                    {getGroupSelectionCount(activePermissionGroup.id).selected} de {activeGroupPermissions.length}
                  </span>
                </div>

                <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                  {activePermissionSections.map((section) => (
                    <section key={section.label}>
                      {activePermissionSections.length > 1 && (
                        <h4 className="pb-[var(--space-xs)] text-secondary font-semibold text-text-muted">
                          {section.label}
                        </h4>
                      )}
                      <div className="divide-y divide-border-main">
                        {section.permissions.map((permission) => {
                    const isSuperadminOnlyPermission = permission.id === "users.roles.manage" || permission.id.startsWith("platform.settings.");
                    const canDelegate = canManagePermissions && currentUserPermissions.includes(permission.id) &&
                      (!isSuperadminOnlyPermission || formData.role === "superadmin");
                    const checked = formData.permissions.includes(permission.id);
                    const needsMilestoneView =
                      permission.id === "dashboard.milestones.acknowledge" &&
                      !formData.permissions.includes("dashboard.milestones.view") &&
                      !currentUserPermissions.includes("dashboard.milestones.view");
                    const description = "description" in permission
                      ? permission.description
                      : undefined;
                    return (
                      <label
                        key={permission.id}
                        className={`flex min-h-[var(--h-input)] justify-between text-secondary ${description ? "items-start" : "items-center"} ${canDelegate || checked ? "cursor-pointer" : "cursor-not-allowed"} ${canDelegate ? "text-text-main" : "text-text-muted/70"} has-[:focus-visible]:rounded-[var(--radius-inner-visual)] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/10`}
                        style={{
                          gap: "var(--space-md)",
                          paddingBlock: description ? "var(--space-md)" : "var(--space-sm)",
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{permission.label}</span>
                          {description && (
                            <span className="mt-[var(--space-xs)] block text-secondary leading-relaxed text-text-muted">
                              {description}
                            </span>
                          )}
                        </span>
                        <NexusCheckboxControl
                          checked={checked}
                          disabled={!canManagePermissions || (!canDelegate && !checked) || needsMilestoneView}
                          onChange={() => {
                            const nextPermissions = checked
                              ? formData.permissions.filter(
                                  (item) =>
                                    item !== permission.id &&
                                    !(
                                      permission.id === "dashboard.milestones.view" &&
                                      item === "dashboard.milestones.acknowledge"
                                    ),
                                )
                              : [
                                  ...formData.permissions,
                                  permission.id,
                                  ...(permission.id === "dashboard.milestones.acknowledge" &&
                                  !formData.permissions.includes("dashboard.milestones.view")
                                    ? ["dashboard.milestones.view" as PermissionId]
                                    : []),
                                ];
                            updateField("permissions", nextPermissions);
                          }}
                        />
                      </label>
                    );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-secondary text-text-muted">
              {canManagePermissions
                ? "Solo puedes conceder permisos que ya tienes; los permisos ajenos se conservan y puedes retirarlos."
                : "No tienes permiso para modificar el acceso asignado a este usuario."}
            </p>
          </div>
        </NexusSection>

      </form>
    );
  },
);

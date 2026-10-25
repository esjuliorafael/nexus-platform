import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiAuth } from "../../api";
import type { OwnProfile } from "../../types";
import { NexusSpinner } from "../ui/NexusSpinner";
import { NexusSectionButton } from "../ui/NexusButton";
import { ProfileDetailsView } from "./ProfileDetailsView";
import { PublicContactView } from "./PublicContactView";
import { NotificationPreferencesView } from "./NotificationPreferencesView";
import { SecurityView } from "./SecurityView";
import type { ProfileViewMode, ToastHandler } from "./profileTypes";

export type { ProfileViewMode } from "./profileTypes";

interface ProfileViewProps {
  viewMode: ProfileViewMode;
  showToast: ToastHandler;
  onIdentityChange: (profile: OwnProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  viewMode,
  showToast,
  onIdentityChange,
}) => {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setProfile(await apiAuth.getProfile());
    } catch (error: any) {
      setLoadError(
        error?.response?.status === 401
          ? "La sesión no es válida. Vuelve a iniciar sesión."
          : "No se pudo cargar tu perfil. Verifica que la API local esté disponible e inténtalo de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleUpdated = (next: OwnProfile) => {
    setProfile(next);
    onIdentityChange(next);
  };

  if (isLoading) return <NexusSpinner label="Cargando tu perfil..." />;
  if (!profile) {
    return (
      <div role="alert" className="flex flex-col items-start" style={{ gap: "var(--space-md)" }}>
        <p className="text-sm text-stone-600 dark:text-stone-300">{loadError || "No se pudo cargar tu perfil."}</p>
        <NexusSectionButton icon={RefreshCw} variant="neutral" onClick={() => void loadProfile()}>
          Reintentar
        </NexusSectionButton>
      </div>
    );
  }

  if (viewMode === "contact") {
    return (
      <PublicContactView
        profile={profile}
        canPublish={profile.permissions.includes("users.manage")}
        showToast={showToast}
        saveContact={apiAuth.updateContact}
        onSaved={(result) => handleUpdated(result as OwnProfile)}
      />
    );
  }
  if (viewMode === "notifications") {
    return <NotificationPreferencesView profile={profile} onUpdated={handleUpdated} showToast={showToast} />;
  }
  if (viewMode === "security") {
    return <SecurityView showToast={showToast} />;
  }
  return <ProfileDetailsView profile={profile} onUpdated={handleUpdated} showToast={showToast} />;
};

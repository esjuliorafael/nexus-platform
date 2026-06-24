import React, { useEffect, useState } from "react";
import { apiAuth } from "../../api";
import type { OwnProfile } from "../../types";
import { NexusSpinner } from "../ui/NexusSpinner";
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

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    apiAuth.getProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => showToast("No se pudo cargar tu perfil", "error"))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleUpdated = (next: OwnProfile) => {
    setProfile(next);
    onIdentityChange(next);
  };

  if (isLoading || !profile) return <NexusSpinner label="Cargando tu perfil..." />;

  if (viewMode === "contact") {
    return (
      <PublicContactView
        profile={profile}
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

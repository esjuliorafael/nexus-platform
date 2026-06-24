import type { ContactProfile } from "../../types";

export type ProfileViewMode = "details" | "contact" | "notifications" | "security";

export interface ContactProfileOwner {
  id: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN" | "STAFF";
  contactProfile?: ContactProfile | null;
}

export type ToastHandler = (message: string, type?: "success" | "error") => void;

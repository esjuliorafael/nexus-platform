import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Hash,
  KeyRound,
  Layers3,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  User,
  Variable,
  WalletCards,
} from "lucide-react";
import { apiMercadoPago, apiSystem, apiWhatsApp } from "../../../api";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSectionCard } from "../../ui/NexusCard";
import {
  NexusAutonomousButton,
  NexusCardButton,
  NexusSectionButton,
} from "../../ui/NexusButton";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import { NexusCheckboxRow } from "../../ui/NexusCheckboxRow";
import { NexusSwitch } from "../../ui/NexusSwitch";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";
import { NexusSegmentedControl } from "../../ui/NexusSegmentedControl";
import {
  WhatsAppPairingData,
  WhatsAppPairingMethod,
  WhatsAppPairingModal,
  WHATSAPP_PAIRING_WINDOW_SECONDS,
} from "./WhatsAppPairingModal";
import {
  CHANNEL_TEMPLATE_SECTIONS,
  getChannelTemplateEditorContent,
  getTemplateStorageKey,
  getTemplateVariantContent,
  getTemplateVariantVariables,
  type ChannelTemplateScope,
  type ChannelTemplateDefinition,
  type ChannelTemplateVersion,
} from "./channelTemplateCatalog";
import { runKapsoOnboarding } from "./kapsoOnboarding";
import type { WhatsAppDeliveryStrategy } from "../../../types";

interface PrincipalChannelViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  templateEditorResetToken?: number;
  onTemplateEditorChange?: (editor: {
    label: string;
    provider: "EVOLUTION" | "CLOUD";
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    canActivate: boolean;
    activationLabel: string;
    onActivate: () => void;
  } | null) => void;
}

type ModalType = "bank" | "mercadopago" | "whatsapp" | null;

const previewMessage = (content: string) => {
  const ticketList =
    "002, 005, 009 y 010\n\n\u2728 Oportunidades adicionales:\n\n002: 164, 246, 271, 635, 701, 888, 986\n005: 171, 265, 534, 817, 929, 943, 976\n009: 212, 430, 516, 605, 626, 752, 882\n010: 405, 423, 436, 441, 538, 728, 963";

  return (
    content ||
    "Hola {{customer_name}}, este es un mensaje de ejemplo para validar variables y tono."
  )
    .replace(/\{\{greeting\}\}/g, "Buena tarde")
    .replace(/\{\{customer_name\}\}/g, "Carlos Ramirez")
    .replace(/\{\{order_id\}\}/g, "1284")
    .replace(/\{\{item_list\}\}/g, "1x Gallo colorado, 2x Alimento premium")
    .replace(/\{\{ticket_list\}\}/g, ticketList)
    .replace(/\{\{raffle_name\}\}/g, "Rifa Especial de Junio")
    .replace(/\{\{raffle_date\}\}/g, "Hoy, 31 de julio de 2026 a las 8:00 p. m.")
    .replace(/\{\{opening_date\}\}/g, "Lunes, 20 de julio de 2026, 8:00 a. m.")
    .replace(/\{\{ticket_price\}\}/g, "320.00")
    .replace(/\{\{raffle_url\}\}/g, "https://rancholastrojes.com.mx/raffles/1")
    .replace(/\{\{participation_url\}\}/g, "https://rancholastrojes.com.mx/participations/demo")
    .replace(/\{\{recovery_url\}\}/g, "https://rancholastrojes.com.mx/checkout/recovery/demo")
    .replace(/\{\{expires_at\}\}/g, "hoy a las 8:00 p. m.")
    .replace(/\{\{place\}\}/g, "Primer lugar")
    .replace(/\{\{prize\}\}/g, "Premio principal")
    .replace(/\{\{winning_number\}\}/g, "922")
    .replace(/\{\{prize_list\}\}/g, "Primer lugar: Premio principal")
    .replace(
      /\{\{participation_rule\}\}/g,
      "Tu boleto participa con 8 números: el número que eliges y 7 oportunidades adicionales.",
    )
    .replace(
      /\{\{winning_rule\}\}/g,
      "El número ganador se determina con los últimos 3 dígitos del Premio Mayor de la Lotería Nacional.",
    )
    .replace(/\{\{winning_number_list\}\}/g, "Primer lugar: 922 (boleto 001)")
    .replace(/\{\{result_list\}\}/g, "Primer lugar: número 922, boleto 001")
    .replace(/\{\{amount\}\}/g, "1,250.00")
    .replace(
      /\{\{bank_info\}\}/g,
      "Banco: BBVA\nBeneficiario: Rancho Demo\nNo. Cuenta: 1234567890\nCLABE: 012345678901234567\nTarjeta: 1234 5678 9012 3456",
    )
    .replace(/\{\{bank_name\}\}/g, "BBVA")
    .replace(/\{\{bank_beneficiary\}\}/g, "Rancho Demo")
    .replace(/\{\{bank_account\}\}/g, "1234567890")
    .replace(/\{\{bank_clabe\}\}/g, "012345678901234567")
    .replace(/\{\{bank_card\}\}/g, "1234 5678 9012 3456")
    .replace(/\{\{time_store\}\}/g, "24 horas")
    .replace(/\{\{time_raffle\}\}/g, "12 horas")
    .replace(/\{\{time_remaining\}\}/g, "4 horas")
    .replace(/\{\{opportunity_count\}\}/g, "8")
    .replace(/\{\{additional_opportunity_count\}\}/g, "7")
    .replace(
      /\n*Consulta el detalle de tu participaci[^\n]*:\s*\n\s*\{\{participation_url\}\}/i,
      "",
    );
};

export const PrincipalChannelView: React.FC<PrincipalChannelViewProps> = ({
  showToast,
  setConfirmDialog,
  templateEditorResetToken = 0,
  onTemplateEditorChange,
}) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingKapso, setIsConnectingKapso] = useState(false);
  const [isSyncingCloudTemplates, setIsSyncingCloudTemplates] = useState(false);
  const [cloudTemplatesReady, setCloudTemplatesReady] = useState(false);
  const [templateProvider, setTemplateProvider] = useState<"EVOLUTION" | "CLOUD">("EVOLUTION");
  const [templateVersion, setTemplateVersion] = useState<ChannelTemplateVersion>("LEGACY");
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [cloudTemplateStatus, setCloudTemplateStatus] = useState<any>(null);
  const [isLoadingCloudTemplateStatus, setIsLoadingCloudTemplateStatus] =
    useState(false);
  const [specializedCloudChannels, setSpecializedCloudChannels] = useState<any[]>([]);
  const [selectedPrincipalChannel, setSelectedPrincipalChannel] = useState(true);
  const [selectedSpecializedChannelIds, setSelectedSpecializedChannelIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [instanceStatus, setInstanceStatus] = useState<
    "open" | "close" | "connecting" | "loading"
  >("loading");
  const [pairingData, setPairingData] = useState<WhatsAppPairingData | null>(
    null,
  );
  const [editingTemplate, setEditingTemplate] = useState<{
    type: ChannelTemplateDefinition["type"];
    scope: ChannelTemplateScope;
    key: string;
    label: string;
    variables: string[];
    defaultContent?: string;
    baseKey?: string;
    isTemporaryFallback?: boolean;
    version: ChannelTemplateVersion;
  } | null>(null);
  const [confirmDisconnectMP, setConfirmDisconnectMP] = useState(false);
  const [confirmDisconnectWhatsApp, setConfirmDisconnectWhatsApp] =
    useState(false);
  const [confirmDisconnectKapso, setConfirmDisconnectKapso] = useState(false);
  const [showMissingPhoneAlert, setShowMissingPhoneAlert] = useState(false);
  const [isDisconnectingMP, setIsDisconnectingMP] = useState(false);
  const [isDisconnectingKapso, setIsDisconnectingKapso] = useState(false);
  const principalTemplatesScrollYRef = useRef(0);
  const principalTemplateAnchorKeyRef = useRef<string | null>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      setConfig(await apiSystem.getConfig());
    } catch (error) {
      showToast("Error al cargar Canal Principal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const principalInstance = useMemo(() => {
    const prefix = config.whatsapp_evolution_instance || "nexus";
    // If the prefix already contains '_main' or '_principal', don't add it again
    if (prefix.endsWith("_main") || prefix.endsWith("_principal"))
      return prefix;
    return `${prefix}_main`;
  }, [config.whatsapp_evolution_instance]);
  const whatsappProvider =
    config.whatsapp_main_provider === "KAPSO" ? "KAPSO" : "EVOLUTION";
  const kapsoDeliveryEnabled = !["0", "false", "off", "disabled"].includes(
    String(config.whatsapp_kapso_delivery_enabled ?? "1").toLowerCase(),
  );
  const kapsoServerEnabled = config.whatsapp_kapso_server_enabled === "1";
  const kapsoDeliveryEffective = kapsoDeliveryEnabled && kapsoServerEnabled;

  const checkInstanceStatus = async (name = principalInstance) => {
    if (!name) {
      setInstanceStatus("close");
      return "close";
    }
    setInstanceStatus("loading");
    try {
      await apiWhatsApp.configureWebhook(name);
      const res = await apiWhatsApp.getStatus(name);
      const state = res.data.instance.state;
      setInstanceStatus(state);
      return state;
    } catch (error) {
      setInstanceStatus("close");
      return "close";
    }
  };

  const checkKapsoStatus = async () => {
    const phoneNumberId = config.whatsapp_main_kapso_phone_number_id || "";
    if (!phoneNumberId.trim()) {
      setInstanceStatus("close");
      return "close";
    }
    setInstanceStatus("loading");
    try {
      const response = await apiWhatsApp.getKapsoStatus(
        phoneNumberId,
        config.whatsapp_main_kapso_business_account_id,
      );
      const status = String(
        response.data?.phoneNumber?.status ||
          response.data?.phoneNumber?.connection_status ||
          "",
      ).toUpperCase();
      const state = status === "CONNECTED" ? "open" : "close";
      setInstanceStatus(state);
      return state;
    } catch {
      setInstanceStatus("close");
      return "close";
    }
  };

  const checkCloudTemplateReadiness = async () => {
    try {
      const response = await apiWhatsApp.getKapsoTemplateReadiness();
      const ready = Boolean(response.data?.ready);
      setCloudTemplatesReady(ready);
      return ready;
    } catch {
      setCloudTemplatesReady(false);
      return false;
    }
  };

  useEffect(() => {
    if (whatsappProvider === "KAPSO") {
      if (config.whatsapp_main_kapso_phone_number_id) {
        checkKapsoStatus();
        checkCloudTemplateReadiness();
      }
      return;
    }
    if (config.whatsapp_evolution_instance)
      checkInstanceStatus(principalInstance);
  }, [
    whatsappProvider,
    config.whatsapp_evolution_instance,
    config.whatsapp_main_kapso_phone_number_id,
    principalInstance,
  ]);

  useEffect(() => {
    let timer: any;
    let poll: any;
    if (pairingData?.instanceName) {
      timer = setInterval(() => {
        setPairingData((prev) =>
          prev ? { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) } : null,
        );
      }, 1000);
      poll = setInterval(async () => {
        const state = await checkInstanceStatus(pairingData.instanceName);
        if (state === "open") {
          showToast("Dispositivo principal vinculado");
          setPairingData(null);
        }
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [pairingData?.instanceName]);

  const openWhatsAppFlow = async (method: WhatsAppPairingMethod) => {
    if (!config.whatsapp_main_phone?.trim()) {
      setShowMissingPhoneAlert(true);
      return;
    }
    try {
      const instanceName = principalInstance;
      const prefix = config.whatsapp_evolution_instance || "nexus";

      // Update config with the clean prefix, NOT the computed instance name
      await updateConfig(
        {
          whatsapp_main_phone: config.whatsapp_main_phone || "",
          whatsapp_evolution_instance: prefix,
        },
        false,
      );

      const res = await apiWhatsApp.connect(
        instanceName,
        method,
        config.whatsapp_main_phone,
      );
      const value = method === "qr" ? res.data?.base64 : res.data?.pairingCode;
      if (!value) throw new Error("Evolution API no devolvió un código");

      setPairingData({
        method,
        base64: res.data?.base64,
        pairingCode: res.data?.pairingCode,
        instanceName,
        timeLeft: WHATSAPP_PAIRING_WINDOW_SECONDS,
      });
    } catch (error: any) {
      showToast(
        error?.response?.data?.error ||
          (method === "qr"
            ? "No se pudo generar el QR principal"
            : "No se pudo generar el código de emparejamiento"),
        "error",
      );
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await apiWhatsApp.disconnect(principalInstance);
      setInstanceStatus("close");
      setConfirmDisconnectWhatsApp(false);
      showToast("Dispositivo principal desvinculado");
    } catch (error) {
      showToast("No se pudo desvincular el dispositivo principal", "error");
    }
  };

  const connectMercadoPago = async () => {
    try {
      const url = await apiMercadoPago.getAuthUrl();
      if (url) window.location.href = url;
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Error al conectar con Mercado Pago",
        "error",
      );
    }
  };

  const disconnectMercadoPago = async () => {
    setIsDisconnectingMP(true);
    try {
      await apiMercadoPago.disconnectMain();
      setConfig((prev) => ({
        ...prev,
        mp_seller_access_token: "",
        mp_seller_refresh_token: "",
        mp_seller_user_id: "",
        mp_main_checkout_enabled: "0",
      }));
      setConfirmDisconnectMP(false);
      showToast("Mercado Pago desvinculado");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo desvincular Mercado Pago",
        "error",
      );
    } finally {
      setIsDisconnectingMP(false);
    }
  };

  const updateConfig = async (
    data: Record<string, string>,
    closeModal = true,
  ) => {
    setIsSaving(true);
    try {
      await apiSystem.updateConfig(data);
      setConfig((prev) => ({ ...prev, ...data }));
      showToast("Canal Principal actualizado");
      if (closeModal) {
        setModal(null);
        setEditingTemplate(null);
      }
    } catch (error) {
      showToast("No se pudo guardar la configuracion", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const syncCloudTemplates = async (
    manageLoading = true,
    variant: ChannelTemplateVersion = "LEGACY",
  ) => {
    const cloudConfig = {
      whatsapp_main_phone: config.whatsapp_main_phone || "",
      whatsapp_main_provider: "KAPSO",
      whatsapp_evolution_instance:
        config.whatsapp_evolution_instance || principalInstance,
      whatsapp_main_kapso_phone_number_id:
        config.whatsapp_main_kapso_phone_number_id || "",
      whatsapp_main_kapso_business_account_id:
        config.whatsapp_main_kapso_business_account_id || "",
    };
    if (
      !cloudConfig.whatsapp_main_kapso_phone_number_id ||
      !cloudConfig.whatsapp_main_kapso_business_account_id
    ) {
      showToast("Configura Phone Number ID y Business Account ID", "error");
      return;
    }

    if (manageLoading) setIsSyncingCloudTemplates(true);
    try {
      await apiSystem.updateConfig(cloudConfig);
      setConfig((prev) => ({ ...prev, ...cloudConfig }));
      const response = await apiWhatsApp.syncKapsoTemplates(undefined, variant);
      const templates = response.data?.templates || [];
      const pending = templates.filter(
        (template: any) => template.status === "PENDING",
      ).length;
      const rejected = templates.filter(
        (template: any) =>
          template.status === "REJECTED" || template.status === "ERROR",
      ).length;
      setCloudTemplatesReady(Boolean(response.data?.ready));
      showToast(
        response.data?.ready
          ? "Plantillas Cloud aprobadas y listas"
          : rejected
            ? `${rejected} plantillas requieren correccion`
            : `${pending} plantillas siguen en revision de Meta`,
        rejected ? "error" : "success",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudieron sincronizar las plantillas Cloud",
        "error",
      );
    } finally {
      if (manageLoading) setIsSyncingCloudTemplates(false);
    }
  };

  const connectKapso = async () => {
    setIsConnectingKapso(true);
    try {
      await runKapsoOnboarding({ target: "PRINCIPAL" });
      showToast("WhatsApp Business principal conectado mediante Kapso");
      await loadConfig();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo conectar WhatsApp con Kapso",
        "error",
      );
    } finally {
      setIsConnectingKapso(false);
    }
  };

  const disconnectKapso = async () => {
    setIsDisconnectingKapso(true);
    try {
      await apiWhatsApp.disconnectKapso({ target: "PRINCIPAL" });
      setConfirmDisconnectKapso(false);
      showToast("Cloud API desvinculada del Canal Principal");
      await loadConfig();
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo desvincular el número de Kapso",
        "error",
      );
    } finally {
      setIsDisconnectingKapso(false);
    }
  };

  const bankReady = Boolean(
    config.bank_main_name && config.bank_main_beneficiary,
  );
  const mpReady = Boolean(config.mp_seller_access_token);
  const mpCheckoutEnabled = mpReady && config.mp_main_checkout_enabled !== "0";
  const waReady = Boolean(
    config.whatsapp_main_phone &&
    instanceStatus === "open" &&
    (whatsappProvider === "KAPSO"
      ? config.whatsapp_main_kapso_phone_number_id &&
        config.whatsapp_main_kapso_business_account_id &&
        cloudTemplatesReady
      : config.whatsapp_evolution_instance),
  );

  const templateCounts = useMemo(() => {
    const flat = CHANNEL_TEMPLATE_SECTIONS.flatMap((section) =>
      section.groups.flatMap((group) => group.templates),
    );
    return flat.filter((template) => Boolean(config[template.key])).length;
  }, [config]);

  const openTemplateEditor = (
    template: ChannelTemplateDefinition,
    scope: ChannelTemplateScope,
  ) => {
    principalTemplatesScrollYRef.current = window.scrollY;
    principalTemplateAnchorKeyRef.current = template.key;
    setEditingTemplate({
      ...template,
      scope,
      version: templateVersion,
      variables: getTemplateVariantVariables(template, templateVersion, scope),
    });
    setTemplateProvider("EVOLUTION");
    setIsTemplateDirty(false);
    setCloudTemplateStatus(null);
    setIsLoadingCloudTemplateStatus(false);
    setIsVersionsOpen(false);
    window.scrollTo(0, 0);
  };

  const loadVersionTargets = async () => {
    try {
      const channels = await apiWhatsApp.getAll();
      const linked = channels.filter(
        (channel) =>
          channel.provider === "KAPSO" &&
          Boolean(channel.kapsoPhoneNumberId && channel.kapsoBusinessAccountId),
      );
      setSpecializedCloudChannels(linked);
      setSelectedPrincipalChannel(true);
      setSelectedSpecializedChannelIds(linked.map((channel) => channel.id));
    } catch {
      setSpecializedCloudChannels([]);
      setSelectedPrincipalChannel(true);
      setSelectedSpecializedChannelIds([]);
    }
  };

  const syncSelectedCloudTargets = async () => {
    setIsSyncingCloudTemplates(true);
    try {
      if (selectedPrincipalChannel) {
        await syncCloudTemplates(false, templateVersion);
      }
      for (const channelId of selectedSpecializedChannelIds) {
        await apiWhatsApp.syncKapsoTemplates(channelId, templateVersion);
      }
      showToast(
        selectedPrincipalChannel && selectedSpecializedChannelIds.length
          ? "Plantillas sincronizadas en los canales seleccionados"
          : selectedPrincipalChannel
            ? "Plantillas del Canal Principal sincronizadas"
            : "Plantillas del Canal Especializado sincronizadas",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudieron sincronizar todos los canales",
        "error",
      );
    } finally {
      setIsSyncingCloudTemplates(false);
    }
  };

  const editorContent = editingTemplate
    ? getChannelTemplateEditorContent(
        editingTemplate,
        config,
        editingTemplate.version,
        editingTemplate.scope,
      )
    : "";

  useEffect(() => {
    if (!editingTemplate || templateProvider !== "CLOUD") {
      setCloudTemplateStatus(null);
      setIsLoadingCloudTemplateStatus(false);
      return;
    }
    let cancelled = false;
    setIsLoadingCloudTemplateStatus(true);
    void apiWhatsApp
      .getKapsoTemplateReadiness(
        undefined,
        editingTemplate.version,
      )
      .then((response) => {
        if (cancelled) return;
        const match = (response.data?.templates || []).find(
          (item: any) =>
            item.scope === editingTemplate.scope &&
            item.type === editingTemplate.type &&
            (item.variant || "LEGACY") === editingTemplate.version,
        );
        setCloudTemplateStatus(match || null);
        setIsLoadingCloudTemplateStatus(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCloudTemplateStatus(null);
          setIsLoadingCloudTemplateStatus(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editingTemplate?.key, editingTemplate?.type, editingTemplate?.scope, templateProvider]);

  useEffect(() => {
    if (!onTemplateEditorChange) return;
    if (!editingTemplate) {
      onTemplateEditorChange(null);
      return;
    }
    const activeVersionKey = `${editingTemplate.key}_active_version_${templateProvider.toLowerCase()}`;
    const isActive = (config[activeVersionKey] || "LEGACY") === editingTemplate.version;
    const canActivate =
      !isTemplateDirty &&
      Boolean(editorContent.trim()) &&
      (templateProvider === "EVOLUTION" ||
        (editingTemplate.version === "LEGACY" ||
          (cloudTemplateStatus?.status === "APPROVED" && cloudTemplateStatus?.current)));
    const activate = () => {
      if (!canActivate || isActive) return;
      setConfirmDialog({
        isOpen: true,
        title: editingTemplate.version === "SIMPLIFIED" ? "Activar versión simplificada" : "Restaurar versión Legacy",
        message:
          templateProvider === "CLOUD" && editingTemplate.version === "SIMPLIFIED"
            ? "Solo se activará la versión simplificada si Cloud API ya la tiene aprobada. La versión anterior seguirá disponible como respaldo."
            : "Esta versión se usará para las siguientes notificaciones de este tipo en el proveedor seleccionado.",
        confirmLabel: editingTemplate.version === "SIMPLIFIED" ? "Activar Simplificada" : "Usar Legacy",
        variant: "brand",
        onConfirm: async () => {
          await updateConfig({ [activeVersionKey]: editingTemplate.version }, false);
          setConfirmDialog({ isOpen: false });
        },
      });
    };
    onTemplateEditorChange({
      label: editingTemplate.label,
      provider: templateProvider,
      isDirty: isTemplateDirty,
      isSaving,
      canActivate: canActivate && !isActive,
      activationLabel: isActive
        ? "Versión Activa"
        : editingTemplate.version === "SIMPLIFIED"
          ? "Activar Simplificada"
          : "Usar Legacy",
      onActivate: activate,
      onSave: () => {
        if (!isTemplateDirty) return;
        setConfirmDialog({
          isOpen: true,
          title: "Guardar plantilla",
          message:
            "Los cambios se guardarán en Nexus. La sincronización con Cloud API es una acción separada y no reemplazará la plantilla aprobada automáticamente.",
          confirmLabel: "Guardar Plantilla",
          variant: "brand",
          onConfirm: async () => {
            await updateConfig(
              { [getTemplateStorageKey(editingTemplate, editingTemplate.version)]: editorContent },
              false,
            );
            setIsTemplateDirty(false);
            setConfirmDialog({ isOpen: false });
          },
        });
      },
    });
  }, [editingTemplate?.key, editingTemplate?.label, editingTemplate?.version, templateProvider, isTemplateDirty, isSaving, editorContent, config, cloudTemplateStatus]);

  useEffect(() => {
    if (templateEditorResetToken === 0) return;
    setEditingTemplate(null);
    setIsTemplateDirty(false);
    setIsVersionsOpen(false);
    setCloudTemplateStatus(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchorKey = principalTemplateAnchorKeyRef.current;
        const anchor = anchorKey
          ? document.getElementById(
              `principal-template-${anchorKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
            )
          : null;

        if (anchor) {
          anchor.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
          anchor.focus({ preventScroll: true });
          return;
        }

        window.scrollTo(0, principalTemplatesScrollYRef.current);
      });
    });
  }, [templateEditorResetToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
          <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" />
        </div>
        <p className="text-label text-text-muted">
          Cargando Canal Principal...
        </p>
      </div>
    );
  }

  if (editingTemplate) {
    const hasCloudReplacement = Boolean(cloudTemplateStatus?.replacementPending);
    const currentTemplateStorageKey = getTemplateStorageKey(
      editingTemplate,
      editingTemplate.version,
    );
    const hasUnsyncedCloudVersion =
      templateProvider === "CLOUD" &&
      editingTemplate.version === "SIMPLIFIED" &&
      Boolean(config[currentTemplateStorageKey]?.trim()) &&
      !(cloudTemplateStatus?.current && cloudTemplateStatus.status === "APPROVED");
    const hasPendingCloudSync =
      isTemplateDirty || hasCloudReplacement || hasUnsyncedCloudVersion;
    return (
      <div className="pb-20 animate-in fade-in duration-300">
        <NexusSection
          title={editingTemplate.label}
          subtitle={
            editingTemplate.isTemporaryFallback
              ? "Respaldo temporal de Cloud API mientras Meta aprueba las versiones can\u00f3nicas."
              : "Plantilla can\u00f3nica utilizada por el Canal Principal y todos los Canales Especializados"
          }
          icon={FileText}
          iconVariant="brand"
          action={
              <div className="flex flex-wrap items-center" style={{ gap: "var(--space-sm)" }}>
                {templateProvider === "CLOUD" && (
                  <NexusSectionButton
                    variant="secondary"
                    icon={Layers3}
                    onClick={() => {
                      setIsVersionsOpen(true);
                      void loadVersionTargets();
                    }}
                  >
                    Versiones
                  </NexusSectionButton>
                )}
                <NexusSectionButton
                  variant="brand"
                  icon={ArrowLeftRight}
                  onClick={() =>
                    setTemplateProvider((current) =>
                      current === "CLOUD" ? "EVOLUTION" : "CLOUD",
                    )
                  }
                >
                  {templateProvider === "CLOUD" ? "Ver Evolution API" : "Ver Cloud API"}
                </NexusSectionButton>
              </div>
          }
        >
          {templateProvider === "CLOUD" && (
            <div
              className="flex flex-col border border-border-main bg-bg-muted"
              style={{
                gap: "var(--space-xs)",
                padding: "var(--padding-card-inner)",
                borderRadius: "var(--radius-inner-visual)",
                marginBottom: "var(--space-lg)",
              }}
              role="status"
            >
              <p className="text-label font-bold text-text-main">
                {isLoadingCloudTemplateStatus
                  ? "Consultando estado de Cloud API"
                  : cloudTemplateStatus?.status === "APPROVED"
                  ? cloudTemplateStatus.current
                    ? "Versión Cloud API activa"
                    : "Versión Cloud API aprobada, pendiente de activar"
                  : cloudTemplateStatus?.status === "PENDING"
                    ? "Versión Cloud API en revisión de Meta"
                    : cloudTemplateStatus?.status === "REJECTED"
                      ? "Versión Cloud API rechazada"
                      : "Versión Cloud API aún no sincronizada"}
              </p>
              <p className="text-secondary text-text-muted">
                {isLoadingCloudTemplateStatus
                  ? "Verificando la plantilla sincronizada y su estado en Meta."
                  : cloudTemplateStatus?.replacementPending
                  ? "La versión aprobada anterior permanece activa mientras esta versión se revisa."
                  : "Guardar aquí solo actualiza Nexus. Sincronizar con Kapso/Meta es un paso separado."}
              </p>
            </div>
          )}
          <div
            className="grid grid-cols-1 xl:grid-cols-2"
            style={{ gap: "var(--space-lg)" }}
          >
            <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
              <NexusTextarea
                label="Mensaje del Canal Principal"
                rows={12}
                value={editorContent}
                readOnly={editingTemplate.isTemporaryFallback}
                onChange={(event) =>
                  (() => {
                    setConfig((prev) => ({
                      ...prev,
                      [getTemplateStorageKey(editingTemplate, editingTemplate.version)]: event.target.value,
                    }));
                    setIsTemplateDirty(true);
                  })()
                }
                placeholder="Escribe el mensaje que recibira el cliente..."
              />
              <div
                className="bg-bg-muted border border-border-main"
                style={{
                  padding: "var(--padding-inner)",
                  borderRadius: "var(--radius-inner-visual)",
                }}
              >
                <p className="text-label text-text-muted" style={{ marginBottom: "var(--space-md)" }}>
                  Variables disponibles
                </p>
                <div className="flex flex-wrap" style={{ gap: "var(--space-sm)" }}>
                  {editingTemplate.variables.map((variable) => (
                    <span
                      key={variable}
                      className="bg-bg-card border border-border-main text-label text-text-muted"
                      style={{
                        paddingInline: "var(--space-base)",
                        paddingBlock: "var(--space-xs)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="border border-border-main bg-bg-card"
              style={{
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <div className="flex items-center" style={{ gap: "var(--space-md)" }}>
                <div
                  className="flex shrink-0 items-center justify-center bg-bg-muted text-text-muted"
                  style={{
                    width: "var(--size-icon-card)",
                    height: "var(--size-icon-card)",
                    borderRadius: "var(--radius-card-nested-compact)",
                  }}
                >
                  <Variable size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-h2 text-text-main">Preview</h4>
                  <p className="text-secondary text-text-muted">Ejemplo con datos simulados</p>
                </div>
              </div>
              <div
                className="whitespace-pre-line text-secondary text-text-main leading-relaxed min-h-[16rem]"
                style={{
                  marginTop: "var(--space-lg)",
                  padding: "var(--padding-card-inner)",
                  borderRadius: "var(--radius-nested-compact)",
                  background: "var(--bg-muted)",
                }}
              >
                {previewMessage(editorContent)}
              </div>
            </div>
          </div>
          {isVersionsOpen && (
            <NexusModal
              isOpen
              onClose={() => setIsVersionsOpen(false)}
              title="Versiones de la plantilla"
              eyebrow={editingTemplate.label}
              icon={FileText}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
                <div
                  className="flex flex-col border border-border-main bg-bg-muted"
                  style={{
                    gap: "var(--space-xs)",
                    padding: "var(--padding-card-inner)",
                    borderRadius: "var(--radius-inner-visual)",
                  }}
                >
                  <p className="text-h2 font-semibold text-text-main">Versión Activa</p>
                  <p className="text-secondary text-text-muted">
                    {cloudTemplateStatus?.current && cloudTemplateStatus.status === "APPROVED"
                      ? cloudTemplateStatus.templateName || "Aprobada en Cloud API"
                      : "Nexus seguirá usando la versión aprobada anterior."}
                  </p>
                  <span className="text-label text-text-muted">
                    {cloudTemplateStatus?.current && cloudTemplateStatus.status === "APPROVED"
                      ? "Aprobada y activa"
                      : "Sin cambios en el envío actual"}
                  </span>
                 </div>
                 {hasCloudReplacement && (
                   <div
                     className="flex flex-col border border-border-main bg-bg-muted"
                     style={{
                       gap: "var(--space-xs)",
                       padding: "var(--padding-card-inner)",
                       borderRadius: "var(--radius-inner-visual)",
                     }}
                   >
                  <p className="text-h2 font-semibold text-text-main">Nueva versión</p>
                  <p className="text-secondary text-text-muted">
                    {cloudTemplateStatus?.status === "PENDING"
                      ? "En revisión de Meta"
                      : cloudTemplateStatus?.status === "APPROVED"
                        ? "Aprobada y lista para activar"
                        : cloudTemplateStatus?.status === "REJECTED"
                          ? cloudTemplateStatus.lastError || "Rechazada por Meta"
                          : "Todavía no sincronizada"}
                  </p>
                 </div>
                 )}
                 <div
                   className="flex flex-col border border-border-main bg-bg-muted"
                   style={{
                     gap: "var(--space-xs)",
                     padding: "var(--padding-card-inner)",
                     borderRadius: "var(--radius-inner-visual)",
                   }}
                 >
                  <p className="text-h2 font-semibold text-text-main">Canales de sincronización</p>
                  <p className="text-secondary text-text-muted">
                    La versión nueva se enviará solo a los canales que selecciones.
                  </p>
                  <NexusCheckboxRow
                    checked={selectedPrincipalChannel}
                    onChange={() => setSelectedPrincipalChannel((selected) => !selected)}
                    label="Canal Principal"
                  />
                  {specializedCloudChannels.length === 0 ? (
                    <p className="text-label text-text-muted" style={{ marginTop: "var(--space-md)" }}>
                      No hay Canales Especializados vinculados a Cloud API.
                    </p>
                  ) : (
                    specializedCloudChannels.map((channel) => (
                      <NexusCheckboxRow
                        key={channel.id}
                        checked={selectedSpecializedChannelIds.includes(channel.id)}
                        onChange={() =>
                          setSelectedSpecializedChannelIds((current) =>
                            current.includes(channel.id)
                              ? current.filter((id) => id !== channel.id)
                              : [...current, channel.id],
                          )
                        }
                        label={channel.name}
                      />
                    ))
                  )}
                </div>
                <NexusModalActions className="w-full [&>button]:w-full">
                  <NexusSectionButton
                    variant="secondary"
                    onClick={() => {
                      setIsVersionsOpen(false);
                      void syncSelectedCloudTargets();
                    }}
                     disabled={
                       !hasPendingCloudSync ||
                       (!selectedPrincipalChannel && selectedSpecializedChannelIds.length === 0)
                     }
                     title={
                       !hasPendingCloudSync
                         ? "No hay cambios pendientes"
                         : selectedPrincipalChannel || selectedSpecializedChannelIds.length
                           ? undefined
                           : "Selecciona al menos un canal"
                     }
                     isLoading={isSyncingCloudTemplates}
                  >
                    Sincronizar Cloud API
                  </NexusSectionButton>
                </NexusModalActions>
              </div>
            </NexusModal>
          )}
        </NexusSection>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      <NexusSection
        title="Canal Principal"
        subtitle="Fuente central de plantillas y respaldo operativo para todos los canales"
        icon={WalletCards}
        iconVariant="brand"
      >
        <div className="flex flex-col gap-5">
          <NexusSectionCard
            icon={Banknote}
            iconVariant={bankReady ? "emerald" : "muted"}
            title="Informacion Bancaria"
            subtitle={
              bankReady
                ? `${config.bank_main_name} / ${config.bank_main_beneficiary}`
                : "Configuracion parcial o pendiente"
            }
            rightContent={
              <p className="text-label text-text-muted">
                {bankReady ? "Completado" : "Parcial"}
              </p>
            }
            actions={
              <NexusCardButton onClick={() => setModal("bank")} icon={Edit2}>
                Configurar
              </NexusCardButton>
            }
          />
          <NexusSectionCard
            icon={CreditCard}
            iconVariant={mpReady ? "blue" : "muted"}
            title="Mercado Pago Principal"
            subtitle={
              mpReady
                ? `${mpCheckoutEnabled ? "Disponible en checkout" : "Vinculado, oculto en checkout"} · ${config.mp_statement_descriptor || "NEXUS*SHOP"}`
                : "Pasarela principal pendiente"
            }
            rightContent={
              <div
                className="flex flex-col items-center"
                style={{ gap: "var(--space-xs)" }}
              >
                <NexusSwitch
                  checked={mpCheckoutEnabled}
                  disabled={!mpReady || isSaving}
                  onChange={(checked) =>
                    updateConfig(
                      { mp_main_checkout_enabled: checked ? "1" : "0" },
                      false,
                    )
                  }
                  aria-label={
                    mpCheckoutEnabled
                      ? "Ocultar Mercado Pago del checkout"
                      : "Mostrar Mercado Pago en checkout"
                  }
                  title={
                    mpReady
                      ? undefined
                      : "Vincula Mercado Pago para activarlo en checkout"
                  }
                />
                <span
                  className={`text-label uppercase tracking-[0.15em] transition-colors duration-500 ${mpCheckoutEnabled ? "text-text-muted" : "text-text-muted/40"}`}
                >
                  {mpCheckoutEnabled ? "Activo" : "Inactivo"}
                </span>
              </div>
            }
            actions={
              <NexusCardButton
                onClick={() => setModal("mercadopago")}
                icon={Edit2}
              >
                Configurar
              </NexusCardButton>
            }
          />
          <NexusSectionCard
            icon={MessageCircle}
            iconVariant={waReady ? "emerald" : "muted"}
            title="Mensajeria Principal"
            subtitle={
              config.whatsapp_main_phone
                ? `${config.whatsapp_main_phone} / ${
                    whatsappProvider === "KAPSO"
                      ? `WhatsApp Cloud API / ${
                          cloudTemplatesReady
                            ? "Plantillas listas"
                            : "Plantillas pendientes"
                        }`
                      : "Evolution API"
                  }`
                : "Numero principal pendiente"
            }
            rightContent={
              <p className="text-label text-text-muted">
                {waReady ? "Vinculado" : "Parcial"}
              </p>
            }
            actions={
              <NexusCardButton
                onClick={() => setModal("whatsapp")}
                icon={Edit2}
              >
                Configurar
              </NexusCardButton>
            }
          />
          <NexusSectionCard
            icon={ShieldCheck}
            iconVariant={kapsoDeliveryEffective ? "brand" : "muted"}
            title="Entrega oficial con Kapso"
            subtitle={
              !kapsoDeliveryEnabled
                ? "Kapso está desactivado. Todas las notificaciones se enviarán mediante Evolution API."
                : kapsoServerEnabled
                  ? "Kapso atiende pagos confirmados, ganadores y campañas; Evolution conserva las operaciones cotidianas."
                  : "La preferencia está activa, pero Kapso no está habilitado en este servidor. Evolution seguirá enviando las notificaciones."
            }
            rightContent={
              <div
                className="flex flex-col items-center"
                style={{ gap: "var(--space-xs)" }}
              >
                <NexusSwitch
                  checked={kapsoDeliveryEnabled}
                  disabled={isSaving}
                  onChange={(checked) =>
                    updateConfig(
                      {
                        whatsapp_kapso_delivery_enabled: checked ? "1" : "0",
                      },
                      false,
                    )
                  }
                  aria-label={
                    kapsoDeliveryEnabled
                      ? "Desactivar entrega mediante Kapso"
                      : "Activar entrega mediante Kapso"
                  }
                />
                <span className="text-label text-text-muted">
                  {kapsoDeliveryEnabled ? "Activo" : "Inactivo"}
                </span>
              </div>
            }
          />
        </div>
      </NexusSection>

      <NexusSection
        title="Plantillas Principales"
        subtitle="Contenido canónico utilizado en tienda, rifas y Canales Especializados"
        icon={FileText}
        iconVariant={templateCounts > 0 ? "brand" : "muted"}
        action={
          <NexusSectionButton
            type="button"
            variant="brand"
            icon={ArrowLeftRight}
            onClick={() =>
              setTemplateVersion((version) =>
                version === "LEGACY" ? "SIMPLIFIED" : "LEGACY",
              )
            }
          >
            {templateVersion === "LEGACY" ? "Ver Simplificadas" : "Ver Legacy"}
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          {CHANNEL_TEMPLATE_SECTIONS.map((section) => (
            <div
              key={section.scope}
              className="flex flex-col"
              style={{ gap: "var(--space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
                <h4 className="text-h2 text-text-main">{section.label}</h4>
                <p className="text-secondary text-text-muted">
                  {section.description}
                </p>
              </div>
              <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
                {section.groups.map((group) => (
                  <div
                    key={group.key}
                    className="flex flex-col"
                    style={{ gap: "var(--space-md)" }}
                  >
                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--space-xs)" }}
                    >
                      <h5 className="text-body font-bold text-text-main">
                        {group.label}
                      </h5>
                      <p className="text-secondary text-text-muted">
                        {group.description}
                      </p>
                    </div>
                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--space-base)" }}
                    >
                      {group.templates.map((template) => {
                        const isSimplified = templateVersion === "SIMPLIFIED";
                        const storageKey = getTemplateStorageKey(template, templateVersion);
                        const simplifiedContent =
                          section.scope === "RAFFLES"
                            ? getTemplateVariantContent(
                                template,
                                "SIMPLIFIED",
                                section.scope,
                              )
                            : "";
                        const isCanonical = isSimplified
                          ? Boolean(config[storageKey] || simplifiedContent)
                          : Boolean(template.defaultContent);
                        const isFallback = Boolean(template.isTemporaryFallback);
                        const isMuted = isSimplified && !isCanonical;

                        return (
                          <div
                            key={template.key}
                            id={`principal-template-${template.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                            tabIndex={-1}
                            className="outline-none"
                          >
                            <NexusSectionCard
                              isMuted={isMuted}
                              icon={FileText}
                              iconVariant={
                                config[storageKey] || isCanonical
                                  ? "brand"
                                  : "muted"
                              }
                              title={template.label}
                              subtitle={
                                isSimplified
                                  ? config[storageKey]
                                    ? "Versi\u00f3n simplificada configurada en Nexus"
                                    : isCanonical
                                      ? "Borrador simplificado listo para revisar"
                                      : "Todav\u00eda no actualizada"
                                  : isFallback
                                    ? "Respaldo temporal mientras Meta aprueba las versiones nuevas"
                                    : config[storageKey]
                                      ? "Plantilla configurada en Canal Principal"
                                      : isCanonical
                                        ? "Versi\u00f3n can\u00f3nica lista para sincronizar"
                                        : "Sin plantilla principal configurada"
                              }
                              rightContent={
                                <p className="text-label text-text-muted">
                                  {isSimplified
                                    ? config[storageKey]
                                      ? "Configurada"
                                      : isCanonical
                                        ? "Borrador"
                                        : "Pendiente"
                                    : isFallback
                                      ? "Respaldo"
                                      : isCanonical
                                        ? "Can\u00f3nica"
                                        : config[storageKey]
                                          ? "Lista"
                                          : "Pendiente"}
                                </p>
                              }
                              actions={
                                <NexusCardButton
                                  onClick={() => openTemplateEditor(template, section.scope)}
                                  icon={Edit2}
                                >
                                  {isSimplified && !isCanonical
                                    ? "Preparar"
                                    : isFallback
                                      ? "Ver"
                                      : "Editar"}
                                </NexusCardButton>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </NexusSection>

      {modal === "bank" && (
        <NexusModal
          isOpen
          title="Información Bancaria Principal"
          eyebrow="Configurar Canal"
          icon={Banknote}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Banco"
              value={config.bank_main_name || ""}
              onChange={(e) =>
                setConfig({ ...config, bank_main_name: e.target.value })
              }
              icon={Banknote}
            />
            <NexusInput
              label="Beneficiario"
              value={config.bank_main_beneficiary || ""}
              onChange={(e) =>
                setConfig({ ...config, bank_main_beneficiary: e.target.value })
              }
              icon={User}
            />
            <NexusInput
              label="No. Cuenta"
              value={config.bank_main_account || ""}
              onChange={(e) =>
                setConfig({ ...config, bank_main_account: e.target.value })
              }
              icon={Hash}
            />
            <NexusInput
              label="CLABE"
              value={config.bank_main_clabe || ""}
              onChange={(e) =>
                setConfig({ ...config, bank_main_clabe: e.target.value })
              }
              icon={Hash}
            />
            <NexusInput
              label="No. tarjeta"
              value={config.bank_main_card || ""}
              onChange={(e) =>
                setConfig({ ...config, bank_main_card: e.target.value })
              }
              icon={CreditCard}
            />
            <NexusAutonomousButton
              className="w-full"
              onClick={() =>
                updateConfig({
                  bank_main_name: config.bank_main_name || "",
                  bank_main_beneficiary: config.bank_main_beneficiary || "",
                  bank_main_account: config.bank_main_account || "",
                  bank_main_clabe: config.bank_main_clabe || "",
                  bank_main_card: config.bank_main_card || "",
                })
              }
              isLoading={isSaving}
              icon={Save}
            >
              Guardar Banco Principal
            </NexusAutonomousButton>
          </div>
        </NexusModal>
      )}

      {modal === "mercadopago" && (
        <NexusModal
          isOpen
          title="Mercado Pago Principal"
          eyebrow="Configurar Canal"
          icon={CreditCard}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div
            className="flex w-full min-w-0 max-w-full flex-col"
            style={{ gap: "var(--space-lg)" }}
          >
            <NexusInput
              label="Identidad en Extracto"
              value={config.mp_statement_descriptor || ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  mp_statement_descriptor: e.target.value
                    .substring(0, 16)
                    .toUpperCase(),
                })
              }
              icon={CreditCard}
              helperText="Texto que aparece en el extracto del cliente. Máximo 16 caracteres."
            />
            <div
              className="flex w-full min-w-0 max-w-full flex-col items-stretch border border-border-main bg-bg-muted sm:flex-row sm:items-center"
              style={{
                gap: "var(--space-md)",
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <div
                className={`flex shrink-0 items-center justify-center ${mpReady ? "bg-emerald-500 text-white" : "bg-bg-card text-text-muted border border-border-main"}`}
                style={{
                  width: "var(--size-icon-autonomous)",
                  height: "var(--size-icon-autonomous)",
                  borderRadius: "var(--radius-card-inner)",
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">
                  {mpReady ? "Cuenta vinculada" : "Sin cuenta vinculada"}
                </p>
                <p className="break-words text-secondary text-text-muted">
                  {mpReady
                    ? `Usuario ${config.mp_seller_user_id || "sin id"}`
                    : "Vincula la pasarela principal para cobros por tarjeta."}
                </p>
              </div>
            </div>
            <div
              className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] sm:grid-cols-2"
              style={{ gap: "var(--space-md)" }}
            >
              <NexusAutonomousButton
                className="w-full min-w-0"
                onClick={() =>
                  updateConfig({
                    mp_statement_descriptor:
                      config.mp_statement_descriptor || "",
                  })
                }
                isLoading={isSaving}
                icon={Save}
              >
                Guardar Extracto
              </NexusAutonomousButton>
              <NexusAutonomousButton
                className="w-full min-w-0"
                icon={mpReady ? LogOut : LinkIcon}
                variant={mpReady ? "danger" : "brand"}
                onClick={
                  mpReady
                    ? () => setConfirmDisconnectMP(true)
                    : connectMercadoPago
                }
              >
                {mpReady ? "Desvincular" : "Vincular"}
              </NexusAutonomousButton>
            </div>
          </div>
        </NexusModal>
      )}

      <NexusConfirmModal
        isOpen={confirmDisconnectMP}
        title="¿Desvincular Mercado Pago?"
        message="El checkout dejará de aceptar pagos con tarjeta hasta que vincules una cuenta nuevamente."
        confirmLabel={isDisconnectingMP ? "Desvinculando..." : "Desvincular"}
        cancelLabel="Cancelar"
        tone="danger"
        icon={LogOut}
        onConfirm={disconnectMercadoPago}
        onCancel={() => setConfirmDisconnectMP(false)}
        zIndex={270}
      />

      {modal === "whatsapp" && (
        <NexusModal
          isOpen
          title="Mensajería Principal"
          eyebrow="Configurar Canal"
          icon={MessageCircle}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
          footer={
            <NexusModalActions className="w-full">
              <NexusAutonomousButton
                onClick={() =>
                  whatsappProvider === "KAPSO"
                    ? checkKapsoStatus()
                    : checkInstanceStatus()
                }
                icon={RefreshCw}
                variant="secondary"
                className="min-w-0 flex-1"
              >
                Revisar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                onClick={() =>
                  updateConfig({
                    whatsapp_main_phone: config.whatsapp_main_phone || "",
                    whatsapp_main_provider: whatsappProvider,
                    whatsapp_main_delivery_strategy:
                      config.whatsapp_main_delivery_strategy || "STANDARD",
                    whatsapp_evolution_instance:
                      config.whatsapp_evolution_instance || principalInstance,
                    whatsapp_main_kapso_phone_number_id:
                      config.whatsapp_main_kapso_phone_number_id || "",
                    whatsapp_main_kapso_business_account_id:
                      config.whatsapp_main_kapso_business_account_id || "",
                  })
                }
                isLoading={isSaving}
                icon={Save}
                className="min-w-0 flex-[2]"
                disabled={
                  whatsappProvider === "KAPSO" &&
                  (!config.whatsapp_main_kapso_phone_number_id ||
                    !config.whatsapp_main_kapso_business_account_id)
                }
              >
                Guardar
              </NexusAutonomousButton>
            </NexusModalActions>
          }
        >
          <div
            className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden"
            style={{ gap: "var(--space-lg)" }}
          >
            <div
              className="flex w-full min-w-0 flex-col"
              style={{ gap: "var(--space-xs)" }}
            >
              <span className="text-label uppercase tracking-[0.15em] text-text-muted">
                Proveedor de mensajería
              </span>
              <NexusSegmentedControl
                value={whatsappProvider}
                options={[
                  {
                    value: "EVOLUTION",
                    label: "Evolution API",
                    activeClassName:
                      "bg-bg-card text-brand-600 border border-border-main shadow-sm",
                  },
                  {
                    value: "KAPSO",
                    label: "Cloud API",
                    activeClassName:
                      "bg-bg-card text-brand-600 border border-border-main shadow-sm",
                  },
                ]}
                onChange={(provider) => {
                  setConfig({ ...config, whatsapp_main_provider: provider });
                  setInstanceStatus("close");
                }}
                ariaLabel="Proveedor de mensajería principal"
                context="section"
                className="grid h-[var(--h-input)] w-full grid-cols-2"
              />
            </div>
            <div
              className="flex w-full min-w-0 flex-col"
              style={{ gap: "var(--space-xs)" }}
            >
              <NexusSelect
                label="Estrategia de entrega"
                value={config.whatsapp_main_delivery_strategy || "STANDARD"}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    whatsapp_main_delivery_strategy: event.target
                      .value as WhatsAppDeliveryStrategy,
                  })
                }
              >
                <option value="STANDARD">Estándar según la notificación</option>
                <option value="KAPSO_PREFERRED">Kapso preferente</option>
                <option value="EVOLUTION_ONLY">Solo Evolution API</option>
              </NexusSelect>
              <p className="px-1 text-secondary italic leading-relaxed text-text-muted">
                {(config.whatsapp_main_delivery_strategy || "STANDARD") ===
                "KAPSO_PREFERRED"
                  ? "Usa Kapso primero para todas las notificaciones. Evolution API queda como respaldo."
                  : (config.whatsapp_main_delivery_strategy || "STANDARD") ===
                      "EVOLUTION_ONLY"
                    ? "Todas las notificaciones usan Evolution API. Kapso queda deshabilitado para este canal."
                    : "Nexus elige el proveedor según la importancia de cada notificación."}
              </p>
            </div>
            {whatsappProvider === "EVOLUTION" && (
              <NexusInput
                label="Número de WhatsApp"
                value={config.whatsapp_main_phone || ""}
                onChange={(e) =>
                  setConfig({ ...config, whatsapp_main_phone: e.target.value })
                }
                icon={Smartphone}
                helperText="Incluye código de país. Este será el teléfono físico que escaneará el QR."
              />
            )}
            {whatsappProvider === "KAPSO" && (
              <div
                className="flex w-full min-w-0 flex-col"
                style={{ gap: "var(--space-md)" }}
              >
                <NexusAutonomousButton
                  onClick={connectKapso}
                  isLoading={isConnectingKapso}
                  icon={LinkIcon}
                  variant="success"
                  className="w-full"
                >
                  {config.whatsapp_main_kapso_phone_number_id
                    ? instanceStatus === "close"
                      ? "Reconectar con Kapso"
                      : "Cambiar número vinculado"
                    : "Vincular con Kapso"}
                </NexusAutonomousButton>
                {Boolean(config.whatsapp_main_kapso_phone_number_id) && (
                  <NexusAutonomousButton
                    onClick={() => setConfirmDisconnectKapso(true)}
                    icon={LogOut}
                    variant="danger"
                    className="w-full"
                  >
                    Desvincular Cloud API
                  </NexusAutonomousButton>
                )}
              </div>
            )}
            <div
              className="flex w-full min-w-0 max-w-full flex-col items-stretch justify-between border border-border-main bg-bg-muted sm:flex-row sm:items-center"
              style={{
                gap: "var(--space-md)",
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">Dispositivo principal</p>
                <p className="break-words text-secondary text-text-muted">
                  {instanceStatus === "open"
                    ? whatsappProvider === "KAPSO"
                      ? cloudTemplatesReady
                        ? "Cloud API y plantillas listas"
                        : "Cloud API vinculada; plantillas pendientes"
                      : "Vinculado con Evolution API"
                    : whatsappProvider === "KAPSO"
                      ? "Cloud API sin conexión"
                      : `Instancia: ${principalInstance}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-label ${instanceStatus === "open" ? "text-emerald-600" : "text-text-muted"}`}
              >
                {instanceStatus === "loading"
                  ? "Revisando"
                  : instanceStatus === "open"
                    ? "En línea"
                    : "Desconectado"}
              </span>
            </div>
            {whatsappProvider === "EVOLUTION" &&
              instanceStatus !== "open" && (
              <div
                className="grid w-full min-w-0 grid-cols-2"
                style={{ gap: "var(--space-base)" }}
              >
                  <NexusAutonomousButton
                    className="w-full min-w-0"
                    onClick={() => openWhatsAppFlow("qr")}
                    icon={QrCode}
                    variant="success"
                    disabled={instanceStatus === "loading"}
                  >
                    Vincular QR
                  </NexusAutonomousButton>
                  <NexusAutonomousButton
                    className="w-full min-w-0"
                    onClick={() => openWhatsAppFlow("pairing_code")}
                    icon={KeyRound}
                    variant="success"
                    disabled={instanceStatus === "loading"}
                  >
                    Usar código
                  </NexusAutonomousButton>
              </div>
            )}
            {whatsappProvider === "KAPSO" &&
              Boolean(config.whatsapp_main_kapso_phone_number_id) && (
              <NexusAutonomousButton
                className="w-full min-w-0"
                onClick={syncCloudTemplates}
                isLoading={isSyncingCloudTemplates}
                icon={RefreshCw}
                variant="secondary"
              >
                Sincronizar plantillas
              </NexusAutonomousButton>
            )}
            {instanceStatus === "open" && whatsappProvider === "EVOLUTION" && (
              <NexusAutonomousButton
                onClick={() => setConfirmDisconnectWhatsApp(true)}
                icon={LogOut}
                variant="danger"
                className="w-full"
              >
                Desvincular Dispositivo
              </NexusAutonomousButton>
            )}
          </div>
        </NexusModal>
      )}

      <NexusConfirmModal
        isOpen={showMissingPhoneAlert}
        title="Número requerido"
        message="Ingresa el número de WhatsApp antes de vincular el dispositivo."
        confirmLabel="Entendido"
        showCancel={false}
        tone="warning"
        icon={Smartphone}
        onConfirm={() => setShowMissingPhoneAlert(false)}
        onCancel={() => setShowMissingPhoneAlert(false)}
        zIndex={270}
      />

      <NexusConfirmModal
        isOpen={confirmDisconnectWhatsApp}
        title="¿Desvincular WhatsApp?"
        message="Se cerrará la sesión activa de Evolution API para el Canal Principal."
        confirmLabel="Desvincular"
        onConfirm={disconnectWhatsApp}
        onCancel={() => setConfirmDisconnectWhatsApp(false)}
        tone="danger"
        icon={LogOut}
        zIndex={270}
      />

      <NexusConfirmModal
        isOpen={confirmDisconnectKapso}
        title="¿Desvincular Cloud API?"
        message="Kapso retirará este número del proyecto. El Canal Principal conservará su configuración de Evolution API."
        confirmLabel="Desvincular"
        onConfirm={disconnectKapso}
        onCancel={() => setConfirmDisconnectKapso(false)}
        tone="danger"
        icon={LogOut}
        isLoading={isDisconnectingKapso}
        zIndex={270}
      />

      <WhatsAppPairingModal
        data={pairingData}
        onClose={() => setPairingData(null)}
        onRegenerate={openWhatsAppFlow}
        zIndex={260}
      />
    </div>
  );
};

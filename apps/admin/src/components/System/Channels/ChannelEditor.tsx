import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BellRing,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Hash,
  KeyRound,
  Link as LinkIcon,
  LogOut,
  MessageCircle,
  Phone,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Ticket,
  User,
} from "lucide-react";
import {
  apiMercadoPago,
  apiPayments,
  apiSystem,
  apiWhatsApp,
} from "../../../api";
import {
  SalesChannel,
  WhatsAppChannel,
  WhatsAppDeliveryStrategy,
  WhatsAppProvider,
} from "../../../types";
import {
  NexusSectionButton,
  NexusCardButton,
  NexusAutonomousButton,
} from "../../ui/NexusButton";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import { NexusSwitch } from "../../ui/NexusSwitch";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";
import { NexusSegmentedControl } from "../../ui/NexusSegmentedControl";
import {
  WhatsAppPairingData,
  WhatsAppPairingMethod,
  WhatsAppPairingModal,
  WHATSAPP_PAIRING_WINDOW_SECONDS,
} from "./WhatsAppPairingModal";
import { resolveChannelInstanceName } from "./channelInstance";
import { CHANNEL_TEMPLATE_SECTIONS } from "./channelTemplateCatalog";
import { runKapsoOnboarding } from "./kapsoOnboarding";

interface ChannelEditorProps {
  id: string;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

type ModalType = "identity" | "bank" | "mercadopago" | "whatsapp" | null;

const PURPOSE_LABELS: Record<string, string> = {
  COMBAT: "Canal de Combate",
  BREEDING: "Canal de Cria",
  RAFFLES: "Canal de Rifas",
};

export const ChannelEditor: React.FC<ChannelEditorProps> = ({
  id,
  onSave,
  showToast,
  setConfirmDialog,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingCloudTemplates, setIsSyncingCloudTemplates] = useState(false);
  const [isConnectingKapso, setIsConnectingKapso] = useState(false);
  const [cloudTemplatesReady, setCloudTemplatesReady] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [globalConfig, setGlobalConfig] = useState<Record<string, string>>({});
  const [paymentObj, setPaymentObj] = useState<SalesChannel | null>(null);
  const [whatsappObj, setWhatsappObj] = useState<WhatsAppChannel | null>(null);
  const [generalData, setGeneralData] = useState({ name: "", purpose: "" });
  const [paymentData, setPaymentData] = useState({
    bank: "",
    beneficiary: "",
    account: "",
    clabe: "",
    card: "",
  });
  const [whatsappData, setWhatsappData] = useState({
    phone: "",
    active: true,
    provider: "EVOLUTION" as WhatsAppProvider,
    deliveryStrategy: "STANDARD" as WhatsAppDeliveryStrategy,
    kapsoPhoneNumberId: "",
    kapsoBusinessAccountId: "",
  });
  const [instanceStatus, setInstanceStatus] = useState<
    "open" | "close" | "connecting" | "loading"
  >("loading");
  const [pairingData, setPairingData] = useState<WhatsAppPairingData | null>(
    null,
  );
  const [connectingMethod, setConnectingMethod] =
    useState<WhatsAppPairingMethod | null>(null);
  const [instanceExists, setInstanceExists] = useState(false);
  const [showMissingPhoneAlert, setShowMissingPhoneAlert] = useState(false);
  const [confirmDisconnectKapso, setConfirmDisconnectKapso] = useState(false);
  const [isDisconnectingKapso, setIsDisconnectingKapso] = useState(false);
  const RAFFLE_ENABLED = import.meta.env.VITE_RAFFLE_ENABLED === "true";

  const instanceName = useMemo(
    () =>
      whatsappObj?.instanceName ||
      resolveChannelInstanceName(
        globalConfig.whatsapp_evolution_instance,
        generalData.purpose,
      ),
    [
      generalData.purpose,
      globalConfig.whatsapp_evolution_instance,
      whatsappObj?.instanceName,
    ],
  );

  const checkInstanceStatus = async (name: string) => {
    if (!name) {
      setInstanceExists(false);
      setInstanceStatus("close");
      return "close";
    }
    setInstanceStatus("loading");
    try {
      await apiWhatsApp.configureWebhook(name);
      const res = await apiWhatsApp.getStatus(name);
      const state = res.data.instance.state;
      setInstanceExists(res.data.exists !== false);
      setInstanceStatus(state);
      return state;
    } catch (error) {
      setInstanceExists(false);
      setInstanceStatus("close");
      return "close";
    }
  };

  const checkKapsoStatus = async (phoneNumberId: string) => {
    if (!phoneNumberId.trim()) {
      setInstanceExists(false);
      setInstanceStatus("close");
      return "close";
    }
    setInstanceStatus("loading");
    try {
      const response = await apiWhatsApp.getKapsoStatus(
        phoneNumberId,
        whatsappData.kapsoBusinessAccountId,
      );
      const status = String(
        response.data?.phoneNumber?.status ||
          response.data?.phoneNumber?.connection_status ||
          "",
      ).toUpperCase();
      const connected = status === "CONNECTED";
      setInstanceExists(connected);
      setInstanceStatus(connected ? "open" : "close");
      return connected ? "open" : "close";
    } catch {
      setInstanceExists(false);
      setInstanceStatus("close");
      return "close";
    }
  };

  const checkCloudTemplateReadiness = async (channelId: string) => {
    try {
      const response = await apiWhatsApp.getKapsoTemplateReadiness(channelId);
      const ready = Boolean(response.data?.ready);
      setCloudTemplatesReady(ready);
      return ready;
    } catch {
      setCloudTemplatesReady(false);
      return false;
    }
  };

  const loadChannelData = async () => {
    setIsLoading(true);
    try {
      const [payments, whatsapp, settings] = await Promise.all([
        apiPayments.getAll(),
        apiWhatsApp.getAll(),
        apiSystem.getConfig(),
      ]);
      setGlobalConfig(settings);

      const payment =
        payments.find((c: any) => c.id === id || c.purpose === id) || null;
      const wa =
        whatsapp.find(
          (c: any) =>
            c.id === id || c.purpose === id || c.purpose === payment?.purpose,
        ) || null;

      setPaymentObj(payment);
      setWhatsappObj(wa);

      const name = payment?.name || wa?.name || "";
      const purpose = payment?.purpose || wa?.purpose || id;
      setGeneralData({ name, purpose });
      setPaymentData({
        bank: payment?.bank || "",
        beneficiary: payment?.beneficiary || "",
        account: payment?.account || "",
        clabe: payment?.clabe || "",
        card: payment?.card || "",
      });
      setWhatsappData({
        phone: wa?.phone || "",
        active: wa?.active ?? true,
        provider: wa?.provider || "EVOLUTION",
        deliveryStrategy: wa?.deliveryStrategy || "STANDARD",
        kapsoPhoneNumberId: wa?.kapsoPhoneNumberId || "",
        kapsoBusinessAccountId: wa?.kapsoBusinessAccountId || "",
      });

      if ((wa?.provider || "EVOLUTION") === "KAPSO") {
        await checkKapsoStatus(wa?.kapsoPhoneNumberId || "");
        if (wa?.id) await checkCloudTemplateReadiness(String(wa.id));
      } else {
        await checkInstanceStatus(
          wa?.instanceName ||
            resolveChannelInstanceName(
              settings.whatsapp_evolution_instance,
              purpose,
            ),
        );
      }
    } catch (error) {
      showToast("Error al cargar datos del canal", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadChannelData();
  }, [id]);

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
          showToast("WhatsApp vinculado correctamente", "success");
          setPairingData(null);
        }
      }, 3000);
    }
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [pairingData?.instanceName]);

  const paymentReady = Boolean(paymentData.bank && paymentData.beneficiary);
  const mpReady = Boolean((paymentObj as any)?.mpAccessToken);
  const whatsappReady = Boolean(
    whatsappData.phone &&
    whatsappData.active &&
    instanceStatus === "open" &&
    (whatsappData.provider !== "KAPSO" || cloudTemplatesReady),
  );
  const visibleTemplateSections = useMemo(() => {
    const purpose = generalData.purpose.toUpperCase();
    if (purpose === "RAFFLES")
      return CHANNEL_TEMPLATE_SECTIONS.filter(
        (section) => section.scope === "RAFFLES",
      );
    if (purpose === "COMBAT" || purpose === "BREEDING")
      return CHANNEL_TEMPLATE_SECTIONS.filter(
        (section) => section.scope === "STORE",
      );
    return CHANNEL_TEMPLATE_SECTIONS;
  }, [generalData.purpose]);
  const visibleTemplateTypes = visibleTemplateSections.flatMap((section) =>
    section.groups.flatMap((group) => group.templates),
  );
  const templatesReady = visibleTemplateTypes.every((template) =>
    Boolean(globalConfig[template.key]?.trim()),
  );

  const saveIdentity = async () => {
    if (!generalData.name.trim() || !generalData.purpose) {
      showToast("Nombre y proposito son obligatorios", "error");
      return;
    }
    setIsSaving(true);
    try {
      const paymentPayload = {
        ...generalData,
        ...paymentData,
        accountNumber: paymentData.account,
      };
      const whatsappPayload = {
        ...generalData,
        phone: whatsappData.phone,
        active: whatsappData.active,
        provider: whatsappData.provider,
        deliveryStrategy: whatsappData.deliveryStrategy,
        instanceName,
        kapsoPhoneNumberId: whatsappData.kapsoPhoneNumberId || null,
        kapsoBusinessAccountId: whatsappData.kapsoBusinessAccountId || null,
      };
      const tasks = [];
      if (paymentObj && paymentReady)
        tasks.push(apiPayments.update(paymentObj.id, paymentPayload));
      if (whatsappObj && whatsappData.phone)
        tasks.push(apiWhatsApp.update(whatsappObj.id, whatsappPayload));
      await Promise.all(tasks);
      showToast("Identidad del canal actualizada");
      setModal(null);
      loadChannelData();
      onSave();
    } catch (error) {
      showToast("No se pudo actualizar la identidad", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveBank = async () => {
    if (!paymentData.bank.trim() || !paymentData.beneficiary.trim()) {
      showToast("Banco y beneficiario son obligatorios", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...generalData,
        ...paymentData,
        accountNumber: paymentData.account,
      };
      if (paymentObj) await apiPayments.update(paymentObj.id, payload);
      else await apiPayments.create(payload);
      showToast("Informacion bancaria guardada");
      setModal(null);
      loadChannelData();
      onSave();
    } catch (error) {
      showToast("No se pudo guardar la informacion bancaria", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveWhatsApp = async (close = true) => {
    if (
      whatsappData.provider === "EVOLUTION" &&
      !whatsappData.phone.trim()
    ) {
      showToast("El numero de WhatsApp es obligatorio", "error");
      return false;
    }
    if (
      (whatsappData.provider === "KAPSO" ||
        whatsappData.deliveryStrategy === "KAPSO_PREFERRED") &&
      (!whatsappData.kapsoPhoneNumberId.trim() ||
        !whatsappData.kapsoBusinessAccountId.trim())
    ) {
      showToast(
        "Phone Number ID y Business Account ID son obligatorios para Cloud API",
        "error",
      );
      return false;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...generalData,
        phone: whatsappData.phone,
        active: whatsappData.active,
        provider: whatsappData.provider,
        deliveryStrategy: whatsappData.deliveryStrategy,
        instanceName,
        kapsoPhoneNumberId: whatsappData.kapsoPhoneNumberId || null,
        kapsoBusinessAccountId: whatsappData.kapsoBusinessAccountId || null,
      };
      const response = whatsappObj
        ? await apiWhatsApp.update(whatsappObj.id, payload)
        : await apiWhatsApp.create(payload);
      const savedChannel = response.data;
      setWhatsappObj(
        (current) =>
          ({
            ...(current || {}),
            ...savedChannel,
            id: String(savedChannel.id),
          }) as WhatsAppChannel,
      );
      if (close) {
        showToast("Mensajeria actualizada");
        setModal(null);
        onSave();
      }
      return true;
    } catch (error) {
      showToast("No se pudo guardar la mensajeria", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const syncCloudTemplates = async () => {
    if (!whatsappObj?.id) {
      showToast("Guarda primero la mensajeria del canal", "error");
      return;
    }
    const saved = await saveWhatsApp(false);
    if (!saved) return;

    setIsSyncingCloudTemplates(true);
    try {
      const response = await apiWhatsApp.syncKapsoTemplates(whatsappObj.id);
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
      setIsSyncingCloudTemplates(false);
    }
  };

  const connectKapso = async () => {
    if (!whatsappObj?.id) {
      showToast("Guarda primero el canal de mensajería", "error");
      return;
    }
    setIsConnectingKapso(true);
    try {
      await runKapsoOnboarding({
        target: "SPECIALIZED",
        channelId: Number(whatsappObj.id),
      });
      showToast("WhatsApp Business conectado mediante Kapso");
      await loadChannelData();
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
    if (!whatsappObj?.id) return;
    setIsDisconnectingKapso(true);
    try {
      await apiWhatsApp.disconnectKapso({
        target: "SPECIALIZED",
        channelId: Number(whatsappObj.id),
      });
      setConfirmDisconnectKapso(false);
      showToast("Cloud API desvinculada del Canal Especializado");
      await loadChannelData();
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

  const connectMercadoPago = async () => {
    if (!paymentObj?.id) {
      showToast("Guarda primero la informacion bancaria del canal", "error");
      return;
    }
    try {
      const url = await apiMercadoPago.getAuthUrl(paymentObj.id);
      if (url) window.location.href = url;
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Error al conectar con Mercado Pago",
        "error",
      );
    }
  };

  const generateWhatsAppPairing = async (method: WhatsAppPairingMethod) => {
    setConnectingMethod(method);
    try {
      const saved = await saveWhatsApp(false);
      if (!saved) return;

      const res = await apiWhatsApp.connect(
        instanceName,
        method,
        whatsappData.phone,
      );
      const value = method === "qr" ? res.data?.base64 : res.data?.pairingCode;
      if (!value) throw new Error("Evolution API no devolvió un código");
      setInstanceExists(true);
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
          error?.message ||
          (method === "qr"
            ? "Error al generar QR"
            : "Error al generar el código"),
        "error",
      );
    } finally {
      setConnectingMethod(null);
    }
  };

  const openWhatsAppFlow = async (method: WhatsAppPairingMethod) => {
    if (!instanceName) {
      showToast("Este canal no tiene instancia asignada", "error");
      return;
    }
    if (!whatsappData.phone.trim()) {
      setShowMissingPhoneAlert(true);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Confirmar línea de WhatsApp",
      message:
        method === "qr"
          ? `Se generará un QR para vincular el número ${whatsappData.phone}.`
          : `Se generará un código asociado al número ${whatsappData.phone}.`,
      confirmLabel: method === "qr" ? "Generar QR" : "Generar código",
      variant: "warning",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        await generateWhatsAppPairing(method);
      },
    });
  };

  const disconnectWhatsApp = async () => {
    if (!instanceName) return;
    setConfirmDialog({
      isOpen: true,
      title: "Desvincular WhatsApp",
      message: "Se cerrara la sesion activa de Evolution API para este canal.",
      confirmLabel: "Desvincular",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiWhatsApp.disconnect(instanceName);
          setInstanceStatus("close");
          setInstanceExists(false);
          showToast("WhatsApp desvinculado");
        } catch (error) {
          showToast("No se pudo desvincular WhatsApp", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
          <div
            className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin"
            style={{
              animationDuration: "1s",
              animationTimingFunction: "var(--ease-emil)",
            }}
          />
        </div>
        <p className="text-label text-text-muted">
          Obteniendo parametros del canal...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <NexusSection
        title={
          generalData.name ||
          PURPOSE_LABELS[generalData.purpose] ||
          "Canal Especializado"
        }
        subtitle="Este canal especializa identidad, cobros y transporte cuando coincide con su propósito"
        icon={ShieldCheck}
        iconVariant="brand"
        action={
          <NexusSectionButton onClick={() => setModal("identity")} icon={Edit2}>
            Editar Identidad
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col gap-5">
          <NexusSectionCard
            icon={Banknote}
            iconVariant={paymentReady ? "emerald" : "muted"}
            title="Informacion Bancaria"
            subtitle={
              paymentReady
                ? `${paymentData.bank} / ${paymentData.beneficiary}`
                : "Usa la informacion bancaria del Canal Principal"
            }
            rightContent={
              <p className="text-label text-text-muted">
                {paymentReady ? "Completado" : "Parcial"}
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
            title="Mercado Pago"
            subtitle={
              mpReady
                ? `Cuenta vinculada ${(paymentObj as any)?.mpUserId || ""}`
                : "Usa Mercado Pago Principal si no se vincula una cuenta"
            }
            rightContent={
              <p className="text-label text-text-muted">
                {mpReady ? "Vinculado" : "Fallback"}
              </p>
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
            iconVariant={whatsappReady ? "emerald" : "muted"}
            title="Mensajería Especializada"
            subtitle={
              whatsappData.phone
                ? `${whatsappData.phone} / ${
                    whatsappData.provider === "KAPSO"
                      ? `WhatsApp Cloud API / ${
                          cloudTemplatesReady
                            ? "Plantillas listas"
                            : "Plantillas pendientes"
                        }`
                      : "Evolution API"
                  }`
                : "Numero de WhatsApp pendiente"
            }
            rightContent={
              <p className="text-label text-text-muted">
                {whatsappReady ? "Vinculado" : "Parcial"}
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
        </div>
      </NexusSection>

      <NexusSection
        title="Plantillas de Mensajería"
        subtitle="Este canal utiliza el contenido administrado desde el Canal Principal."
        icon={FileText}
        iconVariant={templatesReady ? "brand" : "muted"}
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          {visibleTemplateSections.map((section) => (
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
                        const isConfigured = Boolean(
                          globalConfig[template.key]?.trim(),
                        );
                        const Icon =
                          template.type === "PAYMENT_CONFIRMED"
                            ? CheckCircle2
                            : template.type === "OPENING"
                              ? BellRing
                              : template.type === "RESTORED"
                                ? RefreshCw
                                : template.type === "RELEASE"
                                  ? LogOut
                                  : Ticket;
                        return (
                          <NexusSectionCard
                            key={`${group.key}-${template.type}`}
                            icon={Icon}
                            iconVariant={isConfigured ? "emerald" : "muted"}
                            title={template.label}
                            subtitle={
                              isConfigured
                                ? "Contenido configurado en el Canal Principal"
                                : "Configura esta plantilla en el Canal Principal"
                            }
                            rightContent={
                              <p className="text-label text-text-muted">
                                {isConfigured ? "Principal" : "Pendiente"}
                              </p>
                            }
                          />
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

      {modal === "identity" && (
        <NexusModal
          isOpen
          title="Identidad del canal"
          eyebrow="Editar Canal"
          icon={Building2}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            <NexusInput
              label="Nombre del canal"
              value={generalData.name}
              onChange={(e) =>
                setGeneralData({ ...generalData, name: e.target.value })
              }
              icon={Building2}
            />
            <NexusSelect label="Propósito" value={generalData.purpose} disabled>
              <option value="COMBAT">Combate</option>
              <option value="BREEDING">Cria</option>
              {RAFFLE_ENABLED && <option value="RAFFLES">Rifas</option>}
            </NexusSelect>
            <NexusAutonomousButton
              onClick={saveIdentity}
              isLoading={isSaving}
              icon={Save}
              className="w-full"
            >
              Guardar Identidad
            </NexusAutonomousButton>
          </div>
        </NexusModal>
      )}

      {modal === "bank" && (
        <NexusModal
          isOpen
          title="Información bancaria"
          eyebrow="Configurar Canal"
          icon={Banknote}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Banco"
              value={paymentData.bank}
              onChange={(e) =>
                setPaymentData({ ...paymentData, bank: e.target.value })
              }
              icon={Building2}
            />
            <NexusInput
              label="Beneficiario"
              value={paymentData.beneficiary}
              onChange={(e) =>
                setPaymentData({ ...paymentData, beneficiary: e.target.value })
              }
              icon={User}
            />
            <NexusInput
              label="No. Cuenta"
              value={paymentData.account}
              onChange={(e) =>
                setPaymentData({ ...paymentData, account: e.target.value })
              }
              icon={Hash}
            />
            <NexusInput
              label="CLABE"
              value={paymentData.clabe}
              onChange={(e) =>
                setPaymentData({ ...paymentData, clabe: e.target.value })
              }
              icon={Hash}
            />
            <NexusInput
              label="No. tarjeta"
              value={paymentData.card}
              onChange={(e) =>
                setPaymentData({ ...paymentData, card: e.target.value })
              }
              icon={CreditCard}
            />
            <NexusAutonomousButton
              onClick={saveBank}
              isLoading={isSaving}
              icon={Save}
              className="w-full"
            >
              Guardar Banco
            </NexusAutonomousButton>
          </div>
        </NexusModal>
      )}

      {modal === "mercadopago" && (
        <NexusModal
          isOpen
          title="Mercado Pago"
          eyebrow="Configurar Canal"
          icon={CreditCard}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
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
                {mpReady ? (
                  <CheckCircle2 size={26} />
                ) : (
                  <CreditCard size={26} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">
                  {mpReady ? "Cuenta vinculada" : "Sin pasarela vinculada"}
                </p>
                <p className="break-words text-secondary text-text-muted">
                  {mpReady
                    ? `Usuario ${(paymentObj as any)?.mpUserId || "sin id"}`
                    : "Mientras falte, se usará Mercado Pago Principal."}
                </p>
              </div>
            </div>
            <NexusAutonomousButton
              onClick={connectMercadoPago}
              icon={LinkIcon}
              className="w-full"
            >
              {mpReady ? "Re-vincular Mercado Pago" : "Vincular Mercado Pago"}
            </NexusAutonomousButton>
          </div>
        </NexusModal>
      )}

      {modal === "whatsapp" && (
        <NexusModal
          isOpen
          title="Mensajería Especializada"
          eyebrow="Configurar Canal"
          icon={MessageCircle}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
          footer={
            <NexusModalActions className="w-full">
              <NexusAutonomousButton
                onClick={() =>
                  whatsappData.provider === "KAPSO"
                    ? checkKapsoStatus(whatsappData.kapsoPhoneNumberId)
                    : checkInstanceStatus(instanceName)
                }
                icon={RefreshCw}
                variant="secondary"
                className="min-w-0 flex-1"
              >
                Revisar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                onClick={() => saveWhatsApp(true)}
                isLoading={isSaving}
                icon={Save}
                className="min-w-0 flex-[2]"
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
                value={whatsappData.provider}
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
                  setWhatsappData({ ...whatsappData, provider });
                  setInstanceExists(false);
                  setInstanceStatus("close");
                }}
                ariaLabel="Proveedor de mensajería"
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
                value={whatsappData.deliveryStrategy}
                onChange={(event) =>
                  setWhatsappData({
                    ...whatsappData,
                    deliveryStrategy: event.target
                      .value as WhatsAppDeliveryStrategy,
                  })
                }
              >
                <option value="STANDARD">Estándar según la notificación</option>
                <option value="KAPSO_PREFERRED">Kapso preferente</option>
                <option value="EVOLUTION_ONLY">Solo Evolution API</option>
              </NexusSelect>
              <p className="px-1 text-secondary italic leading-relaxed text-text-muted">
                {whatsappData.deliveryStrategy === "KAPSO_PREFERRED"
                  ? "Usa Kapso para todas las notificaciones de este canal. El Canal Principal queda como respaldo."
                  : whatsappData.deliveryStrategy === "EVOLUTION_ONLY"
                    ? "Todas las notificaciones usan Evolution API. Kapso queda deshabilitado para este canal."
                    : "Nexus elige el proveedor según la importancia de cada notificación."}
              </p>
            </div>
            {whatsappData.provider === "EVOLUTION" && (
              <NexusInput
                label="Número de WhatsApp"
                value={whatsappData.phone}
                onChange={(e) =>
                  setWhatsappData({ ...whatsappData, phone: e.target.value })
                }
                icon={Smartphone}
                helperText="Incluye código de país. Para México suele iniciar con 521."
              />
            )}
            {whatsappData.provider === "KAPSO" && (
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
                  {whatsappData.kapsoPhoneNumberId
                    ? instanceStatus === "close"
                      ? "Reconectar con Kapso"
                      : "Cambiar número vinculado"
                    : "Vincular con Kapso"}
                </NexusAutonomousButton>
                {Boolean(whatsappData.kapsoPhoneNumberId) && (
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
              className="flex w-full min-w-0 max-w-full items-center justify-between border border-border-main bg-bg-muted"
              style={{
                gap: "var(--space-md)",
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">Dispositivo del canal</p>
                <p className="break-words text-secondary text-text-muted">
                  {instanceStatus === "open"
                    ? whatsappData.provider === "KAPSO"
                      ? whatsappData.phone
                        ? `Cloud API vinculada: ${whatsappData.phone}`
                        : "Cloud API vinculada mediante Meta"
                      : "Vinculado con Evolution API"
                    : whatsappData.provider === "KAPSO"
                      ? "Cloud API sin conexión"
                      : `Instancia: ${instanceName}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-label ${
                  instanceStatus === "open"
                    ? "text-emerald-600"
                    : "text-text-muted"
                }`}
              >
                {instanceStatus === "loading"
                  ? "Revisando"
                  : instanceStatus === "open"
                    ? "En línea"
                    : "Desconectado"}
              </span>
            </div>
            <div
              className="flex w-full min-w-0 max-w-full items-center justify-between border border-border-main bg-bg-muted"
              style={{
                gap: "var(--space-md)",
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-h2 text-text-main">Notificaciones</p>
                <p className="break-words text-secondary text-text-muted">
                  {whatsappData.active
                    ? "Canal habilitado para enviar mensajes"
                    : "Canal en pausa"}
                </p>
              </div>
              <NexusSwitch
                className="shrink-0"
                checked={whatsappData.active}
                onChange={(active) =>
                  setWhatsappData({ ...whatsappData, active })
                }
                aria-label="Activar notificaciones de WhatsApp"
              />
            </div>
            {whatsappData.provider === "EVOLUTION" &&
              instanceStatus !== "open" && (
              <div
                className="grid w-full min-w-0 grid-cols-2"
                style={{ gap: "var(--space-base)" }}
              >
                  <NexusAutonomousButton
                    onClick={() => openWhatsAppFlow("qr")}
                    icon={QrCode}
                    variant="success"
                    className="w-full min-w-0"
                    disabled={instanceStatus === "loading"}
                    isLoading={connectingMethod === "qr"}
                  >
                    Vincular QR
                  </NexusAutonomousButton>
                  <NexusAutonomousButton
                    onClick={() => openWhatsAppFlow("pairing_code")}
                    icon={KeyRound}
                    variant="success"
                    className="w-full min-w-0"
                    disabled={instanceStatus === "loading"}
                    isLoading={connectingMethod === "pairing_code"}
                  >
                    Usar código
                  </NexusAutonomousButton>
              </div>
            )}
            {whatsappData.provider === "KAPSO" &&
              Boolean(whatsappData.kapsoPhoneNumberId) && (
              <NexusAutonomousButton
                onClick={syncCloudTemplates}
                isLoading={isSyncingCloudTemplates}
                icon={RefreshCw}
                variant="secondary"
                className="w-full min-w-0"
              >
                Sincronizar plantillas
              </NexusAutonomousButton>
            )}
            {instanceStatus === "open" &&
              whatsappData.provider === "EVOLUTION" && (
              <NexusAutonomousButton
                onClick={disconnectWhatsApp}
                icon={LogOut}
                variant="danger"
                className="w-full"
              >
                Desvincular dispositivo
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
        isOpen={confirmDisconnectKapso}
        title="¿Desvincular Cloud API?"
        message="Kapso retirará este número del proyecto. El Canal Especializado conservará su configuración de Evolution API."
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
        onRegenerate={generateWhatsAppPairing}
      />
    </div>
  );
};

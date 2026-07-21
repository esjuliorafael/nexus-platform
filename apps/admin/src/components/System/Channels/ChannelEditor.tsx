import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
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
  Variable,
} from "lucide-react";
import { apiMercadoPago, apiPayments, apiSystem, apiWhatsApp } from "../../../api";
import { SalesChannel, WhatsAppChannel } from "../../../types";
import {
  NexusSectionButton,
  NexusCardButton,
  NexusAutonomousButton,
} from "../../ui/NexusButton";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusModal } from "../../ui/NexusModal";
import { NexusSwitch } from "../../ui/NexusSwitch";
import {
  WhatsAppPairingData,
  WhatsAppPairingMethod,
  WhatsAppPairingModal,
} from "./WhatsAppPairingModal";

interface ChannelEditorProps {
  id: string;
  onClose: () => void;
  onSave: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

type ModalType = "identity" | "bank" | "mercadopago" | "whatsapp" | null;

const PURPOSE_INSTANCES: Record<string, string> = {
  COMBAT: "nexus_combate",
  BREEDING: "nexus_cria",
  RAFFLES: "nexus_rifas",
};

const PURPOSE_LABELS: Record<string, string> = {
  COMBAT: "Canal de Combate",
  BREEDING: "Canal de Cria",
  RAFFLES: "Canal de Rifas",
};

const TEMPLATE_GROUPS = [
  {
    key: "store",
    label: "Tienda",
    description: "Mensajes para apartados, pagos y liberaciones de ordenes.",
    templates: [
      {
        type: "RESERVATION",
        label: "Apartado de orden",
        globalKey: "whatsapp_global_store_res",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          "{{bank_info}}",
          "{{time_store}}",
        ],
        sample:
          "{{greeting}}, {{customer_name}}. Tu orden #{{order_id}} fue apartada correctamente.\n\nProductos: {{item_list}}\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTienes {{time_store}} para realizar tu pago.",
      },
      {
        type: "PAYMENT_CONFIRMED",
        label: "Pago confirmado",
        globalKey: "whatsapp_global_store_pay",
        variables: [
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
        ],
        sample:
          "Hola {{customer_name}}, hemos confirmado el pago de tu orden #{{order_id}} por ${{amount}}. Tu pedido ya esta en proceso.",
      },
      {
        type: "RESTORED",
        label: "Apartado restaurado",
        globalKey: "whatsapp_global_store_restored",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          "{{bank_info}}",
          "{{time_store}}",
        ],
        sample:
          "{{greeting}}, {{customer_name}}. Tu apartado de la orden #{{order_id}} fue restaurado correctamente.\n\nProductos: {{item_list}}\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTienes {{time_store}} para completar tu pago.",
      },
      {
        type: "REMINDER",
        label: "Recordatorio de pago",
        globalKey: "whatsapp_global_store_reminder",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          "{{bank_info}}",
          "{{time_remaining}}",
        ],
        sample:
          "{{greeting}}, {{customer_name}}. Te recordamos que tu orden #{{order_id}} sigue pendiente de pago.\n\nProductos: {{item_list}}\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTu apartado vence en {{time_remaining}}.",
      },
      {
        type: "RELEASE",
        label: "Liberación de orden",
        globalKey: "whatsapp_global_store_rel",
        variables: ["{{customer_name}}", "{{order_id}}", "{{item_list}}"],
        sample:
          "¡Hola, {{customer_name}}! La orden #{{order_id}} fue liberada porque concluyó el tiempo disponible para confirmar el pago.\n\nProductos:\n{{item_list}}",
      },
    ],
  },
  {
    key: "raffle",
    label: "Rifas",
    description: "Mensajes para boletos apartados, pagados o liberados.",
    templates: [
      {
        type: "OPENING",
        label: "Aviso de apertura",
        globalKey: "whatsapp_global_raffle_opening",
        variables: [
          "{{raffle_name}}",
          "{{opening_date}}",
          "{{raffle_url}}",
        ],
        sample:
          "¡Ya comenzó! 🎟️\n\nLa rifa “{{raffle_name}}” abrió su participación el {{opening_date}}.\n\nSelecciona tus boletos aquí:\n{{raffle_url}}\n\n¡Mucha suerte! 🍀",
      },
      {
        type: "RESERVATION",
        label: "Apartado de boletos",
        globalKey: "whatsapp_global_raffle_res",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
          "{{bank_info}}",
          "{{time_raffle}}",
        ],
        sample:
          'Hola {{customer_name}}, tus boletos para la rifa "{{raffle_name}}" fueron apartados.\n\nBoletos participantes:\n{{ticket_list}}\n\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTienes {{time_raffle}} para realizar tu pago.',
      },
      {
        type: "PAYMENT_CONFIRMED",
        label: "Pago confirmado",
        globalKey: "whatsapp_global_raffle_pay",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
        ],
        sample:
          'Hola {{customer_name}}, recibimos tu pago para la rifa "{{raffle_name}}".\n\nBoletos participantes:\n{{ticket_list}}\n\nYa estás participando. Mucha suerte.',
      },
      {
        type: "REMINDER",
        label: "Recordatorio de pago",
        globalKey: "whatsapp_global_raffle_reminder",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
          "{{bank_info}}",
          "{{time_remaining}}",
        ],
        sample:
          'Hola {{customer_name}}, te recordamos que tus boletos para la rifa "{{raffle_name}}" siguen pendientes de pago.\n\nBoletos participantes:\n{{ticket_list}}\n\nTotal: ${{amount}}\n\n{{bank_info}}\n\nTus boletos se liberarán en {{time_remaining}}.',
      },
      {
        type: "RELEASE",
        label: "Liberación de boletos",
        globalKey: "whatsapp_global_raffle_rel",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
        ],
        sample:
          'Hola {{customer_name}}, tus boletos para la rifa "{{raffle_name}}" fueron liberados porque concluyó el tiempo disponible para confirmar el pago.\n\nBoletos participantes:\n{{ticket_list}}',
      },
    ],
  },
];

const StatusPill: React.FC<{ ready: boolean; label: string }> = ({
  ready,
  label,
}) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
      ready
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-bg-muted text-text-muted border-border-main"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-emerald-500" : "bg-text-muted/30"}`}
    />
    {label}
  </span>
);

export const ChannelEditor: React.FC<ChannelEditorProps> = ({
  id,
  onClose,
  onSave,
  showToast,
  setConfirmDialog,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    templates: [] as any[],
  });
  const [instanceStatus, setInstanceStatus] = useState<
    "open" | "close" | "connecting" | "loading"
  >("loading");
  const [pairingData, setPairingData] = useState<WhatsAppPairingData | null>(null);
  const [templateDraft, setTemplateDraft] = useState<{
    type: string;
    label: string;
    content: string;
    variables: string[];
    sample: string;
    source: string;
  } | null>(null);

  const RAFFLE_ENABLED = import.meta.env.VITE_RAFFLE_ENABLED === "true";

  const instanceName = useMemo(
    () =>
      whatsappObj?.instanceName ||
      PURPOSE_INSTANCES[generalData.purpose.toUpperCase()] ||
      "",
    [generalData.purpose, whatsappObj?.instanceName],
  );

  const checkInstanceStatus = async (name: string) => {
    if (!name) {
      setInstanceStatus("close");
      return "close";
    }
    setInstanceStatus("loading");
    try {
      const res = await apiWhatsApp.getStatus(name);
      const state = res.data.instance.state;
      setInstanceStatus(state);
      return state;
    } catch (error) {
      setInstanceStatus("close");
      return "close";
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
        templates: wa?.templates || [],
      });

      await checkInstanceStatus(
        wa?.instanceName || PURPOSE_INSTANCES[purpose?.toUpperCase?.()] || "",
      );
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
          prev
            ? { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }
            : null,
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
    whatsappData.phone && whatsappData.active && instanceStatus === "open",
  );
  const visibleTemplateGroups = useMemo(() => {
    const purpose = generalData.purpose.toUpperCase();
    if (purpose === "RAFFLES")
      return TEMPLATE_GROUPS.filter((group) => group.key === "raffle");
    if (purpose === "COMBAT" || purpose === "BREEDING")
      return TEMPLATE_GROUPS.filter((group) => group.key === "store");
    return TEMPLATE_GROUPS;
  }, [generalData.purpose]);
  const visibleTemplateTypes = visibleTemplateGroups.flatMap((group) =>
    group.templates.map((template) => template.type),
  );
  const templatesReady = visibleTemplateTypes.every((type) =>
    whatsappData.templates.some(
      (template) => template.type?.toUpperCase() === type,
    ),
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
        instanceName,
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
    if (!whatsappData.phone.trim()) {
      showToast("El numero de WhatsApp es obligatorio", "error");
      return false;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...generalData,
        phone: whatsappData.phone,
        active: whatsappData.active,
        instanceName,
      };
      if (whatsappObj) await apiWhatsApp.update(whatsappObj.id, payload);
      else await apiWhatsApp.create(payload);
      if (close) {
        showToast("Mensajeria actualizada");
        setModal(null);
      }
      await loadChannelData();
      onSave();
      return true;
    } catch (error) {
      showToast("No se pudo guardar la mensajeria", "error");
      return false;
    } finally {
      setIsSaving(false);
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
      showToast(error?.response?.data?.message || "Error al conectar con Mercado Pago", "error");
    }
  };

  const openWhatsAppFlow = async (method: WhatsAppPairingMethod) => {
    if (!instanceName) {
      showToast("Este canal no tiene instancia asignada", "error");
      return;
    }
    if (!whatsappData.phone.trim()) {
      showToast("Primero captura el numero de WhatsApp", "error");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Confirmar línea de WhatsApp",
      message: method === "qr"
        ? `Se generará un QR para vincular el número ${whatsappData.phone}.`
        : `Se generará un código asociado al número ${whatsappData.phone}.`,
      confirmLabel: method === "qr" ? "Generar QR" : "Generar código",
      variant: "warning",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        const saved = await saveWhatsApp(false);
        if (!saved) return;
        try {
          const res = await apiWhatsApp.connect(instanceName, method, whatsappData.phone);
          const value = method === "qr" ? res.data?.base64 : res.data?.pairingCode;
          if (!value) throw new Error("Evolution API no devolvió un código");
          setPairingData({
            method,
            base64: res.data?.base64,
            pairingCode: res.data?.pairingCode,
            instanceName,
            timeLeft: 40,
          });
        } catch (error: any) {
          showToast(
            error?.response?.data?.error ||
              (method === "qr" ? "Error al generar QR" : "Error al generar el código"),
            "error",
          );
        }
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
          showToast("WhatsApp desvinculado");
        } catch (error) {
          showToast("No se pudo desvincular WhatsApp", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  const getTemplateMeta = (type: string, globalKey: string) => {
    const existing = whatsappData.templates.find(
      (t) => t.type?.toUpperCase() === type.toUpperCase(),
    );
    if (existing?.content)
      return { source: "Canal", content: existing.content };
    if (globalConfig[globalKey])
      return { source: "Principal", content: globalConfig[globalKey] };
    return { source: "Sin definir", content: "" };
  };

  const renderTemplatePreview = (content: string) => {
    const bankInfo = [
      "Banco: BBVA",
      "Beneficiario: Rancho Demo",
      "No. Cuenta: 1234567890",
      "CLABE: 012345678901234567",
      "Tarjeta: 1234 5678 9012 3456",
    ].join("\n");

    return content
      .replace(/\{\{greeting\}\}/g, "Buena tarde")
      .replace(/\{\{customer_name\}\}/g, "Carlos Ramirez")
      .replace(/\{\{order_id\}\}/g, "1284")
      .replace(/\{\{item_list\}\}/g, "1x Gallo colorado, 2x Alimento premium")
      .replace(
        /\{\{ticket_list\}\}/g,
        "002, 005, 009 y 010\n\n✨ Oportunidades adicionales:\n\n002: 164, 246, 271, 635, 701, 888, 986\n005: 171, 265, 534, 817, 929, 943, 976\n009: 212, 430, 516, 605, 626, 752, 882\n010: 405, 423, 436, 441, 538, 728, 963",
      )
      .replace(/\{\{raffle_name\}\}/g, "Rifa Especial de Junio")
      .replace(/\{\{opening_date\}\}/g, "lunes, 20 de julio de 2026 a las 8:00 a.m.")
      .replace(/\{\{raffle_url\}\}/g, "https://rancholastrojes.com.mx/raffles/1")
      .replace(/\{\{amount\}\}/g, "1,250.00")
      .replace(/\{\{bank_info\}\}/g, bankInfo)
      .replace(/\{\{time_store\}\}/g, "24 horas")
      .replace(/\{\{time_raffle\}\}/g, "12 horas")
      .replace(/\{\{time_remaining\}\}/g, "4 horas");
  };

  const openTemplate = (
    type: string,
    label: string,
    globalKey: string,
    variables: string[],
    sample: string,
  ) => {
    const existing = whatsappData.templates.find(
      (t) => t.type?.toUpperCase() === type.toUpperCase(),
    );
    const meta = getTemplateMeta(type, globalKey);
    setTemplateDraft({
      type,
      label,
      content: existing?.content || "",
      variables,
      sample,
      source: meta.source,
    });
  };

  const saveTemplate = async () => {
    if (!templateDraft || !whatsappObj) {
      showToast("Guarda primero la mensajeria del canal", "error");
      return;
    }
    setIsSaving(true);
    try {
      await apiWhatsApp.saveTemplate(whatsappObj.id, {
        type: templateDraft.type as any,
        content: templateDraft.content,
      });
      showToast("Plantilla guardada");
      setTemplateDraft(null);
      loadChannelData();
    } catch (error) {
      showToast("No se pudo guardar la plantilla", "error");
    } finally {
      setIsSaving(false);
    }
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

  if (templateDraft) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-300">
        <NexusCardButton
          onClick={() => setTemplateDraft(null)}
          variant="secondary"
          icon={ArrowLeft}
        >
          Volver a Plantillas
        </NexusCardButton>

        <NexusSection
          title={templateDraft.label}
          subtitle={`Origen actual: ${templateDraft.source}. Al guardar, este canal usara su propia plantilla para este evento.`}
          icon={FileText}
          iconVariant="brand"
          action={
            <NexusSectionButton
              onClick={saveTemplate}
              isLoading={isSaving}
              icon={Save}
            >
              Guardar Plantilla
            </NexusSectionButton>
          }
        >
          <div
            className="grid grid-cols-1 xl:grid-cols-2"
            style={{ gap: "var(--space-lg)" }}
          >
            <div className="space-y-6">
              <NexusTextarea
                label="Mensaje del canal"
                rows={12}
                value={templateDraft.content}
                onChange={(e) =>
                  setTemplateDraft({
                    ...templateDraft,
                    content: e.target.value,
                  })
                }
                placeholder={templateDraft.sample}
                helperText="Dejalo vacio si quieres seguir usando la plantilla principal o el default del sistema."
              />
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-5">
                <p className="text-label text-text-muted mb-3">
                  Variables disponibles
                </p>
                <div className="flex flex-wrap gap-2">
                  {templateDraft.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-3 py-1.5 rounded-full bg-bg-card border border-border-main text-label text-text-muted"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <NexusSection
              title="Preview"
              subtitle="Ejemplo con datos simulados"
              icon={Variable}
              iconVariant="muted"
              animate={false}
            >
              <div className="bg-bg-muted border border-border-main rounded-[2rem] p-6 whitespace-pre-line text-secondary text-text-main leading-relaxed min-h-[20rem]">
                {renderTemplatePreview(
                  templateDraft.content || templateDraft.sample,
                )}
              </div>
              <p className="text-label text-text-muted/60 mt-5">
                Esta plantilla solo aplica a este canal especializado. Si falta,
                Nexus intenta usar el Canal Principal.
              </p>
            </NexusSection>
          </div>
        </NexusSection>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <NexusCardButton onClick={onClose} icon={ArrowLeft} variant="secondary">
          Volver
        </NexusCardButton>
        <div className="flex items-center gap-2">
          <StatusPill ready={paymentReady} label="Banco" />
          <StatusPill ready={mpReady} label="MP" />
          <StatusPill ready={whatsappReady} label="WA" />
          <StatusPill ready={templatesReady} label="Tpl" />
        </div>
      </div>

      <NexusSection
        title={
          generalData.name ||
          PURPOSE_LABELS[generalData.purpose] ||
          "Canal Especializado"
        }
        subtitle="Este canal sobrescribe al Canal Principal cuando el flujo coincide con su proposito"
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
            title="Mensajeria WhatsApp"
            subtitle={whatsappData.phone || "Numero de WhatsApp pendiente"}
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
        title="Plantillas del Canal"
        subtitle="Mensajes especializados para este proposito. Si falta una, se usa Canal Principal."
        icon={FileText}
        iconVariant={templatesReady ? "brand" : "muted"}
      >
        <div className="flex flex-col gap-8">
          {visibleTemplateGroups.map((group) => (
            <div key={group.label} className="space-y-4">
              <div>
                <h4 className="text-h2 text-text-main">{group.label}</h4>
                <p className="text-secondary text-text-muted">
                  {group.description}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {group.templates.map((template) => {
                  const meta = getTemplateMeta(
                    template.type,
                    template.globalKey,
                  );
                  const exists = meta.source === "Canal";
                  const hasFallback = meta.source === "Principal";
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
                      key={`${group.label}-${template.type}`}
                      icon={Icon}
                      iconVariant={
                        exists ? "brand" : hasFallback ? "emerald" : "muted"
                      }
                      title={template.label}
                      subtitle={
                        exists
                          ? "Plantilla configurada para este canal"
                          : hasFallback
                            ? "Usa plantilla del Canal Principal"
                            : "Sin plantilla configurada"
                      }
                      rightContent={
                        <p className="text-label text-text-muted">
                          {meta.source}
                        </p>
                      }
                      actions={
                        <NexusCardButton
                          onClick={() =>
                            openTemplate(
                              template.type,
                              `${group.label}: ${template.label}`,
                              template.globalKey,
                              template.variables,
                              template.sample,
                            )
                          }
                          icon={Edit2}
                        >
                          Editar
                        </NexusCardButton>
                      }
                    />
                  );
                })}
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
          title="Mensajería WhatsApp"
          eyebrow="Configurar Canal"
          icon={MessageCircle}
          onClose={() => setModal(null)}
          size="standard"
          zIndex={250}
        >
          <div
            className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden"
            style={{ gap: "var(--space-lg)" }}
          >
            <NexusInput
              label="Número de WhatsApp"
              value={whatsappData.phone}
              onChange={(e) =>
                setWhatsappData({ ...whatsappData, phone: e.target.value })
              }
              icon={Smartphone}
              helperText="Incluye código de país. Para México suele iniciar con 521."
            />
            <div
              className="flex w-full min-w-0 max-w-full flex-col items-stretch border border-border-main bg-bg-muted sm:flex-row sm:items-center sm:justify-between"
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
                className="shrink-0 self-start sm:self-center"
                checked={whatsappData.active}
                onChange={(active) =>
                  setWhatsappData({ ...whatsappData, active })
                }
                aria-label="Activar notificaciones de WhatsApp"
              />
            </div>
            <div
              className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] sm:grid-cols-2"
              style={{ gap: "var(--space-base)" }}
            >
              <NexusAutonomousButton
                density="compact"
                onClick={() => saveWhatsApp(true)}
                isLoading={isSaving}
                icon={Save}
                className="w-full min-w-0 sm:col-span-1"
              >
                Guardar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                density="compact"
                onClick={() => openWhatsAppFlow("qr")}
                icon={QrCode}
                variant="success"
                className="w-full min-w-0 sm:col-span-1"
                disabled={instanceStatus === "open"}
              >
                Vincular QR
              </NexusAutonomousButton>
              <NexusAutonomousButton
                density="compact"
                onClick={() => openWhatsAppFlow("pairing_code")}
                icon={KeyRound}
                variant="success"
                className="w-full min-w-0 sm:col-span-1"
                disabled={instanceStatus === "open"}
              >
                Usar código
              </NexusAutonomousButton>
              <NexusAutonomousButton
                density="compact"
                onClick={() => checkInstanceStatus(instanceName)}
                icon={RefreshCw}
                variant="secondary"
                className="w-full min-w-0 sm:col-span-1"
              >
                Revisar
              </NexusAutonomousButton>
            </div>
            {instanceStatus === "open" && (
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

      <WhatsAppPairingModal
        data={pairingData}
        onClose={() => setPairingData(null)}
        onRegenerate={openWhatsAppFlow}
      />
    </div>
  );
};

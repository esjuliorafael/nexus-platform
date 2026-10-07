import React, { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Link2,
  Package,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  apiProducts,
  apiStorePaymentAssistance,
  type AssistedCheckoutLink,
  type AssistedCheckoutLinkGeneration,
  type AssistedCheckoutLinkStatus,
} from "../../../api";
import type { Product } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusBadge, type NexusBadgeVariant } from "../../ui/NexusBadge";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSectionButton, NexusButton } from "../../ui/NexusButton";
import { NexusInput, NexusSelect } from "../../ui/NexusInputs";
import { NexusSpinner } from "../../ui/NexusSpinner";

interface PaymentLinksViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

const statusMeta: Record<
  AssistedCheckoutLinkStatus,
  { label: string; variant: NexusBadgeVariant; description: string }
> = {
  ACTIVE: {
    label: "Activo",
    variant: "success",
    description: "Puede abrirse y crear una retención.",
  },
  IN_PAYMENT: {
    label: "En checkout",
    variant: "warning",
    description: "La retención mantiene el inventario protegido.",
  },
  PAID: {
    label: "Confirmado",
    variant: "info",
    description: "El pago ya se convirtió en una orden.",
  },
  EXPIRED: {
    label: "Vencido",
    variant: "muted",
    description: "La ventana de compra terminó sin orden confirmada.",
  },
  REVOKED: {
    label: "Revocado",
    variant: "danger",
    description: "El enlace ya no puede utilizarse.",
  },
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as any)?.response?.data?.message;
  return typeof responseMessage === "string"
    ? responseMessage
    : error instanceof Error
      ? error.message
      : fallback;
};

const copyToClipboard = async (value: string) => {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const productLabel = (product: Product) =>
  product.type === "BIRD" && product.ringNumber
    ? `${product.name} · Anillo ${product.ringNumber}`
    : product.name;

export const PaymentLinksView: React.FC<PaymentLinksViewProps> = ({
  showToast,
  setConfirmDialog,
}) => {
  const [links, setLinks] = useState<AssistedCheckoutLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | AssistedCheckoutLinkStatus>("ALL");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lastGenerated, setLastGenerated] = useState<AssistedCheckoutLinkGeneration | null>(null);

  const availableProducts = useMemo(
    () => products.filter((product) => product.active && product.published && product.status === "available"),
    [products],
  );

  const selectedProduct = availableProducts.find((product) => product.id === selectedProductId);
  const filteredLinks = links;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [linkResponse, productResponse] = await Promise.all([
        apiStorePaymentAssistance.getAll({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: search.trim() || undefined,
        }),
        apiProducts.getAll(),
      ]);
      setLinks(linkResponse.items);
      const nextProducts = productResponse as Product[];
      setProducts(nextProducts);
      if (!selectedProductId || !nextProducts.some((product) => product.id === selectedProductId && product.active && product.published && product.status === "available")) {
        const firstAvailable = nextProducts.find(
          (product) => product.active && product.published && product.status === "available",
        );
        setSelectedProductId(firstAvailable?.id ?? "");
      }
    } catch (error) {
      console.error("Error cargando enlaces de pago asistido:", error);
      showToast(getErrorMessage(error, "No se pudieron cargar los enlaces de pago."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter, search]);

  const handleGenerate = async () => {
    if (!selectedProductId || isGenerating) return;
    const parsedQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
    setIsGenerating(true);
    try {
      const result = await apiStorePaymentAssistance.createLink(selectedProductId, parsedQuantity);
      setLastGenerated(result);
      const copied = await copyToClipboard(result.url);
      showToast(copied ? "Enlace generado y copiado" : "Enlace generado; cópialo desde el panel");
      await loadData();
    } catch (error) {
      console.error("Error generando enlace de pago asistido:", error);
      showToast(getErrorMessage(error, "No se pudo generar el enlace de pago."), "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = (link: AssistedCheckoutLink) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Revocar enlace?",
      message: `El enlace de ${link.product.name} dejará de aceptar accesos. Esto no cancela ni libera una retención de pago activa.`,
      confirmLabel: "Sí, revocar",
      variant: "danger",
      onConfirm: async () => {
        setBusyLinkId(link.id);
        try {
          await apiStorePaymentAssistance.revoke(link.id);
          showToast("Enlace revocado");
          await loadData();
        } catch (error) {
          showToast(getErrorMessage(error, "No se pudo revocar el enlace."), "error");
        } finally {
          setBusyLinkId(null);
          setConfirmDialog({ isOpen: false });
        }
      },
    });
  };

  const handleRegenerate = async (link: AssistedCheckoutLink) => {
    setBusyLinkId(link.id);
    try {
      const result = await apiStorePaymentAssistance.regenerate(link.id);
      setLastGenerated(result);
      const copied = await copyToClipboard(result.url);
      showToast(copied ? "Enlace regenerado y copiado" : "Enlace regenerado; cópialo desde el panel");
      await loadData();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo regenerar el enlace."), "error");
    } finally {
      setBusyLinkId(null);
    }
  };

  if (isLoading && links.length === 0) return <NexusSpinner label="Cargando enlaces de pago..." />;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
      <NexusSection
        title="Generación asistida"
        subtitle="Crea un acceso directo a Mercado Pago para ayudar a cerrar una venta."
        icon={Link2}
        iconVariant="brand"
        action={
          <NexusSectionButton
            icon={Link2}
            variant="brand"
            onClick={handleGenerate}
            disabled={!selectedProductId || isGenerating}
            isLoading={isGenerating}
          >
            Generar enlace
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.35fr)] items-end" style={{ gap: "var(--space-md)" }}>
          <NexusSelect
            label="Producto disponible"
            value={selectedProductId}
            onChange={(event) => {
              setSelectedProductId(event.target.value);
              const product = availableProducts.find((item) => item.id === event.target.value);
              setQuantity(product?.type === "BIRD" ? "1" : quantity);
            }}
          >
            <option value="">Selecciona un producto</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {productLabel(product)} · ${product.price.toLocaleString("es-MX")}
              </option>
            ))}
          </NexusSelect>
          <NexusInput
            label="Cantidad"
            type="number"
            min={1}
            max={selectedProduct?.type === "BIRD" ? 1 : selectedProduct?.stock || 99}
            value={quantity}
            disabled={selectedProduct?.type === "BIRD"}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        {availableProducts.length === 0 && (
          <p className="mt-[var(--space-md)] text-secondary text-text-muted">
            No hay productos disponibles para generar un enlace. Un producto reservado no se puede ofrecer por este medio.
          </p>
        )}
        {lastGenerated && (
          <div
            className="mt-[var(--space-lg)] border border-brand-200 bg-brand-50/50"
            style={{ padding: "var(--space-md)", borderRadius: "var(--radius-inner-visual)" }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
              <ShieldCheck size={18} className="text-brand-600" />
              <p className="text-button-card text-text-main">Enlace listo para compartir</p>
            </div>
            <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all text-caption text-text-muted">{lastGenerated.url}</code>
              <NexusButton
                type="button"
                context="card"
                variant="secondary"
                icon={Copy}
                onClick={async () => {
                  const copied = await copyToClipboard(lastGenerated.url);
                  showToast(copied ? "Enlace copiado" : "No se pudo copiar el enlace", copied ? "success" : "error");
                }}
              >
                Copiar
              </NexusButton>
            </div>
            <p className="mt-[var(--space-sm)] text-caption text-text-muted">
              Vence el {formatDate(lastGenerated.expiresAt)}. El token solo se muestra en esta sesión.
            </p>
          </div>
        )}
      </NexusSection>

      <NexusSection
        title="Control de enlaces"
        subtitle="Un enlace no libera ni confirma inventario por sí mismo; la retención comienza al crear el checkout."
        icon={ShieldCheck}
        iconVariant="muted"
        action={
          <NexusSectionButton type="button" variant="secondary" icon={RefreshCw} onClick={() => void loadData()}>
            Actualizar
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_14rem] items-end" style={{ gap: "var(--space-md)" }}>
            <div className="relative">
              <NexusInput
                label="Buscar producto o anillo"
                icon={Search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej. Kelso KA o 096"
              />
            </div>
            <NexusSelect
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | AssistedCheckoutLinkStatus)}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="IN_PAYMENT">En checkout</option>
              <option value="PAID">Confirmados</option>
              <option value="EXPIRED">Vencidos</option>
              <option value="REVOKED">Revocados</option>
            </NexusSelect>
          </div>

          {filteredLinks.length === 0 ? (
            <EmptyState
              level={2}
              icon={Link2}
              title="Sin enlaces registrados"
              description="Los enlaces generados desde la tienda aparecerán aquí con su estado y trazabilidad."
            />
          ) : (
            <div className="divide-y divide-border-main border-y border-border-main">
              {filteredLinks.map((link) => {
                const meta = statusMeta[link.status];
                const isBusy = busyLinkId === link.id;
                const canRevoke = link.status === "ACTIVE" || link.status === "EXPIRED";
                const canRegenerate = link.status === "ACTIVE" || link.status === "EXPIRED" || link.status === "REVOKED";
                return (
                  <article key={link.id} className="flex flex-col gap-[var(--space-md)] py-[var(--space-lg)] lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.7fr)_minmax(14rem,0.9fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start" style={{ gap: "var(--space-md)" }}>
                      <div
                        className="flex shrink-0 items-center justify-center border border-border-main bg-bg-muted text-text-muted"
                        style={{ width: "var(--size-button-card)", height: "var(--size-button-card)", borderRadius: "var(--radius-nested-simple)" }}
                      >
                        {link.product.type === "BIRD" ? <CircleDollarSign size={20} /> : <Package size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-h2 text-text-main truncate">{link.product.name}</p>
                        <p className="text-secondary text-text-muted">
                          {link.product.ringNumber ? `Anillo ${link.product.ringNumber} · ` : ""}
                          {link.quantity} {link.quantity === 1 ? "unidad" : "unidades"} · ${link.product.price.toLocaleString("es-MX")}
                        </p>
                        <p className="mt-[var(--space-xs)] text-caption text-text-muted">Creado {formatDate(link.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start" style={{ gap: "var(--space-xs)" }}>
                      <NexusBadge variant={meta.variant} icon={link.status === "PAID" ? CheckCircle2 : link.status === "IN_PAYMENT" ? CreditCard : link.status === "EXPIRED" ? Clock3 : link.status === "REVOKED" ? Ban : Check}>
                        {meta.label}
                      </NexusBadge>
                      <span className="text-caption text-text-muted">{meta.description}</span>
                    </div>

                    <div className="text-secondary text-text-muted">
                      {link.paymentHold ? (
                        <>
                          <p className="text-button-card text-text-main">{link.paymentHold.customerName}</p>
                          <p>{link.paymentHold.customerPhone}</p>
                          <p className="text-caption">Retención vence {formatDate(link.paymentHold.expiresAt)}</p>
                        </>
                      ) : (
                        <>
                          <p>Sin retención iniciada</p>
                          <p className="text-caption">Enlace vence {formatDate(link.expiresAt)}</p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-start gap-[var(--space-sm)] lg:justify-end">
                      {canRegenerate && (
                        <NexusButton
                          type="button"
                          context="card"
                          variant="secondary"
                          icon={RotateCw}
                          disabled={isBusy}
                          isLoading={isBusy}
                          onClick={() => void handleRegenerate(link)}
                        >
                          Regenerar
                        </NexusButton>
                      )}
                      {canRevoke && (
                        <NexusButton
                          type="button"
                          context="card"
                          variant="danger"
                          icon={Ban}
                          disabled={isBusy}
                          onClick={() => handleRevoke(link)}
                        >
                          Revocar
                        </NexusButton>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </NexusSection>
    </div>
  );
};

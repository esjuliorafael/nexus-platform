"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle,
  Copy,
  CreditCard,
  Info,
  MapPin,
  Plane,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { orderApi, StoreOrderResponse } from "../../api/orders";
import { paymentApi, PublicPaymentChannel } from "../../api/payments";
import { productApi } from "../../api/products";
import { settingsApi } from "../../api/settings";
import { useSettings } from "../../hooks/useSettings";
import { useCartStore } from "../../store/cart.store";
import { useToastStore } from "../../store/toast.store";
import { Button } from "../../components/ui/Button";
import { StorefrontCard, StorefrontSectionCard } from "../../components/ui/Card";
import { StorefrontField, StorefrontSelect } from "../../components/ui/Field";
import { StorefrontIcon } from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Spinner";
import { StorefrontConfirmModal } from "../../components/ui/ConfirmModal";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { StorefrontPurchaseBar } from "../../components/ui/PurchaseBar";
import { CouponRedemption } from "../../components/cart/CouponRedemption";
import { formatPrice, getAssetUrl } from "../../utils/formatters";

type DeliveryType = "SHIPPING" | "PICKUP";
type DeliveryMethod = "BUS_STATION" | "AIRPORT" | "PARCEL";
type PaymentMethod = "TRANSFER" | "MERCADOPAGO";
type PaymentStatus = "success" | "pending" | "failure" | null;
type CheckoutStep = 0 | 1 | 2 | 3;

interface ShippingZone {
  id: number;
  name: string;
  zoneType: "STANDARD" | "EXTENDED" | string;
}

interface ShippingDetail {
  label: string;
  amount: number;
  note?: string;
}

interface BankInfo {
  label: string;
  bank: string;
  beneficiary: string;
  account?: string | null;
  clabe?: string | null;
  card?: string | null;
}

export default function CheckoutPage() {
  const { items, coupon, getTotalPrice, getDiscountTotal, clearCart, removeItem } = useCartStore();
  const { settings, getSetting } = useSettings();
  const { showToast } = useToastStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<StoreOrderResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TRANSFER");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null);
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PublicPaymentChannel[]>([]);
  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [someoneElseReceives, setSomeoneElseReceives] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(0);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const checkoutFormRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    receiverName: "",
    shippingAddress: "",
    shippingStreet: "",
    shippingNeighborhood: "",
    shippingPostalCode: "",
    shippingCity: "",
    shippingState: "",
    deliveryMethod: "" as DeliveryMethod | "",
    deliveryType: "SHIPPING" as DeliveryType,
  });

  useEffect(() => {
    setMounted(true);
    settingsApi.getPublicShippingZones()
      .then((data) => setZones(data as ShippingZone[]))
      .catch((err) => console.error("Error loading shipping zones:", err));

    paymentApi.getChannels()
      .then(setPaymentChannels)
      .catch((err) => console.error("Error loading payment channels:", err));

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("external_reference")?.replace("order_", "");

    if (status === "approved" || status === "success") {
      setPaymentStatus("success");
      clearCart();
      if (orderId) setOrderComplete({ id: orderId, status: "PAID" });
    } else if (status === "pending" || status === "in_process") {
      setPaymentStatus("pending");
      clearCart();
    } else if (status === "rejected" || status === "failure") {
      setPaymentStatus("failure");
    }
  }, [clearCart]);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    Promise.all(items.map((item) => productApi.getById(item.productId)))
      .then(setCartProducts)
      .catch((err) => console.error("Error loading cart products:", err));
  }, [items, mounted]);

  const hasBirds = items.some((item) => item.type?.toLowerCase() === "bird");
  const hasItems = items.some((item) => item.type?.toLowerCase() === "item");
  const requiresFullAddress = hasItems;
  const isArticlesOnly = hasItems && !hasBirds;

  const findSetting = (key: string) => {
    if (!settings) return null;
    for (const group in settings) {
      if (settings[group][key] !== undefined) return settings[group][key];
    }
    return null;
  };

  const shippingCalculation = useMemo(() => {
    const freeBirds = findSetting("shipping_free_threshold_birds") === "1";
    const freeItems = findSetting("shipping_free_threshold_items") === "1";
    const costStandard = Number(findSetting("shipping_cost_standard") || 0);
    const costExtended = Number(findSetting("shipping_cost_extended") || 0);
    const costBaseItems = Number(findSetting("shipping_base_cost_items") || 0);

    let total = 0;
    const details: ShippingDetail[] = [];

    if (hasBirds && selectedZone) {
      if (freeBirds) {
        details.push({ label: "Envío de aves", amount: 0, note: "Promoción envío gratis" });
      } else {
        const amount = selectedZone.zoneType === "EXTENDED" ? costExtended : costStandard;
        total += amount;
        details.push({
          label: selectedZone.zoneType === "EXTENDED" ? "Aves, aeropuerto" : "Aves, central de autobuses",
          amount,
          note: selectedZone.name,
        });
      }
    }

    if (hasItems) {
      if (freeItems) {
        details.push({ label: "Artículos", amount: 0, note: "Promoción envío gratis" });
      } else {
        total += costBaseItems;
        details.push({ label: "Artículos a domicilio", amount: costBaseItems });
      }
    }

    return { total, details };
  }, [hasBirds, hasItems, selectedZone, settings]);

  const isMPEnabled = !!getSetting("payments", "mp_seller_access_token");
  const discountTotal = getDiscountTotal();
  const orderTotal = Math.max(0, getTotalPrice() + shippingCalculation.total - discountTotal);
  const selectedZoneMethod = selectedZone?.zoneType === "EXTENDED" ? "AIRPORT" : "BUS_STATION";
  const deliveryMethodMismatch = Boolean(hasBirds && selectedZone && formData.deliveryMethod && formData.deliveryMethod !== selectedZoneMethod);
  const shippingStatusNote = useMemo(() => {
    if (isArticlesOnly) {
      return "Tus artículos se envían por paquetería a domicilio. Usaremos tu dirección para coordinar la entrega.";
    }

    if (!selectedZone) {
      return hasItems
        ? "Tus artículos se envían a domicilio. La entrega del ave se define con tu ciudad y estado."
        : "La entrega del ave se define con tu ciudad y estado.";
    }

    const birdDelivery = selectedZone.zoneType === "EXTENDED" ? "aeropuerto" : "central de autobuses";
    if (hasItems) {
      return `Para ${selectedZone.name}, el ave se coordina por ${birdDelivery}. Los artículos se envían a tu dirección.`;
    }

    return `Para ${selectedZone.name}, la entrega se coordina por ${birdDelivery}. Te contactaremos para afinar los detalles.`;
  }, [hasItems, isArticlesOnly, selectedZone]);
  const shippingStatusTone = deliveryMethodMismatch ? "warning" : "default";

  const bankInfo = useMemo<BankInfo>(() => {
    const birdPurposes = cartProducts
      .filter((product) => product.type === "BIRD" && product.purpose)
      .map((product) => String(product.purpose).toUpperCase());
    const uniqueBirdPurposes = Array.from(new Set(birdPurposes));
    const specializedPurpose = hasBirds && !hasItems && uniqueBirdPurposes.length === 1 ? uniqueBirdPurposes[0] : null;
    const specializedPayment = specializedPurpose
      ? paymentChannels.find((channel) => channel.purpose?.toUpperCase() === specializedPurpose)
      : null;

    if (specializedPayment) {
      return {
        label: specializedPurpose === "COMBAT" ? "Canal de Combate" : "Canal de Cría",
        bank: specializedPayment.bank,
        beneficiary: specializedPayment.beneficiary,
        account: specializedPayment.accountNumber,
        clabe: specializedPayment.clabe,
        card: specializedPayment.card,
      };
    }

    return {
      label: hasItems && hasBirds ? "Canal Principal, orden mixta" : "Canal Principal",
      bank: String(findSetting("bank_main_name") || ""),
      beneficiary: String(findSetting("bank_main_beneficiary") || ""),
      account: findSetting("bank_main_account"),
      clabe: findSetting("bank_main_clabe"),
      card: findSetting("bank_main_card"),
    };
  }, [cartProducts, hasBirds, hasItems, paymentChannels, settings]);

  const bankInfoText = formatBankInfo(bankInfo);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.deliveryMethod) {
      showToast("Selecciona cómo enviamos tu orden.", "info");
      return;
    }
    if (!selectedZone) {
      showToast("Selecciona tu estado para calcular el envío.", "info");
      return;
    }
    if (!formData.shippingCity.trim()) {
      showToast("Escribe la ciudad para coordinar el envío.", "info");
      return;
    }
    if (requiresFullAddress && (!formData.shippingStreet.trim() || !formData.shippingNeighborhood.trim() || !formData.shippingPostalCode.trim())) {
      showToast("Completa calle, colonia y código postal para enviar los artículos.", "info");
      return;
    }
    if (someoneElseReceives && !formData.receiverName.trim()) {
      showToast("Escribe el nombre de quien recibe.", "info");
      return;
    }

    const shippingAddress = requiresFullAddress
      ? [
          formData.shippingStreet,
          formData.shippingNeighborhood ? `Col. ${formData.shippingNeighborhood}` : "",
          formData.shippingPostalCode ? `CP ${formData.shippingPostalCode}` : "",
          formData.shippingCity,
          selectedZone.name,
        ].filter(Boolean).join(", ")
      : [formData.shippingCity, selectedZone.name].filter(Boolean).join(", ");

    setLoading(true);
    try {
      const createdOrder = await orderApi.create({
        ...formData,
        receiverName: someoneElseReceives ? formData.receiverName : "",
        shippingState: selectedZone.name,
        shippingAddress,
        shippingCost: shippingCalculation.total,
        couponCode: coupon?.code || "",
        deliveryType: "SHIPPING",
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      if (paymentMethod === "MERCADOPAGO") {
        const preference = await paymentApi.getPreference(Number(createdOrder.id));
        if (preference.init_point) {
          window.location.href = preference.init_point;
          return;
        }
      }

      setOrderComplete(createdOrder);
      clearCart();
    } catch (error: unknown) {
      console.error("Order failed details:", error);
      alert(getErrorMessage(error) || "Error al procesar el pedido. Por favor intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = () => {
    if (itemToDelete) {
      removeItem(itemToDelete.productId);
      showToast(`${itemToDelete.name} eliminado de tu selección.`, "info");
      setItemToDelete(null);
    }
  };

  const checkoutSteps = [
    { label: "Envío", title: "Método de entrega" },
    { label: "Cliente", title: "Información del cliente" },
    { label: "Ubicación", title: requiresFullAddress ? "Dirección y ubicación" : "Ubicación de entrega" },
    { label: "Pago", title: "Método de pago" },
  ];

  const canContinueFromStep = (step: CheckoutStep) => {
    if (step === 0) {
      if (!formData.deliveryMethod) {
        showToast("Selecciona cómo enviamos tu orden.", "info");
        return false;
      }
    }

    if (step === 1) {
      if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
        showToast("Completa tus datos de contacto para continuar.", "info");
        return false;
      }
      if (someoneElseReceives && !formData.receiverName.trim()) {
        showToast("Escribe el nombre de quien recibe.", "info");
        return false;
      }
    }

    if (step === 2) {
      if (!selectedZone) {
        showToast("Selecciona tu estado para calcular el envío.", "info");
        return false;
      }
      if (!formData.shippingCity.trim()) {
        showToast("Escribe la ciudad para coordinar el envío.", "info");
        return false;
      }
      if (requiresFullAddress && (!formData.shippingStreet.trim() || !formData.shippingNeighborhood.trim() || !formData.shippingPostalCode.trim())) {
        showToast("Completa calle, colonia y código postal para enviar los artículos.", "info");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!canContinueFromStep(checkoutStep)) return;
    setCheckoutStep((current) => Math.min(current + 1, 3) as CheckoutStep);
  };

  const handlePreviousStep = () => {
    setCheckoutStep((current) => Math.max(current - 1, 0) as CheckoutStep);
  };

  const handleDeliveryMethodSelect = (method: DeliveryMethod) => {
    setFormData({ ...formData, deliveryMethod: method, deliveryType: "SHIPPING" });
    setCheckoutStep((current) => current === 0 ? 1 : current);
  };

  const handleCheckoutBack = () => {
    if (checkoutStep > 0) {
      handlePreviousStep();
      return;
    }

    const returnPath = typeof window !== "undefined"
      ? window.sessionStorage.getItem("nexus_checkout_return_path")
      : null;

    if (returnPath) {
      window.sessionStorage.removeItem("nexus_checkout_return_path");
      router.push(returnPath);
      return;
    }

    router.push("/store");
  };

  const handleCheckoutPrimaryAction = () => {
    if (checkoutStep < 3) {
      handleNextStep();
      return;
    }

    checkoutFormRef.current?.requestSubmit();
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (orderComplete) return <OrderComplete order={orderComplete} />;
  if (items.length === 0) return <EmptyCart />;

  return (
    <div
      className="mx-auto max-w-7xl px-[var(--sf-inset-page-mobile)] pt-[calc(var(--sf-inset-mobile-chrome-block)+var(--sf-h-mobile-nav)+var(--sf-space-mobile-chrome-after))] pb-[var(--sf-mobile-chrome-content-padding-bottom)] lg:py-[var(--sf-space-xl)]"
    >
      <CheckoutTopBar
        title={checkoutSteps[checkoutStep].label}
        summaryOpen={showMobileSummary}
        onBack={handleCheckoutBack}
        onToggleSummary={() => setShowMobileSummary((current) => !current)}
      />

      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        {paymentStatus === "failure" && (
          <div
            className="flex items-center border border-red-100 bg-red-50 text-red-700"
            style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
          >
            <AlertCircle size={24} />
            <p className="sf-text-label uppercase tracking-widest font-black text-xs">El pago no pudo ser procesado. Intenta de nuevo o elige otro método.</p>
          </div>
        )}

        <div className="hidden items-center lg:flex" style={{ gap: "var(--sf-space-md)" }}>
          <StorefrontIcon icon={ShoppingBag} context="section" variant="brand" />
          <div>
            <p className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">Checkout</p>
            <h1 className="sf-text-display text-stone-850 uppercase leading-none">Finalizar pedido</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start lg:grid-cols-12" style={{ gap: "var(--sf-space-lg)" }}>
          <form ref={checkoutFormRef} id="checkout-form" onSubmit={handleSubmit} className="lg:col-span-7">
            <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
              <div className="flex flex-col lg:hidden" style={{ gap: "var(--sf-space-sm)" }}>
                <div className="flex items-center justify-between" style={{ gap: "var(--sf-space-md)" }}>
                  <span className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">
                    Paso {checkoutStep + 1} de {checkoutSteps.length}
                  </span>
                  <span className="sf-text-secondary font-bold text-stone-500">{checkoutSteps[checkoutStep].label}</span>
                </div>
                <div className="h-2 overflow-hidden bg-stone-100" style={{ borderRadius: "var(--sf-radius-pill)" }}>
                  <div
                    className="h-full bg-brand-500 transition-all duration-300"
                    style={{
                      width: `${((checkoutStep + 1) / checkoutSteps.length) * 100}%`,
                      borderRadius: "var(--sf-radius-pill)",
                      transitionTimingFunction: "var(--sf-ease)",
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
                <div className={checkoutStep === 0 ? "block" : "hidden lg:block"}>
                  <CheckoutSection title="Método de entrega" icon={Truck}>
                    <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                      <p className="sf-text-secondary text-stone-500 font-medium">Elige cómo recibir tu pedido.</p>
                      <p className="sf-text-label uppercase tracking-[0.2em] font-black text-stone-400">
                        Selecciona un método de entrega para continuar
                      </p>
                    </div>
                    {isArticlesOnly ? (
                      <div className="grid grid-cols-1" style={{ gap: "var(--sf-space-md)" }}>
                        <ChoiceButton
                          icon={Truck}
                          label="Paquetería a domicilio"
                          detail={getShippingSettingLabel("shipping_base_cost_items", settings)}
                          active={formData.deliveryMethod === "PARCEL"}
                          onClick={() => handleDeliveryMethodSelect("PARCEL")}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                        <ChoiceButton
                          icon={Bus}
                          label="Central de autobuses"
                          detail={getShippingSettingLabel("shipping_cost_standard", settings)}
                          active={formData.deliveryMethod === "BUS_STATION"}
                          onClick={() => handleDeliveryMethodSelect("BUS_STATION")}
                        />
                        <ChoiceButton
                          icon={Plane}
                          label="Aeropuerto"
                          detail={getShippingSettingLabel("shipping_cost_extended", settings)}
                          active={formData.deliveryMethod === "AIRPORT"}
                          onClick={() => handleDeliveryMethodSelect("AIRPORT")}
                        />
                      </div>
                    )}
                    <InfoPanel>
                      {isArticlesOnly
                        ? "Los artículos se envían a tu dirección por paquetería."
                        : "El método de entrega final depende de tu ciudad y estado. Si tu zona requiere una alternativa distinta, lo ajustamos y coordinamos contigo."}
                    </InfoPanel>
                  </CheckoutSection>
                </div>

                <div className={checkoutStep === 1 ? "block" : "hidden lg:block"}>
                  <CheckoutSection title="Información del cliente" icon={User}>
                    <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                      <p className="sf-text-secondary text-stone-500 font-medium">Indícanos quién recibe el pedido.</p>
                      <p className="sf-text-label uppercase tracking-[0.2em] font-black text-stone-400">
                        Usaremos estos datos para coordinar tu compra
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                      <StorefrontField
                        required
                        label="Nombre completo"
                        placeholder="Ej. Juan Pérez"
                        value={formData.customerName}
                        onChange={(event) => setFormData({ ...formData, customerName: event.target.value })}
                      />
                      <StorefrontField
                        required
                        className="md:col-span-2"
                        label="Teléfono (WhatsApp)"
                        type="tel"
                        placeholder="10 dígitos"
                        value={formData.customerPhone}
                        onChange={(event) => setFormData({ ...formData, customerPhone: event.target.value })}
                      />
                      <label
                        className="group md:col-span-2 flex items-center justify-between border border-stone-200 bg-white transition-all duration-300 focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10"
                        style={{
                          minHeight: "var(--sf-h-input)",
                          borderRadius: "var(--sf-radius-inner)",
                          paddingInline: "var(--sf-space-md)",
                          gap: "var(--sf-space-md)",
                          transitionTimingFunction: "var(--sf-ease)",
                        }}
                      >
                        <span className="sf-text-secondary font-bold text-stone-700">Alguien más recibe</span>
                        <input
                          type="checkbox"
                          checked={someoneElseReceives}
                          onChange={(event) => setSomeoneElseReceives(event.target.checked)}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex shrink-0 items-center justify-center border text-white transition-all duration-300 ${
                            someoneElseReceives ? "border-brand-500 bg-brand-500" : "border-stone-200 bg-stone-50"
                          }`}
                          style={{
                            width: "var(--sf-size-check-control)",
                            height: "var(--sf-size-check-control)",
                            borderRadius: "var(--sf-radius-nested)",
                            transitionTimingFunction: "var(--sf-ease)",
                          }}
                          aria-hidden="true"
                        >
                          <Check
                            className={`transition-opacity duration-200 ${someoneElseReceives ? "opacity-100" : "opacity-0"}`}
                            style={{ width: "var(--sf-size-check-icon)", height: "var(--sf-size-check-icon)" }}
                            strokeWidth={2.75}
                          />
                        </span>
                      </label>
                      {someoneElseReceives && (
                        <StorefrontField
                          required
                          className="md:col-span-2"
                          label="Nombre completo de quien recibe"
                          placeholder="Nombre de la persona que recibe"
                          value={formData.receiverName}
                          onChange={(event) => setFormData({ ...formData, receiverName: event.target.value })}
                        />
                      )}
                    </div>
                  </CheckoutSection>
                </div>

                <div className={checkoutStep === 2 ? "block" : "hidden lg:block"}>
                  <CheckoutSection title={requiresFullAddress ? "Dirección y ubicación" : "Ubicación de entrega"} icon={MapPin}>
                    <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
                      {requiresFullAddress && (
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                          <StorefrontField
                            required
                            className="md:col-span-2"
                            label="Calle y número interior o exterior"
                            placeholder="Ej. Av. Hidalgo 123"
                            value={formData.shippingStreet}
                            onChange={(event) => setFormData({ ...formData, shippingStreet: event.target.value })}
                          />
                          <StorefrontField
                            required
                            label="Colonia"
                            placeholder="Ej. Centro"
                            value={formData.shippingNeighborhood}
                            onChange={(event) => setFormData({ ...formData, shippingNeighborhood: event.target.value })}
                          />
                          <StorefrontField
                            required
                            label="Código postal"
                            placeholder="Ej. 78000"
                            value={formData.shippingPostalCode}
                            onChange={(event) => setFormData({ ...formData, shippingPostalCode: event.target.value })}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                        <StorefrontField
                          required
                          label="Ciudad"
                          placeholder="Ej. San Luis Potosí"
                          value={formData.shippingCity}
                          onChange={(event) => setFormData({ ...formData, shippingCity: event.target.value })}
                        />
                        <ZoneSelect
                          selectedZone={selectedZone}
                          setSelectedZone={(zone) => {
                            setSelectedZone(zone);
                            setFormData({ ...formData, shippingState: zone.name });
                          }}
                          zones={zones}
                        />
                      </div>
                      <InfoPanel tone={shippingStatusTone}>{shippingStatusNote}</InfoPanel>
                    </div>
                  </CheckoutSection>
                </div>

                <div className={checkoutStep === 3 ? "block" : "hidden lg:block"}>
                  <CheckoutSection title="Método de pago" icon={CreditCard}>
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                      <PaymentButton
                        icon={Wallet}
                        title="Depósito / Transferencia"
                        subtitle="Pago manual verificado"
                        active={paymentMethod === "TRANSFER"}
                        onClick={() => setPaymentMethod("TRANSFER")}
                      />
                      {isMPEnabled && (
                        <PaymentButton
                          icon={CreditCard}
                          title="Tarjeta / Efectivo"
                          subtitle="Aprobación instantánea"
                          active={paymentMethod === "MERCADOPAGO"}
                          onClick={() => setPaymentMethod("MERCADOPAGO")}
                        />
                      )}
                    </div>
                    {paymentMethod === "TRANSFER" && (
                      <BankInfoCard
                        bankInfo={bankInfo}
                        bankInfoText={bankInfoText}
                        onCopy={(value) => {
                          navigator.clipboard.writeText(value);
                          showToast("Dato bancario copiado.", "success");
                        }}
                      />
                    )}
                  </CheckoutSection>
                </div>
              </div>

              <Button
                context="section"
                className={`w-full h-20 text-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/20 ${checkoutStep === 3 ? "hidden lg:inline-flex" : "hidden"}`}
                disabled={loading}
              >
                {loading ? <Spinner className="text-white" /> : "Confirmar y pagar"}
              </Button>
            </div>
          </form>

          <aside className="hidden lg:col-span-5 lg:block">
            <OrderSummary
              items={items}
              subtotal={getTotalPrice()}
              discountTotal={discountTotal}
              shippingTotal={shippingCalculation.total}
              shippingDetails={shippingCalculation.details}
              selectedZone={selectedZone}
              total={orderTotal}
              onRemoveItem={(item) => setItemToDelete(item)}
            />
          </aside>
        </div>
      </div>

      <StorefrontConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Eliminar producto"
        message={`Se eliminará "${itemToDelete?.name}" de tu pedido.`}
        icon={Trash2}
        variant="danger"
        confirmLabel="Eliminar"
        onConfirm={handleConfirmRemove}
      />

      <BottomSheet
        isOpen={showMobileSummary}
        onClose={() => setShowMobileSummary(false)}
        title="Resumen"
      >
        <OrderSummary
          variant="sheet"
          items={items}
          subtotal={getTotalPrice()}
          discountTotal={discountTotal}
          shippingTotal={shippingCalculation.total}
          shippingDetails={shippingCalculation.details}
          selectedZone={selectedZone}
          total={orderTotal}
          onRemoveItem={(item) => setItemToDelete(item)}
        />
      </BottomSheet>

      <StorefrontPurchaseBar
        total={orderTotal}
        loading={loading}
        disabled={checkoutStep === 0 && !formData.deliveryMethod}
        buttonLabel={checkoutStep === 0 ? "Selecciona método" : checkoutStep === 3 ? "Finalizar pedido" : "Continuar"}
        buttonIcon={checkoutStep === 3 ? ShoppingBag : ArrowRight}
        onAction={handleCheckoutPrimaryAction}
      />
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return null;
}

function CheckoutTopBar({
  title,
  summaryOpen,
  onBack,
  onToggleSummary,
}: {
  title: string;
  summaryOpen: boolean;
  onBack: () => void;
  onToggleSummary: () => void;
}) {
  return (
    <div
      className="fixed z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center md:hidden"
      style={{
        top: "var(--sf-inset-mobile-chrome-block)",
        left: "var(--sf-inset-mobile-chrome)",
        right: "var(--sf-inset-mobile-chrome)",
        gap: "var(--sf-space-md)",
      }}
    >
      <CheckoutTopRail>
        <button
          type="button"
          onClick={onBack}
          className="group flex shrink-0 items-center justify-center border border-transparent text-stone-500 transition-all duration-300 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{
            width: "var(--sf-size-mobile-nav-item)",
            height: "var(--sf-size-mobile-nav-item)",
            borderRadius: "var(--sf-radius-mobile-nav-item)",
            transitionTimingFunction: "var(--sf-ease)",
          }}
          aria-label="Volver"
        >
          <ArrowLeft
            style={{ width: "var(--sf-size-mobile-nav-icon)", height: "var(--sf-size-mobile-nav-icon)" }}
            strokeWidth={2.35}
          />
        </button>
      </CheckoutTopRail>

      <div
        className="pointer-events-none flex min-w-0 items-center justify-center overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: "var(--sf-h-mobile-nav)",
          borderRadius: "var(--sf-radius-outer)",
          paddingInline: "var(--sf-space-md)",
        }}
      >
        <p className="min-w-0 truncate text-center sf-text-secondary font-medium text-stone-600">
          {title}
        </p>
      </div>

      <CheckoutTopRail>
        <button
          type="button"
          onClick={onToggleSummary}
          className={`group relative flex shrink-0 items-center justify-center border transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
            summaryOpen
              ? "border-brand-100 bg-brand-50 text-brand-800 shadow-sm"
              : "border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-950"
          }`}
          style={{
            minWidth: "var(--sf-size-mobile-nav-item)",
            height: "var(--sf-size-mobile-nav-item)",
            borderRadius: "var(--sf-radius-mobile-nav-item)",
            paddingInline: "var(--sf-space-sm)",
            transitionTimingFunction: "var(--sf-ease)",
          }}
          aria-label="Ver resumen del pedido"
          aria-expanded={summaryOpen}
        >
          <ShoppingBag
            style={{ width: "var(--sf-size-mobile-nav-icon)", height: "var(--sf-size-mobile-nav-icon)" }}
            strokeWidth={2.25}
          />
        </button>
      </CheckoutTopRail>
    </div>
  );
}

function CheckoutTopRail({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: "var(--sf-h-mobile-nav)",
        borderRadius: "var(--sf-radius-outer)",
        padding: "var(--sf-space-sm)",
      }}
    >
      {children}
    </div>
  );
}

function CheckoutSection({ title, icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
        <StorefrontIcon icon={icon} context="section" variant="brand" />
        <h3 className="sf-text-h1 tracking-tight leading-none text-stone-850">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChoiceButton({
  icon: Icon,
  label,
  detail,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-28 flex-col items-center justify-center border-2 text-center transition-all duration-500 active:scale-95 ${
        active ? "border-brand-500 bg-brand-50/40 shadow-xl shadow-brand-500/10" : "border-stone-100 bg-stone-50/70 hover:border-stone-200"
      }`}
      style={{
        borderRadius: "var(--sf-radius-inner)",
        padding: "var(--sf-padding-inner)",
        gap: "var(--sf-space-sm)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      <Icon
        className={`transition-colors duration-500 ${active ? "text-brand-500" : "text-stone-300"}`}
        style={{ width: "var(--sf-size-inner-icon-section)", height: "var(--sf-size-inner-icon-section)" }}
      />
      <span className={`sf-text-button-card transition-colors duration-500 ${active ? "text-brand-700" : "text-stone-500"}`}>{label}</span>
      {detail && (
        <span className={`sf-text-label uppercase tracking-[0.2em] font-black transition-colors duration-500 ${active ? "text-brand-500" : "text-stone-400"}`}>
          {detail}
        </span>
      )}
    </button>
  );
}

function getShippingSettingLabel(key: string, settings: Record<string, Record<string, string | null>> | null) {
  if (!settings) return "Costo pendiente";
  for (const group in settings) {
    const value = settings[group][key];
    if (value !== undefined) {
      const amount = Number(value || 0);
      return amount > 0 ? `$${formatPrice(amount)}` : "Gratis";
    }
  }
  return "Costo pendiente";
}

function PaymentButton({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center border-2 text-left transition-all duration-500 active:scale-95 ${
        active ? "border-stone-800 bg-stone-900 text-white shadow-2xl shadow-stone-900/20" : "border-stone-100 bg-stone-50/70 text-stone-500 hover:border-stone-200"
      }`}
      style={{
        borderRadius: "var(--sf-radius-inner)",
        padding: "var(--sf-padding-inner)",
        gap: "var(--sf-space-md)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-500 ${active ? "bg-white/10 text-white" : "bg-stone-200/60 text-stone-400"}`}
        style={{ borderRadius: "var(--sf-radius-nested)" }}
      >
        <Icon size={24} />
      </div>
      <div className="flex flex-col">
        <p className={`sf-text-label uppercase tracking-widest font-black transition-colors duration-500 ${active ? "text-white" : "text-stone-800"}`}>{title}</p>
        <p className={`sf-text-secondary opacity-70 font-medium transition-colors duration-500 ${active ? "text-stone-300" : "text-stone-500"}`}>{subtitle}</p>
      </div>
    </button>
  );
}

function InfoPanel({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warning" }) {
  return (
    <div
      className={`flex items-start border ${
        tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-stone-200 bg-stone-50/80 text-stone-600"
      }`}
      style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
    >
      <span
        className={`flex shrink-0 items-center justify-center ${
          tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-white text-brand-500"
        }`}
        style={{
          width: "var(--sf-h-button-card)",
          height: "var(--sf-h-button-card)",
          borderRadius: "var(--sf-radius-nested)",
        }}
      >
        <Info style={{ width: "var(--sf-size-inner-icon-card)", height: "var(--sf-size-inner-icon-card)" }} />
      </span>
      <p className="sf-text-secondary font-semibold leading-relaxed">{children}</p>
    </div>
  );
}

function ZoneSelect({
  selectedZone,
  setSelectedZone,
  zones,
}: {
  selectedZone: ShippingZone | null;
  setSelectedZone: (zone: ShippingZone) => void;
  zones: ShippingZone[];
}) {
  return (
    <StorefrontSelect
      required
      icon={MapPin}
      label="Estado"
      value={selectedZone?.id ? String(selectedZone.id) : ""}
      onChange={(event) => {
        const zone = zones.find((item) => String(item.id) === event.target.value);
        if (zone) setSelectedZone(zone);
      }}
    >
      <option value="" disabled>
        Selecciona tu estado...
      </option>
      {zones.map((zone) => (
        <option key={zone.id} value={zone.id}>
          {zone.name} ({zone.zoneType === "EXTENDED" ? "Aeropuerto" : "Central de autobuses"})
        </option>
      ))}
    </StorefrontSelect>
  );
}

function BankInfoCard({ bankInfo, bankInfoText, onCopy }: { bankInfo: BankInfo; bankInfoText: string; onCopy: (value: string) => void }) {
  const rows = [
    { label: "Banco", value: bankInfo.bank },
    { label: "Beneficiario", value: bankInfo.beneficiary },
    { label: "No. Cuenta", value: bankInfo.account },
    { label: "CLABE", value: bankInfo.clabe },
    { label: "No. Tarjeta", value: bankInfo.card },
  ].filter((row) => row.value && String(row.value).trim());

  if (rows.length === 0) {
    return (
      <InfoPanel tone="warning">
        La información bancaria aún no está configurada. Te contactaremos por WhatsApp para completar el pago.
      </InfoPanel>
    );
  }

  return (
    <StorefrontSectionCard className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <div className="flex items-start justify-between" style={{ gap: "var(--sf-space-md)" }}>
        <div>
          <p className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">{bankInfo.label}</p>
          <h4 className="sf-text-h2 text-stone-850">Información bancaria</h4>
        </div>
        <button
          type="button"
          onClick={() => onCopy(bankInfoText)}
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-stone-200 bg-white text-stone-500 transition-all hover:text-brand-500 active:scale-95"
          style={{ borderRadius: "var(--sf-radius-nested)" }}
                aria-label="Copiar información bancaria"
        >
          <Copy size={18} />
        </button>
      </div>
      <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0" style={{ gap: "var(--sf-space-md)" }}>
            <span className="sf-text-label text-stone-400 uppercase tracking-widest font-black">{row.label}</span>
            <button
              type="button"
              onClick={() => onCopy(String(row.value))}
              className="max-w-[60%] truncate text-right sf-text-secondary font-black text-stone-800 transition-colors hover:text-brand-500"
            >
              {row.value}
            </button>
          </div>
        ))}
      </div>
    </StorefrontSectionCard>
  );
}

function formatBankInfo(bankInfo: BankInfo) {
  return [
    bankInfo.bank ? `Banco: ${bankInfo.bank}` : "",
    bankInfo.beneficiary ? `Beneficiario: ${bankInfo.beneficiary}` : "",
    bankInfo.account ? `No. Cuenta: ${bankInfo.account}` : "",
    bankInfo.clabe ? `CLABE: ${bankInfo.clabe}` : "",
    bankInfo.card ? `Tarjeta: ${bankInfo.card}` : "",
  ].filter(Boolean).join("\n");
}

function OrderSummary({
  variant = "sidebar",
  items,
  subtotal,
  discountTotal,
  shippingTotal,
  shippingDetails,
  selectedZone,
  total,
  onRemoveItem,
}: {
  variant?: "sidebar" | "sheet";
  items: ReturnType<typeof useCartStore.getState>["items"];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingDetails: ShippingDetail[];
  selectedZone: ShippingZone | null;
  total: number;
  onRemoveItem: (item: any) => void;
}) {
  return (
    <div
      className={`overflow-hidden bg-stone-900 text-white ${
        variant === "sidebar" ? "sticky top-32 shadow-2xl shadow-stone-900/40" : "shadow-none"
      }`}
      style={{
        borderRadius: variant === "sidebar" ? "var(--sf-radius-outer)" : "var(--sf-radius-inner)",
        padding: variant === "sidebar" ? "var(--sf-padding-outer)" : "var(--sf-padding-inner)",
      }}
    >
      <div className="relative z-10 flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
          <StorefrontIcon icon={ShoppingBag} context="section" variant="brand" className="bg-white/10 border-white/10 text-brand-400 shadow-none" />
          <div>
            <p className="sf-text-label text-brand-400 uppercase tracking-[0.2em] font-black text-[10px]">Tu selección</p>
            <h3 className="sf-text-h1 uppercase tracking-tight leading-none">Resumen</h3>
          </div>
        </div>

        <div
          className={`${variant === "sidebar" ? "max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar-dark" : ""} flex flex-col`}
          style={{ gap: "var(--sf-space-sm)" }}
        >
          {items.map((item) => (
            <div key={item.productId} className="group flex items-center justify-between border-b border-white/5 py-4 last:border-0" style={{ gap: "var(--sf-space-md)" }}>
              <div className="flex min-w-0" style={{ gap: "var(--sf-space-md)" }}>
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-white/5 shadow-inner" style={{ borderRadius: "var(--sf-radius-inner)" }}>
                  {item.thumbnail ? (
                    <img src={getAssetUrl(item.thumbnail)} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <ShoppingBag size={24} />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="truncate text-sm font-black text-stone-100 group-hover:text-brand-400 transition-colors">{item.name}</p>
                  <p className="sf-text-label text-stone-500 uppercase tracking-widest mt-1 text-[9px]">{item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="sf-text-h2 tabular-nums text-brand-400 font-black text-lg">${formatPrice(item.price * item.quantity)}</span>
                <button
                  onClick={() => onRemoveItem(item)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:bg-rose-500/20 hover:text-rose-500 transition-all active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <CouponRedemption tone="dark" />

        <div className="flex flex-col border-t border-white/10 pt-[var(--sf-space-lg)]" style={{ gap: "var(--sf-space-md)" }}>
          <SummaryRow label="Subtotal" value={`$${formatPrice(subtotal)}`} />
          {discountTotal > 0 && (
            <SummaryRow label="Descuento" value={`-$${formatPrice(discountTotal)}`} />
          )}
          <AnimatePresence mode="popLayout">
            {shippingDetails.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col"
                style={{ gap: "var(--sf-space-sm)" }}
              >
                {shippingDetails.map((detail, index) => (
                  <SummaryRow key={index} label={detail.label} value={detail.amount > 0 ? `$${formatPrice(detail.amount)}` : "Gratis"} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <SummaryRow label="Envío total" value={shippingDetails.length > 0 ? `$${formatPrice(shippingTotal)}` : "Pendiente de estado"} />

          <div className="flex flex-col pt-[var(--sf-space-md)] mt-2">
            <div className="flex items-baseline justify-between border-t border-white/5 pt-4">
              <span className="sf-text-h1 text-stone-400 uppercase tracking-tighter">Total final</span>
              <span className="sf-text-display tabular-nums text-brand-400 font-black tracking-tighter leading-none">
                ${formatPrice(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-white/5 bg-white/5 shadow-inner" style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)" }}>
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <Info size={16} className="mt-1 shrink-0 text-brand-400" />
            <p className="sf-text-label leading-relaxed text-stone-400 uppercase tracking-widest text-[9px]">
              {shippingDetails.length > 0
                ? selectedZone
                  ? `Enviaremos y coordinaremos contigo los detalles para ${selectedZone.name}.`
                  : "Enviaremos los artículos a la dirección indicada."
                : "Al confirmar, aceptas nuestras políticas de venta y tiempos de entrega."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between sf-text-label text-stone-500 uppercase tracking-widest font-black text-[9px]">
      <span>{label}</span>
      <span className="tabular-nums text-stone-300">{value}</span>
    </div>
  );
}

function OrderComplete({ order }: { order: StoreOrderResponse }) {
  return (
    <div className="mx-auto max-w-2xl px-[var(--sf-inset-page-mobile)] text-center" style={{ paddingBlock: "var(--sf-space-xl)" }}>
      <div className="flex flex-col items-center" style={{ gap: "var(--sf-space-lg)" }}>
        <StorefrontIcon icon={CheckCircle} context="section" variant="success" />
        <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
          <h1 className="sf-text-display text-stone-850 uppercase">Pedido recibido</h1>
          <p className="sf-text-body text-stone-500 font-medium text-lg">
            Gracias por tu compra, {order.customerName || "Cliente"}. Tu número de pedido es <strong className="text-stone-850">#{order.id}</strong>.
          </p>
        </div>
        <StorefrontCard className="w-full text-left bg-stone-50/50 border-dashed border-stone-200">
          <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
            <div className="flex justify-between border-b border-stone-100 pb-[var(--sf-space-md)] sf-text-label text-stone-400 uppercase tracking-widest font-black text-[10px]">
              <span>Resumen</span>
              <span>Monto total</span>
            </div>
            <div className="flex items-end justify-between" style={{ gap: "var(--sf-space-md)" }}>
              <div>
                <p className="sf-text-display text-stone-850 tracking-tighter leading-none text-5xl font-black">${formatPrice(Number(order.total || 0))}</p>
                <p className="sf-text-secondary text-stone-400 uppercase tracking-widest font-bold mt-2 text-xs">Método: envío coordinado</p>
              </div>
              <Button variant="outline" context="card" onClick={() => window.print()}>Imprimir ticket</Button>
            </div>
          </div>
        </StorefrontCard>
        <div className="bg-emerald-50 p-6 rounded-[var(--sf-radius-inner)] border border-emerald-100 w-full shadow-sm">
          <p className="sf-text-label text-emerald-800 leading-relaxed font-black text-[10px]">
            Recibirás un mensaje de WhatsApp con los detalles de tu compra e instrucciones de pago.
          </p>
        </div>
        <Button asChild context="section" className="h-16 px-12 shadow-xl shadow-brand-500/20">
          <Link href="/store">Seguir comprando <ArrowRight className="ml-2" /></Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-2xl px-[var(--sf-inset-page-mobile)] text-center" style={{ paddingBlock: "var(--sf-space-xl)" }}>
      <div className="flex flex-col items-center" style={{ gap: "var(--sf-space-md)" }}>
        <StorefrontIcon icon={ShoppingBag} context="section" variant="muted" />
        <h2 className="sf-text-display text-stone-850 uppercase leading-none">Tu carrito está vacío</h2>
        <p className="sf-text-body text-stone-500 font-medium mb-4">Parece que aún no has añadido ejemplares o productos a tu selección.</p>
        <Button asChild context="section" className="h-16 px-12 shadow-lg">
          <Link href="/store">Explorar catálogo</Link>
        </Button>
      </div>
    </div>
  );
}

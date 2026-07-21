"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Gift,
  MapPin,
  MessageCircle,
  Plane,
  ShoppingBag,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { orderApi, StoreOrderResponse } from "../../api/orders";
import {
  MercadoPagoCardFormData,
  MercadoPagoCheckoutConfig,
  paymentApi,
  PublicPaymentOptions,
} from "../../api/payments";
import { productApi } from "../../api/products";
import { settingsApi } from "../../api/settings";
import { useSettings } from "../../hooks/useSettings";
import { useCartStore } from "../../store/cart.store";
import { useToastStore } from "../../store/toast.store";
import { Button } from "../../components/ui/Button";
import { StorefrontAutonomousCard, StorefrontCard, StorefrontSectionCard } from "../../components/ui/Card";
import { StorefrontField, StorefrontSelect } from "../../components/ui/Field";
import { StorefrontIcon } from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Spinner";
import { StorefrontConfirmModal } from "../../components/ui/ConfirmModal";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { StorefrontPurchaseBar } from "../../components/ui/PurchaseBar";
import { StorefrontCheckoutTopBar } from "../../components/ui/CheckoutTopBar";
import { StorefrontCheckoutSection } from "../../components/ui/CheckoutSection";
import { StorefrontNote } from "../../components/ui/Note";
import { CouponRedemption } from "../../components/cart/CouponRedemption";
import { formatPrice, getAssetUrl } from "../../utils/formatters";
import { useCheckoutTransitionReady } from "../../hooks/useCheckoutTransitionReady";
import { PaymentMethodCard } from "../../components/checkout/PaymentMethodCard";
import { BankInfoCard } from "../../components/checkout/BankInfoCard";
import { MercadoPagoCardPayment } from "../../components/checkout/MercadoPagoCardPayment";
import {
  StorefrontCheckoutMotion,
  useStorefrontCheckoutMotionReady,
} from "../../components/ui/CheckoutMotion";
import {
  STOREFRONT_CHECKOUT_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from "../../lib/motion";
import { useFeedbackSound } from "../../hooks/useFeedbackSound";

type DeliveryType = "SHIPPING" | "PICKUP";
type DeliveryMethod = "BUS_STATION" | "AIRPORT" | "PARCEL";
type PaymentMethod = "TRANSFER" | "MERCADOPAGO";
type PaymentStatus = "success" | "pending" | "failure" | null;
type CheckoutStep = 0 | 1 | 2 | 3;
type CompletionState = "reserved" | "approved" | "pending" | null;

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

interface PendingPaymentAttempt {
  paymentHoldId: string;
  customerName: string;
  customerPhone: string;
  total: number;
  expiresAt: string;
}

interface CheckoutSummarySnapshot {
  items: ReturnType<typeof useCartStore.getState>["items"];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingDetails: ShippingDetail[];
  selectedZone: ShippingZone | null;
  total: number;
}

const PENDING_MP_PAYMENT_KEY = "nexus_pending_mp_payment";

function readPendingPaymentAttempt() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_MP_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPaymentAttempt;
    if (!parsed?.paymentHoldId || !parsed?.customerPhone || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePendingPaymentAttempt(attempt: PendingPaymentAttempt) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_MP_PAYMENT_KEY, JSON.stringify(attempt));
}

function clearPendingPaymentAttempt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_MP_PAYMENT_KEY);
}

function isPendingPaymentAttemptExpired(attempt: PendingPaymentAttempt) {
  return new Date(attempt.expiresAt).getTime() <= Date.now();
}

export default function CheckoutPage() {
  const { items, coupon, getTotalPrice, getDiscountTotal, clearCart, removeItem } = useCartStore();
  const { settings, loading: settingsLoading } = useSettings();
  const { showToast } = useToastStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<StoreOrderResponse | null>(null);
  const [completionState, setCompletionState] = useState<CompletionState>(null);
  const [completionSnapshot, setCompletionSnapshot] = useState<CheckoutSummarySnapshot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TRANSFER");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null);
  const [mounted, setMounted] = useState(false);
  useCheckoutTransitionReady("/checkout", mounted);
  const checkoutMotionReady = useStorefrontCheckoutMotionReady("/checkout");
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PublicPaymentOptions | null>(null);
  const [mpCheckoutConfig, setMpCheckoutConfig] = useState<MercadoPagoCheckoutConfig | null>(null);
  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [someoneElseReceives, setSomeoneElseReceives] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [checkoutIssue, setCheckoutIssue] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
  } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(0);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [pendingPaymentAttempt, setPendingPaymentAttempt] = useState<PendingPaymentAttempt | null>(null);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const confirmationFeedbackPlayedRef = useRef(false);
  const errorFeedbackPlayedRef = useRef(false);
  const {
    play: playConfirmationSound,
    prepare: prepareConfirmationSound,
  } = useFeedbackSound("confirmation");
  const {
    play: playErrorSound,
    prepare: prepareErrorSound,
  } = useFeedbackSound("error");

  const playConfirmationFeedback = useCallback(() => {
    if (confirmationFeedbackPlayedRef.current) return;
    confirmationFeedbackPlayedRef.current = true;
    playConfirmationSound();
  }, [playConfirmationSound]);

  const playErrorFeedback = useCallback(() => {
    if (errorFeedbackPlayedRef.current) return;
    errorFeedbackPlayedRef.current = true;
    playErrorSound();
  }, [playErrorSound]);

  const prepareCheckoutFeedback = useCallback(async () => {
    errorFeedbackPlayedRef.current = false;
    await Promise.all([prepareConfirmationSound(), prepareErrorSound()]);
  }, [prepareConfirmationSound, prepareErrorSound]);

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

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const orderId = params.get("external_reference")?.replace("order_", "");

    if (status === "approved" || status === "success") {
      clearPendingPaymentAttempt();
      setPendingPaymentAttempt(null);
      setPaymentStatus("success");
      setCompletionState("approved");
      if (orderId) setOrderComplete({ id: orderId, status: "PAID" });
    } else if (status === "pending" || status === "in_process") {
      clearPendingPaymentAttempt();
      setPendingPaymentAttempt(null);
      setPaymentStatus("pending");
      setCompletionState("pending");
      if (orderId) setOrderComplete({ id: orderId, status: "PENDING" });
    } else if (status === "rejected" || status === "failure") {
      clearPendingPaymentAttempt();
      setPendingPaymentAttempt(null);
      setPaymentStatus("failure");
    } else {
      const storedAttempt = readPendingPaymentAttempt();
      if (storedAttempt && !isPendingPaymentAttemptExpired(storedAttempt)) {
        setPendingPaymentAttempt(storedAttempt);
        setPaymentMethod("MERCADOPAGO");
        setCheckoutStep(3);
      } else if (storedAttempt) {
        clearPendingPaymentAttempt();
      }
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
  const paymentPurpose = useMemo<PublicPaymentOptions['requestedPurpose']>(() => {
    const birdPurposes = cartProducts
      .filter((product) => product.type === 'BIRD' && product.purpose)
      .map((product) => String(product.purpose).toUpperCase());
    const uniqueBirdPurposes = Array.from(new Set(birdPurposes));

    return hasBirds && !hasItems && uniqueBirdPurposes.length === 1
      ? uniqueBirdPurposes[0] as 'COMBAT' | 'BREEDING'
      : 'MAIN';
  }, [cartProducts, hasBirds, hasItems]);

  useEffect(() => {
    let active = true;
    paymentApi.getOptions(paymentPurpose)
      .then((options) => {
        if (active) setPaymentOptions(options);
      })
      .catch((error) => console.error('Error loading payment options:', error));

    return () => {
      active = false;
    };
  }, [paymentPurpose]);

  useEffect(() => {
    paymentApi.getCheckoutConfig()
      .then(setMpCheckoutConfig)
      .catch((error) => {
        console.error("Error loading Mercado Pago checkout config:", error);
        setMpCheckoutConfig({ mode: "redirect", publicKey: null });
      });
  }, []);

  useEffect(() => {
    if (mpCheckoutConfig?.mode !== "embedded" || !pendingPaymentAttempt) return;
    let active = true;
    const checkStatus = () => paymentApi.getCardPaymentStatus({
      storePaymentHoldId: pendingPaymentAttempt.paymentHoldId,
      customerPhone: pendingPaymentAttempt.customerPhone,
    }).then((result) => {
      if (!active) return;
      if (result.status === "approved") {
        clearPendingPaymentAttempt();
        setPendingPaymentAttempt(null);
        setPaymentStatus("success");
        setOrderComplete({ id: result.referenceId, status: "PAID" });
        setCompletionState("approved");
        playConfirmationFeedback();
      } else if (result.status === "rejected") {
        setPaymentStatus("failure");
        setOrderComplete(null);
        playErrorFeedback();
        showToast(result.message || "El banco no aprobó el pago. Puedes intentarlo nuevamente.", "info");
      } else if (result.status === "unavailable") {
        clearPendingPaymentAttempt();
        setPendingPaymentAttempt(null);
        setOrderComplete(null);
        showToast("El intento de pago ya no está disponible.", "info");
      }
    }).catch(() => {
      // A transient status lookup must not discard an active payment attempt.
    });
    void checkStatus();
    const interval = paymentStatus === "pending" ? window.setInterval(checkStatus, 2_000) : null;
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [mpCheckoutConfig?.mode, paymentStatus, pendingPaymentAttempt, playConfirmationFeedback, playErrorFeedback, showToast]);

  const findSetting = (key: string) => {
    if (!settings) return null;
    for (const group in settings) {
      if (settings[group][key] !== undefined) return settings[group][key];
    }
    return null;
  };

  const settingsReady = !settingsLoading && Boolean(settings);
  const freeBirdShipping = settingsReady && hasBirds && findSetting("shipping_free_threshold_birds") === "1";
  const freeItemShipping = settingsReady && hasItems && findSetting("shipping_free_threshold_items") === "1";
  const isShippingFullyCovered =
    (hasBirds || hasItems) &&
    (!hasBirds || freeBirdShipping) &&
    (!hasItems || freeItemShipping);
  const hasCoveredShippingPortion = freeBirdShipping || freeItemShipping;
  const needsBirdDeliveryChoice = settingsReady && hasBirds && !freeBirdShipping;
  const needsParcelDeliveryChoice = settingsReady && hasItems && !freeItemShipping;
  const shouldUseParcelDeliveryChoice = !isShippingFullyCovered && needsParcelDeliveryChoice && !needsBirdDeliveryChoice;
  const needsDeliveryChoice = settingsReady && !isShippingFullyCovered;

  const shippingCalculation = useMemo(() => {
    const freeBirds = findSetting("shipping_free_threshold_birds") === "1";
    const freeItems = findSetting("shipping_free_threshold_items") === "1";
    const costStandard = Number(findSetting("shipping_cost_standard") || 0);
    const costExtended = Number(findSetting("shipping_cost_extended") || 0);
    const costBaseItems = Number(findSetting("shipping_base_cost_items") || 0);

    let total = 0;
    const details: ShippingDetail[] = [];

    if (hasBirds) {
      if (freeBirds) {
        details.push({ label: "Envío de aves", amount: 0, note: "Promoción de envío gratis" });
      } else if (selectedZone) {
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
        details.push({ label: "Artículos", amount: 0, note: "Promoción de envío gratis" });
      } else {
        total += costBaseItems;
        details.push({ label: "Artículos a domicilio", amount: costBaseItems });
      }
    }

    return { total, details };
  }, [hasBirds, hasItems, selectedZone, settings]);

  const isMPEnabled = Boolean(paymentOptions?.mercadoPago.available);
  const isEmbeddedMP = isMPEnabled && mpCheckoutConfig?.mode === "embedded" && Boolean(mpCheckoutConfig.publicKey);
  const discountTotal = getDiscountTotal();
  const orderTotal = Math.max(0, getTotalPrice() + shippingCalculation.total - discountTotal);
  const buildSummarySnapshot = useCallback((): CheckoutSummarySnapshot => ({
    items: [...items],
    subtotal: getTotalPrice(),
    discountTotal,
    shippingTotal: shippingCalculation.total,
    shippingDetails: [...shippingCalculation.details],
    selectedZone,
    total: orderTotal,
  }), [discountTotal, getTotalPrice, items, orderTotal, selectedZone, shippingCalculation.details, shippingCalculation.total]);

  const finishCheckout = useCallback((state: Exclude<CompletionState, null>, order: StoreOrderResponse) => {
    setCompletionSnapshot(buildSummarySnapshot());
    setOrderComplete({
      ...order,
      customerName: order.customerName || formData.customerName.trim(),
      total: order.total ?? orderTotal,
    });
    setCompletionState(state);
    if (state !== "pending") playConfirmationFeedback();
    clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [buildSummarySnapshot, clearCart, formData.customerName, orderTotal, playConfirmationFeedback]);

  useEffect(() => {
    if (!completionState || completionSnapshot || items.length === 0) return;
    setCompletionSnapshot(buildSummarySnapshot());
    clearCart();
    if (completionState !== "pending") playConfirmationFeedback();
  }, [buildSummarySnapshot, clearCart, completionSnapshot, completionState, items.length, playConfirmationFeedback]);
  const selectedZoneMethod = selectedZone?.zoneType === "EXTENDED" ? "AIRPORT" : "BUS_STATION";
  const deliveryMethodMismatch = Boolean(!isShippingFullyCovered && hasBirds && selectedZone && formData.deliveryMethod && formData.deliveryMethod !== selectedZoneMethod);
  const shippingStatusNote = useMemo(() => {
    if (isShippingFullyCovered) {
      return selectedZone
        ? `El envío es gratis. Coordinaremos contigo la mejor forma de entrega para ${selectedZone.name}, según tu ubicación y los productos de tu pedido.`
        : "El envío es gratis. Coordinaremos contigo la mejor forma de entrega según tu ubicación y los productos de tu pedido.";
    }

    if (isArticlesOnly) {
      return "Tus artículos se envían por paquetería a domicilio. Usaremos tu dirección para coordinar la entrega.";
    }

    if (!selectedZone) {
      if (hasItems && freeBirdShipping && hasBirds) {
        return "Tus artículos se envían a domicilio. El envío del ave está cubierto y se coordina contigo según tu ciudad y estado.";
      }

      return hasItems
        ? "Tus artículos se envían a domicilio. La entrega del ave se define con tu ciudad y estado."
        : "La entrega del ave se define con tu ciudad y estado.";
    }

    if (freeBirdShipping && hasBirds && hasItems) {
      return `El envío del ave está cubierto y lo coordinaremos contigo para ${selectedZone.name}. Los artículos se envían a tu dirección por paquetería.`;
    }

    const birdDelivery = selectedZone.zoneType === "EXTENDED" ? "aeropuerto" : "central de autobuses";
    if (hasItems) {
      return `Para ${selectedZone.name}, el ave se coordina por ${birdDelivery}. Los artículos se envían a tu dirección.`;
    }

    return `Para ${selectedZone.name}, la entrega se coordina por ${birdDelivery}. Te contactaremos para afinar los detalles.`;
  }, [freeBirdShipping, hasBirds, hasItems, isArticlesOnly, isShippingFullyCovered, selectedZone]);
  const shippingStatusTone = deliveryMethodMismatch ? "warning" : "default";

  const refreshCartAvailability = async () => {
    const results = await Promise.allSettled(
      items.map(async (cartItem) => ({
        cartItem,
        product: await productApi.getById(cartItem.productId),
      })),
    );

    const availableProducts: any[] = [];
    const unavailableIds: number[] = [];

    results.forEach((result) => {
      if (result.status === "rejected") {
        return;
      }

      const { cartItem, product } = result.value;
      const isUnavailable =
        product.saleStatus !== "AVAILABLE" ||
        !product.active ||
        product.published === false ||
        (product.type === "ITEM" && Number(product.stock) < cartItem.quantity);

      if (isUnavailable) {
        unavailableIds.push(cartItem.productId);
        return;
      }

      availableProducts.push(product);
    });

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        unavailableIds.push(items[index].productId);
      }
    });

    Array.from(new Set(unavailableIds)).forEach((productId) => removeItem(productId));
    setCartProducts(availableProducts);

    return unavailableIds.length;
  };

  const bankInfo = paymentOptions?.bank ?? null;

  const getCheckoutPayload = () => {
    const shippingAddress = requiresFullAddress
      ? [
          formData.shippingStreet,
          formData.shippingNeighborhood ? `Col. ${formData.shippingNeighborhood}` : "",
          formData.shippingPostalCode ? `CP ${formData.shippingPostalCode}` : "",
          formData.shippingCity,
          selectedZone?.name,
        ].filter(Boolean).join(", ")
      : [formData.shippingCity, selectedZone?.name].filter(Boolean).join(", ");

    return {
      ...formData,
      receiverName: someoneElseReceives ? formData.receiverName : "",
      shippingState: selectedZone?.name || "",
      shippingAddress,
      shippingCost: shippingCalculation.total,
      deliveryMethod: isShippingFullyCovered ? undefined : formData.deliveryMethod,
      couponCode: coupon?.code || "",
      deliveryType: "SHIPPING",
      paymentMethod,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    };
  };
  const createCheckoutOrder = () => {
    const attempt = pendingPaymentAttempt || readPendingPaymentAttempt();
    if (attempt && !isPendingPaymentAttemptExpired(attempt)) {
      return orderApi.convertPaymentHoldToTransfer(attempt.paymentHoldId, attempt.customerPhone);
    }
    return orderApi.create(getCheckoutPayload());
  };
  const createStorePaymentHold = () => orderApi.createPaymentHold({ ...getCheckoutPayload(), paymentMethod: "MERCADOPAGO" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!settingsReady) {
      showToast("Estamos cargando las opciones de envío.", "info");
      return;
    }
    if (needsDeliveryChoice && !formData.deliveryMethod) {
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

    await prepareCheckoutFeedback();
    setLoading(true);
    try {
      if (paymentMethod === "MERCADOPAGO") {
        showToast("Completa los datos de tu tarjeta en el formulario de Mercado Pago.", "info");
        return;
      }
      const createdOrder = await createCheckoutOrder();
      clearPendingPaymentAttempt();
      setPendingPaymentAttempt(null);
      finishCheckout(createdOrder.status === "PAID" ? "approved" : "reserved", createdOrder);
    } catch (error: unknown) {
      playErrorFeedback();
      console.error("Order failed details:", error);
      const errorMessage = getErrorMessage(error);
      const errorCode = (error as any)?.response?.data?.code;

      if (isAvailabilityError(errorMessage)) {
        await refreshCartAvailability();
        setCheckoutIssue({
          title: "Producto no disponible",
          message: paymentMethod === "MERCADOPAGO"
            ? "Uno de los productos de tu carrito acaba de ser reservado por otro cliente. No se realizó ningún cobro. Actualiza tu carrito para continuar."
            : "Uno de los productos de tu carrito acaba de ser reservado por otro cliente. Actualiza tu carrito para continuar.",
          confirmLabel: "Actualizar carrito",
          cancelLabel: "Volver a tienda",
        });
      } else if (errorCode === "PAYMENT_REQUIRES_RESOLUTION") {
        setCheckoutIssue({
          title: "Pago en verificación",
          message: errorMessage || "Mercado Pago todavía está verificando el intento.",
          confirmLabel: "Entendido",
          cancelLabel: "Volver a tienda",
        });
      } else {
        setCheckoutIssue({
          title: "No se pudo procesar el pedido",
          message: "Ocurrió un problema al crear tu orden. Revisa tu información e intenta nuevamente.",
          confirmLabel: "Entendido",
          cancelLabel: "Volver a tienda",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinuePendingPayment = async () => {
    if (!pendingPaymentAttempt) return;

    if (isPendingPaymentAttemptExpired(pendingPaymentAttempt)) {
      clearPendingPaymentAttempt();
      setPendingPaymentAttempt(null);
      showToast("El intento de pago expiró. Puedes iniciar el checkout nuevamente.", "info");
      return;
    }

    setPaymentMethod("MERCADOPAGO");
    setCheckoutStep(3);
  };

  const handleCancelPendingPayment = async () => {
    if (!pendingPaymentAttempt) return;

    clearPendingPaymentAttempt();
    setPendingPaymentAttempt(null);
    showToast("El intento se cerró. La retención se liberará automáticamente.", "info");
    router.push("/store");
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
      if (!settingsReady) {
        showToast("Estamos cargando las opciones de envío.", "info");
        return false;
      }
      if (needsDeliveryChoice && !formData.deliveryMethod) {
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

  const handleCheckoutExit = () => {
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

  const handleCheckoutBack = () => {
    if (completionState) {
      router.push("/store");
      return;
    }
    if (checkoutStep > 0) {
      handlePreviousStep();
      return;
    }

    handleCheckoutExit();
  };

  const handleCheckoutPrimaryAction = () => {
    if (checkoutStep < 3) {
      handleNextStep();
      return;
    }

    checkoutFormRef.current?.requestSubmit();
  };

  const handleEmbeddedCardPayment = async (cardFormData: MercadoPagoCardFormData) => {
    if (!canContinueFromStep(0) || !canContinueFromStep(1) || !canContinueFromStep(2)) {
      throw new Error("Completa la información del pedido antes de pagar.");
    }

    await prepareCheckoutFeedback();
    setLoading(true);
    try {
      let attempt = pendingPaymentAttempt;
      if (!attempt || isPendingPaymentAttemptExpired(attempt)) {
        const createdHold = await createStorePaymentHold();
        attempt = {
          paymentHoldId: createdHold.paymentHoldId,
          customerName: formData.customerName.trim(),
          customerPhone: formData.customerPhone.trim(),
          total: orderTotal,
          expiresAt: createdHold.expiresAt,
        };
        savePendingPaymentAttempt(attempt);
        setPendingPaymentAttempt(attempt);
      }

      return await paymentApi.processOrderCardPayment(attempt.paymentHoldId, formData.customerPhone, cardFormData);
    } catch (error: any) {
      const message = getErrorMessage(error);
      if (isAvailabilityError(message)) {
        await refreshCartAvailability();
        setCheckoutIssue({
          title: "Producto no disponible",
          message: "Uno de los productos acaba de ser reservado por otro cliente. No se realizó ningún cobro.",
          confirmLabel: "Actualizar carrito",
          cancelLabel: "Volver a tienda",
        });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleEmbeddedPaymentApproved = (result: { referenceId: number | string }) => {
    clearPendingPaymentAttempt();
    setPendingPaymentAttempt(null);
    setPaymentStatus("success");
    finishCheckout("approved", { id: result.referenceId, status: "PAID" });
  };

  const handleEmbeddedPaymentPending = (result: { referenceId: number | string }) => {
    setPaymentStatus("pending");
    finishCheckout("pending", { id: result.referenceId, status: "PENDING" });
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (pendingPaymentAttempt && mpCheckoutConfig?.mode !== "embedded") {
    return (
      <PendingPaymentAttemptView
        attempt={pendingPaymentAttempt}
        loading={loading}
        onContinue={handleContinuePendingPayment}
        onCancel={handleCancelPendingPayment}
        onBack={() => router.push("/store")}
      />
    );
  }
  if (!completionState && items.length === 0 && checkoutIssue) {
    return (
      <>
        <EmptyCart />
        <StorefrontConfirmModal
          isOpen={!!checkoutIssue}
          onClose={() => setCheckoutIssue(null)}
          title={checkoutIssue.title}
          message={checkoutIssue.message}
          icon={AlertCircle}
          variant="danger"
          confirmLabel={checkoutIssue.confirmLabel}
          cancelLabel={checkoutIssue.cancelLabel}
          onConfirm={() => setCheckoutIssue(null)}
          onCancel={() => {
            setCheckoutIssue(null);
            router.push("/store");
          }}
        />
      </>
    );
  }
  if (!completionState && items.length === 0) return <EmptyCart />;

  const completionPresentation = completionState
    ? getStoreCheckoutCompletionPresentation(completionState)
    : null;
  const summarySnapshot = completionSnapshot ?? buildSummarySnapshot();

  return (
    <div
      className="mx-auto max-w-[var(--sf-max-width-content)] px-[var(--sf-inset-page)] pt-[calc(var(--sf-inset-mobile-chrome-block)+var(--sf-h-mobile-nav)+var(--sf-space-mobile-chrome-after))] pb-[var(--sf-mobile-chrome-content-padding-bottom)] lg:py-[var(--sf-space-xl)]"
    >
      <StorefrontCheckoutTopBar
        title={completionPresentation?.title ?? checkoutSteps[checkoutStep].label}
        summaryOpen={showMobileSummary}
        onBack={handleCheckoutBack}
        onToggleSummary={() => setShowMobileSummary((current) => !current)}
        entranceReady={checkoutMotionReady}
      />

      <StorefrontCheckoutMotion phase="chrome" ready={checkoutMotionReady}>
        <button
          type="button"
          onClick={completionState ? () => router.push("/store") : handleCheckoutExit}
          className="mb-[var(--sf-space-lg)] hidden items-center sf-text-secondary text-stone-500 transition-colors hover:text-stone-950 lg:flex"
          style={{ gap: "var(--sf-space-sm)" }}
        >
          <ArrowLeft style={{ width: "var(--sf-size-inner-icon-card)", height: "var(--sf-size-inner-icon-card)" }} />
          {completionState ? "Volver a la tienda" : "Volver"}
        </button>
      </StorefrontCheckoutMotion>

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

        <div
          className="grid grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]"
          style={{ gap: "var(--sf-space-xl)" }}
        >
          <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-lg)" }}>
            <AnimatePresence mode="wait" initial={false}>
            {completionState && orderComplete ? (
              <StoreCheckoutCompletion
                key={`store-checkout-completion-${completionState}`}
                state={completionState}
                order={orderComplete}
                customerName={formData.customerName}
                itemCount={summarySnapshot.items.reduce((count, item) => count + item.quantity, 0)}
                paymentExpiresAt={orderComplete.paymentExpiresAt ?? orderComplete.expiresAt ?? null}
                onBackToStore={() => router.push("/store")}
                onGoHome={() => router.push("/")}
              />
            ) : (
            <motion.div
              key="store-checkout-form"
              className="flex min-w-0 flex-col"
              style={{ gap: "var(--sf-space-lg)" }}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
                ease: STOREFRONT_EASING.reveal,
              }}
            >
            <StorefrontCheckoutMotion phase="intro" ready={checkoutMotionReady}>
              <section className="hidden flex-col lg:flex" style={{ gap: "var(--sf-space-xs)" }}>
                <h1 className="sf-text-display text-stone-950">Completa tu pedido</h1>
                <p className="sf-text-body text-stone-500">
                  Confirma la entrega, tus datos y el método de pago para finalizar tu compra.
                </p>
              </section>

              <div key={`checkout-progress-${checkoutStep}`} className="sf-checkout-step-progress flex flex-col lg:hidden" style={{ gap: "var(--sf-space-sm)" }}>
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
            </StorefrontCheckoutMotion>

            <form
              ref={checkoutFormRef}
              id="checkout-form"
              onSubmit={handleSubmit}
              className="flex flex-col"
              style={{ gap: "var(--sf-space-lg)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
                <div className={checkoutStep === 0 ? "sf-checkout-step-store-active block" : "hidden lg:block"}>
                  <StorefrontCheckoutSection
                    title="Método de entrega"
                    icon={Truck}
                    motionKey={`store-checkout-${checkoutStep}-delivery`}
                    motionReady={checkoutMotionReady}
                    motionDelayMs={STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs}
                  >
                    <p className="sf-text-secondary text-stone-500">
                      Elige cómo recibir tu pedido. Selecciona un método de entrega para continuar.
                    </p>
                    {!settingsReady ? (
                      <div
                        className="flex items-center border border-stone-200 bg-stone-50/80 text-stone-500"
                        style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
                      >
                        <Spinner className="h-5 w-5" />
                        <p className="sf-text-secondary font-semibold">Cargando opciones de envío...</p>
                      </div>
                    ) : (
                      <>
                        {hasCoveredShippingPortion && (
                          <CoveredShippingPanel
                            freeBirdShipping={freeBirdShipping}
                            freeItemShipping={freeItemShipping}
                            hasBirds={hasBirds}
                            hasItems={hasItems}
                          />
                        )}

                        {!isShippingFullyCovered && shouldUseParcelDeliveryChoice && (
                          <div className="grid grid-cols-1" style={{ gap: "var(--sf-space-md)" }}>
                            <ChoiceButton
                              icon={Truck}
                              label="Paquetería a domicilio"
                              detail={getShippingSettingLabel("shipping_base_cost_items", settings)}
                              active={formData.deliveryMethod === "PARCEL"}
                              onClick={() => handleDeliveryMethodSelect("PARCEL")}
                            />
                          </div>
                        )}

                        {!isShippingFullyCovered && needsBirdDeliveryChoice && (
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
                      </>
                    )}
                    {settingsReady && !isShippingFullyCovered && (
                      <StorefrontNote>
                        {shouldUseParcelDeliveryChoice
                          ? hasBirds
                            ? "Los artículos se envían a tu dirección por paquetería. El envío del ave está cubierto y lo coordinaremos contigo."
                            : "Los artículos se envían a tu dirección por paquetería."
                          : isArticlesOnly
                          ? "Los artículos se envían a tu dirección por paquetería."
                          : "El método de entrega final depende de tu ciudad y estado. Si tu zona requiere una alternativa distinta, lo ajustamos y coordinamos contigo."}
                      </StorefrontNote>
                    )}
                  </StorefrontCheckoutSection>
                </div>

                <div className={checkoutStep === 1 ? "sf-checkout-step-store-active block" : "hidden lg:block"}>
                  <StorefrontCheckoutSection
                    title="Información del cliente"
                    icon={User}
                    motionKey={`store-checkout-${checkoutStep}-customer`}
                    motionReady={checkoutMotionReady}
                    motionDelayMs={
                      STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs
                      + (checkoutStep === 1 ? 0 : STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemStaggerMs)
                    }
                  >
                    <p className="sf-text-secondary text-stone-500">
                      Indícanos quién recibe el pedido. Usaremos estos datos para coordinar tu compra.
                    </p>
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
                        <div className="md:col-span-2">
                          <StorefrontField
                            required
                            label="Nombre completo de quien recibe"
                            placeholder="Nombre de la persona que recibe"
                            value={formData.receiverName}
                            onChange={(event) => setFormData({ ...formData, receiverName: event.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </StorefrontCheckoutSection>
                </div>

                <div className={checkoutStep === 2 ? "sf-checkout-step-store-active block" : "hidden lg:block"}>
                  <StorefrontCheckoutSection
                    title={requiresFullAddress ? "Dirección y ubicación" : "Ubicación de entrega"}
                    icon={MapPin}
                    motionKey={`store-checkout-${checkoutStep}-location`}
                    motionReady={checkoutMotionReady}
                    motionDelayMs={
                      STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs
                      + (checkoutStep === 2 ? 0 : STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemStaggerMs * 2)
                    }
                  >
                    <p className="sf-text-secondary text-stone-500">
                      Indica dónde coordinaremos la entrega de los productos de tu pedido.
                    </p>
                    <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
                      {requiresFullAddress && (
                        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                          <div className="md:col-span-2">
                            <StorefrontField
                              required
                              label="Calle y número interior o exterior"
                              placeholder="Ej. Av. Hidalgo 123"
                              value={formData.shippingStreet}
                              onChange={(event) => setFormData({ ...formData, shippingStreet: event.target.value })}
                            />
                          </div>
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
                      <StorefrontNote tone={shippingStatusTone}>{shippingStatusNote}</StorefrontNote>
                    </div>
                  </StorefrontCheckoutSection>
                </div>

                <div className={checkoutStep === 3 ? "sf-checkout-step-store-active block" : "hidden lg:block"}>
                  <StorefrontCheckoutSection
                    title="Método de pago"
                    icon={CreditCard}
                    motionKey={`store-checkout-${checkoutStep}-payment`}
                    motionReady={checkoutMotionReady}
                    motionDelayMs={
                      STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs
                      + (checkoutStep === 3 ? 0 : STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemStaggerMs * 3)
                    }
                  >
                    <p className="sf-text-secondary text-stone-500">
                      Elige cómo deseas completar tu pedido. Te mostraremos el siguiente paso según el método seleccionado.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                      <PaymentMethodCard
                        icon={Wallet}
                        title="Depósito / Transferencia"
                        subtitle="Pago manual verificado"
                        active={paymentMethod === "TRANSFER"}
                        onClick={() => setPaymentMethod("TRANSFER")}
                      />
                      {isMPEnabled && (
                        <PaymentMethodCard
                          icon={CreditCard}
                          title="Tarjeta de crédito o débito"
                          subtitle="Pago seguro con Mercado Pago"
                          active={paymentMethod === "MERCADOPAGO"}
                          onClick={() => setPaymentMethod("MERCADOPAGO")}
                        />
                      )}
                    </div>
                    {paymentMethod === "TRANSFER" && (
                      <BankInfoCard
                        bankInfo={bankInfo}
                        onCopy={(value) => {
                          void navigator.clipboard.writeText(value);
                          showToast("Dato bancario copiado.", "success");
                        }}
                      />
                    )}
                    {paymentMethod === "MERCADOPAGO" && isEmbeddedMP && mpCheckoutConfig?.publicKey && (
                      <MercadoPagoCardPayment
                        publicKey={mpCheckoutConfig.publicKey}
                        amount={orderTotal}
                        submitLabel="Pagar pedido"
                        onSubmit={handleEmbeddedCardPayment}
                        onApproved={handleEmbeddedPaymentApproved}
                        onPending={handleEmbeddedPaymentPending}
                        onCheckStatus={() => {
                          const attempt = pendingPaymentAttempt || readPendingPaymentAttempt();
                          if (!attempt) throw new Error("No hay un pago activo para verificar.");
                          return paymentApi.getCardPaymentStatus({
                            storePaymentHoldId: attempt.paymentHoldId,
                            customerPhone: attempt.customerPhone,
                          });
                        }}
                        onFailure={playErrorFeedback}
                      />
                    )}
                  </StorefrontCheckoutSection>
                </div>
              </div>

              {!isEmbeddedMP && (
                <Button
                  context="section"
                  className={`w-full h-20 text-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/20 ${checkoutStep === 3 ? "hidden lg:inline-flex" : "hidden"}`}
                  disabled={loading}
                >
                  {loading ? <Spinner className="text-white" /> : "Confirmar y pagar"}
                </Button>
              )}
            </form>
            </motion.div>
            )}
            </AnimatePresence>
          </div>

          <StorefrontCheckoutMotion phase="summary" ready={checkoutMotionReady} className="hidden lg:block">
          <aside>
            <OrderSummary
              items={summarySnapshot.items}
              subtotal={summarySnapshot.subtotal}
              discountTotal={summarySnapshot.discountTotal}
              shippingTotal={summarySnapshot.shippingTotal}
              shippingDetails={summarySnapshot.shippingDetails}
              selectedZone={summarySnapshot.selectedZone}
              total={summarySnapshot.total}
              onRemoveItem={completionState ? undefined : (item) => setItemToDelete(item)}
              completionStatus={completionPresentation
                ? {
                    label: completionPresentation.summaryStatus,
                    tone: completionState === "pending" ? "pending" : "success",
                  }
                : undefined}
            />
          </aside>
          </StorefrontCheckoutMotion>
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

      <StorefrontConfirmModal
        isOpen={!!checkoutIssue}
        onClose={() => setCheckoutIssue(null)}
        title={checkoutIssue?.title || ""}
        message={checkoutIssue?.message || ""}
        icon={AlertCircle}
        variant="danger"
        confirmLabel={checkoutIssue?.confirmLabel || "Entendido"}
        cancelLabel={checkoutIssue?.cancelLabel || "Volver a tienda"}
        onConfirm={() => setCheckoutIssue(null)}
        onCancel={() => {
          setCheckoutIssue(null);
          router.push("/store");
        }}
      />

      <BottomSheet
        isOpen={showMobileSummary}
        onClose={() => setShowMobileSummary(false)}
        title="Resumen"
      >
        <OrderSummary
          variant="sheet"
          items={summarySnapshot.items}
          subtotal={summarySnapshot.subtotal}
          discountTotal={summarySnapshot.discountTotal}
          shippingTotal={summarySnapshot.shippingTotal}
          shippingDetails={summarySnapshot.shippingDetails}
          selectedZone={summarySnapshot.selectedZone}
          total={summarySnapshot.total}
          onRemoveItem={completionState ? undefined : (item) => setItemToDelete(item)}
          completionStatus={completionPresentation
            ? {
                label: completionPresentation.summaryStatus,
                tone: completionState === "pending" ? "pending" : "success",
              }
            : undefined}
        />
      </BottomSheet>

      {(completionState || !(checkoutStep === 3 && paymentMethod === "MERCADOPAGO" && isEmbeddedMP)) && (
      <StorefrontPurchaseBar
        total={summarySnapshot.total}
        totalLabel={completionPresentation ? "Estado" : "Total"}
        totalValue={completionPresentation?.mobileStatus}
        loading={loading}
        disabled={!completionState && checkoutStep === 0 && (!settingsReady || (needsDeliveryChoice && !formData.deliveryMethod))}
        buttonLabel={completionState ? "Volver a la tienda" : checkoutStep === 0 && !settingsReady ? "Cargando" : checkoutStep === 0 && needsDeliveryChoice && !formData.deliveryMethod ? "Selecciona método" : checkoutStep === 3 ? "Finalizar pedido" : "Continuar"}
        buttonIcon={completionState ? ArrowLeft : checkoutStep === 3 ? ShoppingBag : ArrowRight}
        onAction={completionState ? () => router.push("/store") : handleCheckoutPrimaryAction}
        entrance="checkout"
        entranceReady={checkoutMotionReady}
      />
      )}
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

function isAvailabilityError(message: string | null) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not available") ||
    normalized.includes("no está disponible") ||
    normalized.includes("no esta disponible") ||
    normalized.includes("reservado") ||
    normalized.includes("vendido")
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

function CoveredShippingPanel({
  freeBirdShipping,
  freeItemShipping,
  hasBirds,
  hasItems,
}: {
  freeBirdShipping: boolean;
  freeItemShipping: boolean;
  hasBirds: boolean;
  hasItems: boolean;
}) {
  const coveredSegments = [
    freeBirdShipping && hasBirds ? "aves" : null,
    freeItemShipping && hasItems ? "artículos" : null,
  ].filter(Boolean);
  const pendingSegments = [
    !freeBirdShipping && hasBirds ? "aves" : null,
    !freeItemShipping && hasItems ? "artículos" : null,
  ].filter(Boolean);
  const coveredLabel = coveredSegments.length > 1
    ? "Aplica para aves y artículos de este pedido."
    : coveredSegments[0] === "aves"
      ? "Aplica para las aves de este pedido."
      : "Aplica para los artículos de este pedido.";
  const deliveryText = pendingSegments.length
    ? "La parte restante del pedido mostrará su método y costo correspondiente."
    : "Rancho Las Trojes coordinará el método de entrega más conveniente según tu ubicación y los productos de tu pedido.";

  return (
    <div
      className="flex flex-col border border-emerald-200 bg-emerald-50/80 text-emerald-950"
      style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
    >
      <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
        <span
          className="flex shrink-0 items-center justify-center bg-white text-emerald-600 shadow-sm"
          style={{
            width: "var(--sf-h-button-card)",
            height: "var(--sf-h-button-card)",
            borderRadius: "var(--sf-radius-nested)",
          }}
        >
          <Gift style={{ width: "var(--sf-size-inner-icon-card)", height: "var(--sf-size-inner-icon-card)" }} />
        </span>
        <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <p className="sf-text-label uppercase tracking-[0.2em] font-black text-emerald-600">Envío gratis</p>
          <p className="sf-text-h2 text-emerald-950">Nosotros coordinamos la entrega</p>
        </div>
      </div>
      <p className="sf-text-secondary font-semibold leading-relaxed text-emerald-900/80">
        {coveredLabel} {deliveryText}
      </p>
    </div>
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
  completionStatus,
}: {
  variant?: "sidebar" | "sheet";
  items: ReturnType<typeof useCartStore.getState>["items"];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingDetails: ShippingDetail[];
  selectedZone: ShippingZone | null;
  total: number;
  onRemoveItem?: (item: any) => void;
  completionStatus?: {
    label: string;
    tone: "success" | "pending";
  };
}) {
  const shippingIsFree = shippingDetails.length > 0 && shippingTotal === 0;
  const SummarySurface = variant === "sidebar" ? StorefrontAutonomousCard : StorefrontSectionCard;

  return (
    <SummarySurface
      density="compact"
      className={`overflow-hidden border-stone-800/40 bg-stone-900 text-white ${
        variant === "sidebar"
          ? "sticky top-[var(--sf-space-lg)] shadow-2xl shadow-stone-900/40"
          : "shadow-none"
      }`}
    >
      <div className="relative z-10 flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
          <StorefrontIcon icon={ShoppingBag} context="section" variant="brand" className="bg-white/10 border-white/10 text-brand-400 shadow-none" />
          <div>
            <p className="sf-text-label text-brand-400 uppercase tracking-[0.2em] font-black text-[10px]">Tu selección</p>
            <h3 className="sf-text-h1 uppercase tracking-tight leading-none">Resumen</h3>
          </div>
        </div>

        {completionStatus && (
          <motion.div
            key={`store-summary-${completionStatus.label}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center border-y border-white/10 py-[var(--sf-space-md)] ${
              completionStatus.tone === "success" ? "text-emerald-300" : "text-amber-300"
            }`}
            style={{ gap: "var(--sf-space-sm)" }}
          >
            {completionStatus.tone === "success" ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
            <span className="sf-text-secondary font-bold">{completionStatus.label}</span>
          </motion.div>
        )}

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
                {onRemoveItem && (
                  <button
                    onClick={() => onRemoveItem(item)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:bg-rose-500/20 hover:text-rose-500 transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!completionStatus && <CouponRedemption tone="dark" />}

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

          <SummaryRow label="Envío total" value={shippingDetails.length > 0 ? (shippingTotal > 0 ? `$${formatPrice(shippingTotal)}` : "Gratis") : "Pendiente de estado"} />

          <div className="flex flex-col pt-[var(--sf-space-md)] mt-2">
            <div className="flex items-baseline justify-between border-t border-white/5 pt-4">
              <span className="sf-text-h1 text-stone-400 uppercase tracking-tighter">Total final</span>
              <span className="sf-text-display tabular-nums text-brand-400 font-black tracking-tighter leading-none">
                ${formatPrice(total)}
              </span>
            </div>
          </div>
        </div>

        <StorefrontNote tone="inverse">
          {shippingIsFree
            ? "El envío está cubierto. Coordinaremos contigo la forma de entrega más conveniente."
            : shippingDetails.length > 0
            ? selectedZone
              ? `Enviaremos y coordinaremos contigo los detalles para ${selectedZone.name}.`
              : "Enviaremos los artículos a la dirección indicada."
            : "Al confirmar, aceptas nuestras políticas de venta y tiempos de entrega."}
        </StorefrontNote>
      </div>
    </SummarySurface>
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

function PendingPaymentAttemptView({
  attempt,
  loading,
  onContinue,
  onCancel,
  onBack,
}: {
  attempt: PendingPaymentAttempt;
  loading: boolean;
  onContinue: () => void;
  onCancel: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen px-[var(--sf-inset-page)] py-[var(--sf-space-xl)]">
      <div className="mx-auto flex max-w-2xl flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center text-stone-500 transition-colors hover:text-stone-850"
          style={{ gap: "var(--sf-space-sm)" }}
        >
          <ArrowLeft size={18} />
          <span className="sf-text-button-card">Volver a tienda</span>
        </button>

        <StorefrontCard className="flex flex-col text-center" style={{ gap: "var(--sf-space-lg)" }}>
          <div className="flex flex-col items-center" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontIcon icon={CreditCard} context="section" variant="brand" />
            <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
              <p className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">Pago pendiente</p>
              <h1 className="sf-text-display text-stone-850">Tu pedido está reservado</h1>
              <p className="sf-text-body mx-auto max-w-xl text-stone-500 font-medium leading-relaxed">
                Conservamos temporalmente los productos para {attempt.customerName || "tu compra"}. Puedes continuar el pago sin crear una orden duplicada.
              </p>
            </div>
          </div>

          <div
            className="flex items-center justify-between border border-stone-200 bg-stone-50/80 text-left"
            style={{ borderRadius: "var(--sf-radius-inner)", padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
          >
            <span className="sf-text-label text-stone-400 uppercase tracking-[0.2em] font-black">Total</span>
            <span className="sf-text-h1 tabular-nums text-brand-500">${formatPrice(attempt.total)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
            <Button type="button" context="section" variant="outline" onClick={onCancel} disabled={loading} className="w-full">
              Cancelar intento
            </Button>
            <Button type="button" context="section" onClick={onContinue} disabled={loading} className="w-full">
              {loading ? <Spinner className="text-white" /> : "Continuar pago"}
            </Button>
          </div>

          <p className="sf-text-secondary text-stone-400 font-medium">
            Si no haces nada, esta reserva temporal expirará automáticamente.
          </p>
        </StorefrontCard>
      </div>
    </div>
  );
}

const storeCompletionMotionItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
      ease: STOREFRONT_EASING.reveal,
    },
  },
} as const;

function StoreCheckoutCompletion({
  state,
  order,
  customerName,
  itemCount,
  paymentExpiresAt,
  onBackToStore,
  onGoHome,
}: {
  state: Exclude<CompletionState, null>;
  order: StoreOrderResponse;
  customerName: string;
  itemCount: number;
  paymentExpiresAt: string | null;
  onBackToStore: () => void;
  onGoHome: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const presentation = getStoreCheckoutCompletionPresentation(state);
  const firstName = customerName.trim().split(/\s+/)[0] || "Cliente";
  const deadline = formatOrderDeadline(paymentExpiresAt);
  const productLabel = `${itemCount} producto${itemCount === 1 ? "" : "s"}`;

  const steps = state === "reserved"
    ? [
        {
          icon: MessageCircle,
          title: "Revisa tu WhatsApp",
          description: "Te enviamos las instrucciones y los datos bancarios para completar el pago.",
        },
        {
          icon: Clock3,
          title: "Confirma dentro del plazo",
          description: deadline
            ? `Realiza tu depósito o transferencia antes de ${deadline}.`
            : "Realiza tu depósito o transferencia dentro del plazo informado por WhatsApp.",
        },
        {
          icon: ShieldCheck,
          title: "Envía tu comprobante",
          description: `Conservaremos ${productLabel} mientras nuestro equipo valida tu pago.`,
        },
      ]
    : state === "approved"
      ? [
          {
            icon: ShieldCheck,
            title: "Pago aprobado",
            description: "Mercado Pago confirmó la operación correctamente.",
          },
          {
            icon: ShoppingBag,
            title: "Pedido confirmado",
            description: `${productLabel} ${itemCount === 1 ? "quedó confirmado" : "quedaron confirmados"} en la orden #${order.id}.`,
          },
          {
            icon: MessageCircle,
            title: "Prepararemos tu entrega",
            description: "Te contactaremos por WhatsApp para continuar con la entrega de tu pedido.",
          },
        ]
      : [
          {
            icon: Clock3,
            title: "Validación en proceso",
            description: "Mercado Pago está revisando la operación. No necesitas intentar pagar nuevamente.",
          },
          {
            icon: ShieldCheck,
            title: "Pedido protegido",
            description: `Conservaremos ${productLabel} mientras recibimos la confirmación final.`,
          },
          {
            icon: MessageCircle,
            title: "Te mantendremos informado",
            description: "Recibirás por WhatsApp la actualización de tu pedido.",
          },
        ];

  return (
    <motion.section
      className="flex min-w-0 flex-col"
      style={{ gap: "var(--sf-space-xl)" }}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reduceMotion ? 0 : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.half),
            staggerChildren: reduceMotion ? 0 : toMotionSeconds(STOREFRONT_MOTION_MS.stagger.standard),
          },
        },
      }}
      transition={{
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_MOTION_MS.duration.instant
            : STOREFRONT_MOTION_MS.duration.deliberate,
        ),
        ease: STOREFRONT_EASING.reveal,
      }}
      aria-live="polite"
    >
      <motion.div className="flex items-start" style={{ gap: "var(--sf-space-md)" }} variants={storeCompletionMotionItem}>
        <StorefrontIcon
          icon={presentation.icon}
          context="autonomous"
          variant={state === "pending" ? "warning" : "success"}
        />
        <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-sm)" }}>
          <span className={`sf-text-label font-black uppercase tracking-[0.2em] ${
            state === "pending" ? "text-amber-600" : "text-emerald-600"
          }`}>
            {presentation.title}
          </span>
          <h1 className="sf-text-display text-stone-950">{presentation.greeting(firstName)}</h1>
          <p className="sf-text-body max-w-2xl text-stone-500">{presentation.description(order.id)}</p>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col border-y border-stone-200 py-[var(--sf-space-lg)]"
        style={{ gap: "var(--sf-space-lg)" }}
        variants={storeCompletionMotionItem}
      >
        <h2 className="sf-text-h2 text-stone-950">Qué sigue</h2>
        <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
          {steps.map((step) => (
            <div key={step.title} className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
              <StorefrontIcon icon={step.icon} context="card" variant={state === "pending" ? "warning" : "muted"} />
              <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                <h3 className="sf-text-secondary font-bold text-stone-950">{step.title}</h3>
                <p className="sf-text-secondary text-stone-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="hidden grid-cols-1 sm:grid-cols-2 md:grid"
        style={{ gap: "var(--sf-space-md)" }}
        variants={storeCompletionMotionItem}
      >
        <Button type="button" context="section" onClick={onBackToStore} icon={ArrowLeft}>
          Volver a la tienda
        </Button>
        <Button type="button" context="section" variant="outline" onClick={onGoHome}>
          Ir al inicio
        </Button>
      </motion.div>
    </motion.section>
  );
}

function getStoreCheckoutCompletionPresentation(state: Exclude<CompletionState, null>) {
  if (state === "approved") {
    return {
      icon: CheckCircle2,
      title: "Pago confirmado",
      greeting: (firstName: string) => `Tu pedido está confirmado, ${firstName}`,
      description: (orderId: number | string) => `El pago fue aprobado y la orden #${orderId} quedó confirmada correctamente.`,
      summaryStatus: "Pago confirmado",
      mobileStatus: "Pagado",
    };
  }

  if (state === "pending") {
    return {
      icon: Clock3,
      title: "Pago en revisión",
      greeting: (firstName: string) => `Estamos validando tu pago, ${firstName}`,
      description: (orderId: number | string) => `La operación de la orden #${orderId} todavía está siendo procesada. Tu pedido permanecerá protegido.`,
      summaryStatus: "Pago en revisión",
      mobileStatus: "En revisión",
    };
  }

  return {
    icon: CheckCircle2,
    title: "Apartado confirmado",
    greeting: (firstName: string) => `Gracias, ${firstName}`,
    description: (orderId: number | string) => `La orden #${orderId} quedó apartada correctamente. Completa el pago dentro del plazo para confirmar tu pedido.`,
    summaryStatus: "Apartado confirmado",
    mobileStatus: "Confirmado",
  };
}

function formatOrderDeadline(value: string | null) {
  if (!value) return null;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;

  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(deadline);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-2xl px-[var(--sf-inset-page)] text-center" style={{ paddingBlock: "var(--sf-space-xl)" }}>
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

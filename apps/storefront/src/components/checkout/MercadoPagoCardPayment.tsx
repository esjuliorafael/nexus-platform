"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardPayment, StatusScreen, initMercadoPago } from "@mercadopago/sdk-react";
import {
  MercadoPagoCardFormData,
  MercadoPagoCardPaymentResponse,
  MercadoPagoCardPaymentStatus,
} from "../../api/payments";

let initializedPublicKey: string | null = null;

type MercadoPagoCardPaymentProps = {
  publicKey: string;
  amount: number;
  submitLabel: string;
  externalSubmitRequest?: number;
  onReadyChange?: (isReady: boolean) => void;
  onSubmit: (formData: MercadoPagoCardFormData) => Promise<MercadoPagoCardPaymentResponse>;
  onApproved: (result: MercadoPagoCardPaymentResponse) => void;
  onPending: (result: MercadoPagoCardPaymentResponse) => void;
  onCheckStatus?: () => Promise<MercadoPagoCardPaymentStatus>;
  onFailure?: (message?: string) => void;
};

export function MercadoPagoCardPayment({
  publicKey,
  amount,
  submitLabel,
  externalSubmitRequest,
  onReadyChange,
  onSubmit,
  onApproved,
  onPending,
  onCheckStatus,
  onFailure,
}: MercadoPagoCardPaymentProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<MercadoPagoCardPaymentResponse | null>(null);
  const [visualTokens, setVisualTokens] = useState<ReturnType<typeof readStorefrontBrickTokens> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastExternalSubmitRequestRef = useRef(0);
  const activeAttemptIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSubmit, onApproved, onPending, onCheckStatus, onReadyChange, onFailure });

  useEffect(() => {
    callbacksRef.current = { onSubmit, onApproved, onPending, onCheckStatus, onReadyChange, onFailure };
  }, [onApproved, onCheckStatus, onFailure, onPending, onReadyChange, onSubmit]);

  useEffect(() => {
    if (!challenge || !callbacksRef.current.onCheckStatus) return;
    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const result = await callbacksRef.current.onCheckStatus?.();
        if (!active || !result) return;
        if (result.status === "approved") {
          window.clearInterval(interval);
          activeAttemptIdRef.current = null;
          callbacksRef.current.onApproved({
            ...challenge,
            status: "approved",
            outcome: "approved",
            retryable: false,
            uncertain: false,
          });
        } else if (["rejected", "unavailable"].includes(result.status)) {
          window.clearInterval(interval);
          activeAttemptIdRef.current = null;
          setChallenge(null);
          const message = result.message || paymentStatusMessage(result.statusDetail);
          setErrorMessage(message);
          callbacksRef.current.onFailure?.(message);
        }
      } catch {
        // The webhook remains authoritative when a transient lookup fails.
      }
    }, 2_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [challenge]);

  useEffect(() => {
    if (initializedPublicKey !== publicKey) {
      initMercadoPago(publicKey, { locale: "es-MX", advancedFraudPrevention: true });
      initializedPublicKey = publicKey;
    }
    setVisualTokens(readStorefrontBrickTokens());
  }, [publicKey]);

  useEffect(() => {
    if (
      externalSubmitRequest === undefined
      || externalSubmitRequest <= 0
      || externalSubmitRequest === lastExternalSubmitRequestRef.current
    ) {
      return;
    }

    lastExternalSubmitRequestRef.current = externalSubmitRequest;
    const submitButton = rootRef.current?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submitButton) {
      setErrorMessage("El formulario de pago aún se está preparando.");
      callbacksRef.current.onFailure?.();
      return;
    }
    submitButton.click();
  }, [externalSubmitRequest]);

  useEffect(() => () => {
    callbacksRef.current.onReadyChange?.(false);
  }, []);

  const initialization = useMemo(() => ({ amount }), [amount]);
  const customization = useMemo(
    () => visualTokens ? createBrickCustomization(submitLabel, visualTokens) : null,
    [submitLabel, visualTokens]
  );

  const handleBrickReady = useCallback(() => {
    callbacksRef.current.onReadyChange?.(true);
  }, []);

  const handleBrickError = useCallback((error: { message?: string }) => {
    setErrorMessage(error.message || "No se pudo cargar el formulario de pago.");
    callbacksRef.current.onFailure?.();
  }, []);

  const handleBrickSubmit = useCallback(async (formData: unknown) => {
    setErrorMessage(null);
    try {
      const paymentAttemptId = activeAttemptIdRef.current || createPaymentAttemptId();
      activeAttemptIdRef.current = paymentAttemptId;
      const result = await callbacksRef.current.onSubmit({
        ...(formData as MercadoPagoCardFormData),
        paymentAttemptId,
      });
      if (result.outcome === "approved") {
        activeAttemptIdRef.current = null;
        callbacksRef.current.onApproved(result);
        return;
      }
      if (result.outcome === "processing" && result.statusDetail === "pending_challenge" && result.threeDsInfo) {
        setChallenge(result);
        return;
      }
      if (result.outcome === "processing") {
        callbacksRef.current.onPending(result);
        return;
      }
      activeAttemptIdRef.current = null;
      throw new Error(result.message || paymentStatusMessage(result.statusDetail));
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "No se pudo procesar la tarjeta.";
      if (!error?.response?.data?.uncertain) activeAttemptIdRef.current = null;
      setErrorMessage(message);
      callbacksRef.current.onFailure?.(message);
      throw error;
    }
  }, []);

  if (challenge?.threeDsInfo) {
    return (
      <div className="w-full" aria-live="polite">
        <StatusScreen
          id={`mp-status-${challenge.paymentId}`}
          locale="es-MX"
          initialization={{
            paymentId: challenge.paymentId,
            additionalInfo: {
              externalResourceURL: challenge.threeDsInfo.externalResourceUrl,
              creq: challenge.threeDsInfo.creq,
            },
          }}
          customization={{
            backUrls: { return: window.location.href },
            visual: { showExternalReference: false },
          }}
          onError={(error) => {
            setErrorMessage(error.message || "No se pudo completar la verificación bancaria.");
            callbacksRef.current.onFailure?.();
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`sf-mercado-pago-brick flex w-full flex-col${externalSubmitRequest !== undefined ? " sf-mercado-pago-brick--external-action" : ""}`}
    >
      {errorMessage && (
        <p className="mb-[var(--sf-space-sm)] sf-text-secondary text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      {customization ? (
        <CardPayment
          id={`mp-card-payment-${amount.toFixed(2).replace(".", "-")}`}
          locale="es-MX"
          initialization={initialization}
          customization={customization as any}
          onReady={handleBrickReady}
          onError={handleBrickError}
          onSubmit={handleBrickSubmit}
        />
      ) : (
        <div
          className="h-[var(--sf-h-input)] w-full animate-pulse bg-[var(--sf-bg-muted)]"
          style={{ borderRadius: "var(--sf-radius-inner)" }}
          aria-label="Preparando formulario de pago"
          aria-busy="true"
        />
      )}
      <p className="mt-[var(--sf-space-md)] sf-text-secondary text-stone-500">
        Mercado Pago procesa los datos de tu tarjeta de forma segura. Nexus no almacena el número ni el código de seguridad.
      </p>
    </div>
  );
}

function createBrickCustomization(submitLabel: string, tokens: ReturnType<typeof readStorefrontBrickTokens>) {
  return {
    paymentMethods: {
      minInstallments: 1,
      maxInstallments: 12,
      types: { included: ["credit_card", "debit_card", "prepaid_card"] },
    },
    visual: {
      style: {
        theme: "flat",
        customVariables: {
          baseColor: tokens.brand,
          baseColorFirstVariant: tokens.brandStrong,
          baseColorSecondVariant: tokens.brandSoft,
          formBackgroundColor: "transparent",
          inputBackgroundColor: tokens.fieldBackground,
          textPrimaryColor: tokens.textPrimary,
          textSecondaryColor: tokens.textSecondary,
          outlinePrimaryColor: tokens.border,
          outlineSecondaryColor: tokens.borderStrong,
          errorColor: "#dc2626",
          successColor: "#059669",
          buttonTextColor: tokens.buttonText,
          fontSizeExtraExtraSmall: tokens.captionSize,
          fontSizeExtraSmall: tokens.labelSize,
          fontSizeSmall: tokens.secondarySize,
          fontSizeMedium: tokens.bodySize,
          fontSizeLarge: scaleBrickFontSize(tokens.bodySize),
          fontSizeExtraLarge: tokens.titleSize,
          fontWeightNormal: "600",
          fontWeightSemiBold: "700",
          formInputsTextTransform: "none",
          inputVerticalPadding: tokens.inputVerticalPadding,
          inputHorizontalPadding: tokens.inputHorizontalPadding,
          inputFocusedBoxShadow: "0 0 0 4px rgb(185 144 109 / 0.10)",
          inputErrorFocusedBoxShadow: "0 0 0 4px rgb(220 38 38 / 0.10)",
          inputBorderWidth: "1px",
          inputFocusedBorderWidth: "1px",
          borderRadiusSmall: tokens.nestedRadius,
          borderRadiusMedium: tokens.inputRadius,
          borderRadiusLarge: tokens.outerRadius,
          formPadding: "0px",
        },
      },
      texts: {
        formTitle: "Datos de la tarjeta",
        formSubmit: submitLabel,
      },
    },
  };
}

function readStorefrontBrickTokens() {
  const fallback = {
    brand: "#b08968",
    brandStrong: "#9d7a5c",
    brandSoft: "#f2e8e5",
    fieldBackground: "#ffffff",
    textPrimary: "#0c0a09",
    textSecondary: "#a8a29e",
    border: "#e7e5e4",
    borderStrong: "#d6cec7",
    buttonText: "#fffdfb",
    captionSize: "0.625rem",
    labelSize: "0.6875rem",
    secondarySize: "0.875rem",
    bodySize: "1rem",
    titleSize: "1.5rem",
    inputVerticalPadding: "0.875rem",
    inputHorizontalPadding: "1.25rem",
    nestedRadius: "0.5rem",
    inputRadius: "1rem",
    outerRadius: "2rem",
  };

  if (typeof document === "undefined") return fallback;

  const root = getComputedStyle(document.documentElement);
  const value = (name: string, defaultValue: string) =>
    root.getPropertyValue(name).trim() || defaultValue;
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);

  const resolve = (property: string, token: string, defaultValue: string) => {
    probe.style.setProperty(property, `var(${token})`);
    return getComputedStyle(probe).getPropertyValue(property).trim() || defaultValue;
  };

  const inputHeight = Number.parseFloat(resolve("height", "--sf-h-input", "52px"));
  const bodySize = resolve("font-size", "--sf-text-body", fallback.bodySize);
  const bodyPixels = Number.parseFloat(bodySize) || 16;
  const inputVerticalPadding = `${Math.max(10, (inputHeight - bodyPixels * 1.5 - 2) / 2) + 1.5}px`;
  const resolved = {
    brand: value("--sf-brand-main", fallback.brand),
    brandStrong: value("--sf-brand-strong", fallback.brandStrong),
    brandSoft: value("--sf-brand-soft", fallback.brandSoft),
    fieldBackground: value("--sf-bg-field", fallback.fieldBackground),
    textPrimary: value("--sf-text-main", fallback.textPrimary),
    textSecondary: value("--sf-text-field-label", fallback.textSecondary),
    border: value("--sf-border-field", fallback.border),
    borderStrong: value("--sf-border-strong", fallback.borderStrong),
    buttonText: value("--sf-bg-card", fallback.buttonText),
    captionSize: resolve("font-size", "--sf-text-caption", fallback.captionSize),
    labelSize: resolve("font-size", "--sf-text-label", fallback.labelSize),
    secondarySize: resolve("font-size", "--sf-text-secondary", fallback.secondarySize),
    bodySize,
    titleSize: resolve("font-size", "--sf-text-h1", fallback.titleSize),
    inputVerticalPadding,
    inputHorizontalPadding: fallback.inputHorizontalPadding,
    nestedRadius: resolve("border-radius", "--sf-radius-nested", fallback.nestedRadius),
    inputRadius: resolve("border-radius", "--sf-radius-inner", fallback.inputRadius),
    outerRadius: resolve("border-radius", "--sf-radius-outer", fallback.outerRadius),
  };

  probe.remove();
  return resolved;
}

function scaleBrickFontSize(value: string) {
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? `${(pixels * 1.041667).toFixed(3)}px` : value;
}

function paymentStatusMessage(statusDetail?: string | null) {
  const messages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Revisa el número de la tarjeta.",
    cc_rejected_bad_filled_date: "Revisa la fecha de vencimiento.",
    cc_rejected_bad_filled_security_code: "Revisa el código de seguridad.",
    cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
    cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
    cc_rejected_call_for_authorize: "Autoriza el pago con tu banco e intenta nuevamente.",
    cc_rejected_card_disabled: "La tarjeta está deshabilitada. Comunícate con tu banco.",
    cc_rejected_duplicated_payment: "Este pago ya fue procesado.",
    cc_rejected_high_risk: "Mercado Pago no pudo aprobar esta operación.",
    cc_rejected_max_attempts: "Se alcanzó el límite de intentos para esta tarjeta. Usa otra tarjeta.",
    cc_rejected_other_reason: "El banco no aprobó el pago. Intenta con otra tarjeta.",
    network_confirmation_pending: "Estamos verificando el resultado con Mercado Pago.",
  };
  return statusDetail && messages[statusDetail]
    ? messages[statusDetail]
    : "El pago no fue aprobado. Puedes revisar los datos o intentar con otra tarjeta.";
}

function createPaymentAttemptId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

import React, { useEffect, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import {
  buildCustomerPhone,
  CUSTOMER_PHONE_COUNTRIES,
  CUSTOMER_PHONE_COUNTRY_ORDER,
  CustomerPhoneCountry,
  parseCustomerPhone,
} from "../../utils/customer-phone";

interface NexusPhoneFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export const NexusPhoneField: React.FC<NexusPhoneFieldProps> = ({
  label = "Teléfono / WhatsApp",
  value,
  onChange,
  error,
  required,
  disabled,
  id = "customer-phone",
}) => {
  const initial = parseCustomerPhone(value);
  const [country, setCountry] = useState<CustomerPhoneCountry>(initial.country);
  const parsed = parseCustomerPhone(value, country);
  const config = CUSTOMER_PHONE_COUNTRIES[country];

  useEffect(() => {
    if (value) setCountry(parseCustomerPhone(value, country).country);
  }, [country, value]);

  return (
    <label className="group flex w-full min-w-0 flex-col" htmlFor={id} style={{ gap: "var(--space-xs)" }}>
      <span className="ml-1 text-label uppercase tracking-[0.15em] text-text-muted transition-colors group-focus-within:text-brand-500">
        {label}{required ? " *" : ""}
      </span>
      <div
        className="flex h-[var(--h-input)] min-w-0 items-center overflow-hidden border border-border-main bg-bg-muted transition-all duration-300 focus-within:border-brand-500/50 focus-within:bg-bg-card focus-within:ring-4 focus-within:ring-brand-500/5"
        style={{ borderRadius: "var(--radius-inner-visual)", transitionTimingFunction: "var(--ease-emil)" }}
      >
        <div className="relative h-full shrink-0 border-r border-border-main">
          <select
            aria-label="País del teléfono"
            value={country}
            disabled={disabled}
            onChange={(event) => {
              const nextCountry = event.target.value as CustomerPhoneCountry;
              setCountry(nextCountry);
              onChange(buildCustomerPhone(nextCountry, parsed.nationalNumber));
            }}
            className="h-full appearance-none bg-transparent pl-4 pr-9 text-secondary font-semibold text-text-main outline-none disabled:opacity-50"
          >
            {CUSTOMER_PHONE_COUNTRY_ORDER.map((countryCode) => (
              <option key={countryCode} value={countryCode}>
                {countryCode} +{CUSTOMER_PHONE_COUNTRIES[countryCode].callingCode}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        </div>
        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <Phone
            className="absolute left-4 text-text-muted transition-colors group-focus-within:text-brand-500"
            style={{ width: "var(--size-inner-icon-card)", height: "var(--size-inner-icon-card)" }}
            strokeWidth={1.5}
          />
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={parsed.nationalNumber}
            disabled={disabled}
            maxLength={config.nationalLength}
            placeholder={config.placeholder}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(buildCustomerPhone(country, event.target.value))}
            className="h-full min-w-0 flex-1 bg-transparent pl-12 pr-4 text-secondary font-medium text-text-main outline-none placeholder:text-text-muted disabled:opacity-50"
          />
        </div>
      </div>
      {error && <span className="px-1 text-label text-rose-500">{error}</span>}
    </label>
  );
};

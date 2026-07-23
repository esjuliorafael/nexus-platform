"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import {
  buildCustomerPhone,
  CUSTOMER_PHONE_COUNTRIES,
  CUSTOMER_PHONE_COUNTRY_ORDER,
  CustomerPhoneCountry,
  normalizeCustomerPhoneInput,
  parseCustomerPhone,
} from "../../lib/customer-phone";

interface StorefrontPhoneFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function StorefrontPhoneField({
  label = "Teléfono (WhatsApp)",
  value,
  onChange,
  error,
  required,
  disabled,
  id = "customer-phone",
}: StorefrontPhoneFieldProps) {
  const initial = parseCustomerPhone(value);
  const [country, setCountry] = useState<CustomerPhoneCountry>(initial.country);
  const parsed = parseCustomerPhone(value, country);
  const config = CUSTOMER_PHONE_COUNTRIES[country];

  useEffect(() => {
    if (value) setCountry(parseCustomerPhone(value, country).country);
  }, [country, value]);

  const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCountry = event.target.value as CustomerPhoneCountry;
    setCountry(nextCountry);
    onChange(buildCustomerPhone(nextCountry, parsed.nationalNumber));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nationalNumber = normalizeCustomerPhoneInput(country, event.target.value);
    onChange(buildCustomerPhone(country, nationalNumber));
  };

  return (
    <label className="group flex min-w-0 flex-col" htmlFor={id} style={{ gap: "var(--sf-space-xs)" }}>
      <span className="sf-text-label text-[var(--sf-text-field-label)] group-focus-within:text-brand-500">
        {label}{required ? " *" : ""}
      </span>
      <div
        className="flex h-[var(--sf-h-input)] min-w-0 items-center overflow-hidden border border-[var(--sf-border-field)] bg-[var(--sf-bg-field)] transition-all duration-300 focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10"
        style={{ borderRadius: "var(--sf-radius-inner)", transitionTimingFunction: "var(--sf-ease)" }}
      >
        <div className="relative h-full shrink-0 border-r border-[var(--sf-border-field)]">
          <select
            aria-label="País del teléfono"
            value={country}
            onChange={handleCountryChange}
            disabled={disabled}
            className="h-full appearance-none bg-transparent pl-4 pr-9 sf-text-body font-semibold text-[var(--sf-text-main)] outline-none disabled:opacity-50"
          >
            {CUSTOMER_PHONE_COUNTRY_ORDER.map((countryCode) => {
              const option = CUSTOMER_PHONE_COUNTRIES[countryCode];
              return <option key={countryCode} value={countryCode}>{countryCode} +{option.callingCode}</option>;
            })}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={16}
          />
        </div>
        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <Phone
            aria-hidden="true"
            className="absolute left-4 text-stone-400 group-focus-within:text-brand-500"
            size="var(--sf-size-inner-icon-card)"
            strokeWidth={1.7}
          />
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={parsed.nationalNumber}
            onChange={handleNumberChange}
            disabled={disabled}
            pattern="[0-9]*"
            placeholder={config.placeholder}
            aria-invalid={Boolean(error)}
            className="h-full min-w-0 flex-1 bg-transparent pl-12 pr-4 sf-text-body font-semibold text-[var(--sf-text-main)] outline-none placeholder:text-[var(--sf-text-field-label)] disabled:opacity-50"
          />
        </div>
      </div>
      {error && <span className="sf-text-label text-red-500">{error}</span>}
    </label>
  );
}

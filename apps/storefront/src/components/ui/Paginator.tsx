"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface StorefrontPaginatorProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function StorefrontPaginator({
  page,
  totalPages,
  onPageChange,
  className = "",
}: StorefrontPaginatorProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      className={`flex items-center justify-center ${className}`}
      aria-label="Paginacion"
      style={{ gap: "var(--sf-space-sm)" }}
    >
      <Button
        type="button"
        variant="outline"
        context="card"
        size="icon"
        isIconOnly
        icon={ChevronLeft}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Pagina anterior"
      />

      <div className="flex items-center" style={{ gap: "var(--sf-space-xs)" }}>
        {pages.map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === page ? "primary" : "ghost"}
            context="card"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        context="card"
        size="icon"
        isIconOnly
        icon={ChevronRight}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Pagina siguiente"
      />
    </nav>
  );
}

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandedPageHeaderProps {
  section: string;
  description?: string;
  action?: ReactNode;
  onBack?: () => void;
}

export function BrandedPageHeader({
  section,
  description,
  action,
  onBack,
}: BrandedPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-sm md:px-6 md:py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/[0.08] via-transparent to-primary/[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full border-[24px] border-amber-500/[0.07]"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onBack}
              className="h-10 w-10 shrink-0 rounded-full bg-background/80 shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div
            aria-hidden="true"
            className="h-11 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_14px_rgba(217,159,55,0.35)] md:h-12"
          />

          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300 md:text-xs">
              {section}
            </p>
            <h1 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">
              Classic Function Hall
            </h1>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{description}</p>
            )}
          </div>
        </div>

        {action && (
          <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoldButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

export function GoldButton({
  className,
  loading,
  children,
  disabled,
  ...props
}: GoldButtonProps) {
  return (
    <Button
      className={cn(
        "border border-[#D4AF37]/40 bg-[#D4AF37] text-[#0A0E17] hover:bg-[#D4AF37]/90 gold-glow transition-normal",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
      {children}
    </Button>
  );
}

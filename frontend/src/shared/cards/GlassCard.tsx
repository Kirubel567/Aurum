import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function GlassCard({
  children,
  className,
  glow = false,
  padding = "md",
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-panel ring-1 ring-white/[0.04] transition-normal",
        glow && "gold-glow",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

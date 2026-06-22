"use client";

interface ChartPlaceholderProps {
  height?: number;
  className?: string;
}

export function AumChart({ height = 300, className }: ChartPlaceholderProps) {
  return (
    <div
      className={className}
      style={{ height }}
      aria-label="AUM chart placeholder"
    />
  );
}

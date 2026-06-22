"use client";

interface ChartPlaceholderProps {
  height?: number;
  className?: string;
}

export function AreaChart({ height = 300, className }: ChartPlaceholderProps) {
  return (
    <div
      className={className}
      style={{ height }}
      aria-label="Area chart placeholder"
    />
  );
}

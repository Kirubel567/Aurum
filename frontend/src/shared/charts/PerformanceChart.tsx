"use client";

interface ChartPlaceholderProps {
  height?: number;
  className?: string;
}

export function PerformanceChart({ height = 300, className }: ChartPlaceholderProps) {
  return (
    <div
      className={className}
      style={{ height }}
      aria-label="Performance chart placeholder"
    />
  );
}

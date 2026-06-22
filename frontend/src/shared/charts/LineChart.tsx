"use client";

interface ChartPlaceholderProps {
  height?: number;
  className?: string;
}

export function LineChart({ height = 300, className }: ChartPlaceholderProps) {
  return (
    <div
      className={className}
      style={{ height }}
      aria-label="Line chart placeholder"
    />
  );
}

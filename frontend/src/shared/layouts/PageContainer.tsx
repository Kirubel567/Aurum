import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  density?: "comfortable" | "compact";
  className?: string;
}

export function PageContainer({
  children,
  title,
  actions,
  density = "comfortable",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col",
        density === "compact" ? "gap-4 p-4" : "gap-6 p-6",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && (
            <h1
              className={cn(
                "font-semibold tracking-tight",
                density === "compact" ? "text-lg" : "text-2xl"
              )}
            >
              {title}
            </h1>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

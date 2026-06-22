import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-[#EF4444]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

import { LockKeyhole, Shield } from "lucide-react";

export function SecurityBanner() {
  return (
    <div className="relative mt-6 flex items-center justify-between overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-50 via-white to-[#f3f8ff] px-4 py-4 sm:px-5">
      <div className="relative z-10 flex items-center gap-4">
        <div className="shrink-0 rounded-lg bg-[#e9c349]/15 p-2.5">
          <Shield className="size-5 text-[#c89b2d]" />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold text-[#050B14]">
            Your Security is Our Priority
          </h4>
          <p className="max-w-md text-xs leading-6 text-slate-500 sm:text-sm">
            Your information is encrypted and protected with industry-leading
            security standards.
          </p>
        </div>
      </div>
      <div className="relative z-10 ml-4 hidden h-16 w-20 shrink-0 items-center justify-center sm:flex">
        <div className="absolute right-2 h-14 w-14 rounded-full bg-[#dbeafe]" />
        <div className="absolute right-5 top-1 h-9 w-9 rounded-full bg-[#eff6ff]" />
        <div className="absolute right-0 bottom-1 h-7 w-7 rounded-full bg-[#bfdbfe]/70" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/85 shadow-[0_10px_30px_-15px_rgba(37,99,235,0.55)] ring-1 ring-[#bfdbfe]">
          <LockKeyhole className="size-5 text-[#3b82f6]" />
        </div>
      </div>
    </div>
  );
}

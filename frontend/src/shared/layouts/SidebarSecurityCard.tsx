import { Lock } from "lucide-react";

export function SidebarSecurityCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#101927] p-5 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-[#C5A059]/20">
        <Lock className="size-5 text-[#C5A059]" />
      </div>
      <h4 className="mb-1 text-xs font-semibold text-white">
        Your Security is Our Priority
      </h4>
      <p className="mb-4 text-[10px] leading-relaxed text-gray-400">
        All transactions are secured with 256-bit encryption.
      </p>
      <button
        type="button"
        className="w-full rounded-md border border-[#C5A059] py-2 text-xs font-semibold text-[#C5A059] transition-colors hover:bg-[#C5A059] hover:text-[#0B1221]"
      >
        Learn More
      </button>
    </div>
  );
}

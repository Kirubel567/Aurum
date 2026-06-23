"use client";

import { LineChart, ShieldCheck, Sparkles } from "lucide-react";

import { ONBOARDING_ASSETS } from "@/src/lib/constants/countries";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: LineChart,
    title: "Transparent Performance",
    description:
      "Track your investment in real-time with our live dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your security and data privacy are our top priority.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Trading",
    description:
      "Advanced technology and expert strategies for consistent growth.",
  },
] as const;

export function BrandSidebar() {
  return (
    <aside className="relative hidden w-[40%] flex-col justify-between overflow-hidden bg-[#080f14] p-8 lg:flex lg:p-16">
      {/* Bull / chart background layer */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <img
          src={ONBOARDING_ASSETS.bullBackground}
          alt=""
          className="absolute bottom-0 left-0 h-[55%] w-full object-contain object-bottom"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080f14] via-[#080f14]/60 to-transparent" />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[#dde3eb]/80">Welcome to</h2>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#e9c349] xl:text-5xl">
            Aurum Sovereign Capital
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-[#c5c6cc]">
            Partner with a professional trading team and grow your investment
            with transparency and advanced technology.
          </p>
        </div>

        <div className="space-y-6 pt-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    "border border-[#e9c349]/20 bg-white/[0.03] backdrop-blur-md"
                  )}
                >
                  <Icon className="size-5 text-[#e9c349]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#dde3eb]">
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#c5c6cc]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-[#e9c349]/20",
            "bg-[#e9c349]/10 p-4 backdrop-blur-sm"
          )}
        >
          <ShieldCheck className="size-5 shrink-0 text-[#e9c349]" />
          <span className="text-sm font-semibold text-[#e9c349]">
            Licensed & Regulated Trading Management Company
          </span>
        </div>
      </div>
    </aside>
  );
}

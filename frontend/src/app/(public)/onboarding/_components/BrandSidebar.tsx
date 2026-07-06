"use client";

import Image from "next/image";
import { LineChart, ShieldCheck, Sparkles } from "lucide-react";

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
    <aside className="relative hidden w-[40%] min-w-[380px] overflow-hidden bg-[#020617] lg:flex lg:min-h-[calc(100vh-4rem)]">
      {/* Base radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.18),transparent_60%)]" />

      {/* Bull background image — blends from bottom-right */}
      <div className="absolute inset-x-0 bottom-0 top-[30%]">
        <Image
          src="/brand/aurum-bull-background.jpg"
          alt=""
          fill
          aria-hidden
          className="object-cover object-[68%_80%]"
          sizes="40vw"
          priority
        />
      </div>

      {/* Smooth multi-layer blend over the image */}
      <div className="pointer-events-none absolute inset-0">
        {/* Full dark base */}
        <div className="absolute inset-0 bg-[#020617]/55" />
        {/* Strong left edge fade */}
        <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#020617] via-[#020617]/85 to-transparent" />
        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent" />
        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020617] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full min-h-screen w-full flex-col justify-between px-8 py-10 xl:px-10">
        <div className="space-y-8">
          {/* Headline block */}
          <div className="space-y-3 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e9c349]/70">
              Investor Programme
            </p>
            <p className="text-2xl font-medium leading-snug tracking-tight text-white/80 xl:text-[1.65rem]">
              Welcome to
            </p>
            <h2 className="max-w-xs text-[1.75rem] font-bold leading-tight tracking-tight text-[#e9c349] xl:text-[2rem]">
              Aurum Sovereign Capital
            </h2>
            <p className="max-w-[280px] text-sm leading-7 text-slate-300/90">
              Partner with a professional trading team and grow your investment
              with transparency and advanced technology.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-5 pt-1">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      "border border-white/8 bg-[#16304c]/60 backdrop-blur-sm"
                    )}
                  >
                    <Icon className="size-4.5 text-[#e9c349]" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold tracking-tight text-white">
                      {feature.title}
                    </h3>
                    <p className="max-w-[240px] text-xs leading-6 text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="mt-auto pb-1">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border border-[#e9c349]/15",
              "bg-white/[0.04] px-4 py-3 backdrop-blur-md"
            )}
          >
            <ShieldCheck className="size-4 shrink-0 text-[#e9c349]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4d979]/80">
              Licensed & Regulated Trading Management Company
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

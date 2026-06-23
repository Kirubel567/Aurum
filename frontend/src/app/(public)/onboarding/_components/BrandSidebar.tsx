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
    <aside className="relative hidden w-[40%] min-w-[360px] overflow-hidden bg-[#020617] lg:flex lg:min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_45%),linear-gradient(180deg,#0b1425_0%,#020617_100%)]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-r from-[#020617] via-[#020617]/86 to-[#020617]/48" />
        <div className="absolute inset-x-0 top-0 h-[48%] bg-linear-to-b from-[#020617] via-[#020617]/94 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[54%] bg-linear-to-r from-[#020617] via-[#020617]/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 top-[42%] opacity-78">
          <Image
            src="/brand/aurum-bull-background.jpg"
            alt=""
            fill
            aria-hidden
            className="object-cover object-[72%_86%]"
            sizes="40vw"
            priority
          />
        </div>
      </div>

      <div className="relative z-10 flex h-full min-h-screen w-full flex-col justify-between px-8 py-10 pb-6 lg:min-h-0 xl:px-10">
        <div className="space-y-9">
          <div className="space-y-4 pt-8">
            <p className="text-[2rem] leading-none font-semibold tracking-tight text-white xl:text-[2.2rem]">
              Welcome to
            </p>
            <h2 className="max-w-sm text-[2.15rem] leading-tight font-semibold tracking-tight text-[#e9c349] xl:text-[2.45rem]">
              Aurum Sovereign Capital
            </h2>
            <p className="max-w-sm text-base leading-8 text-slate-300">
              Partner with a professional trading team and grow your investment
              with transparency and advanced technology.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      "border border-white/8 bg-[#16304c]/70 backdrop-blur-sm"
                    )}
                  >
                    <Icon className="size-5 text-[#e9c349]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold tracking-tight text-white">
                      {feature.title}
                    </h3>
                    <p className="max-w-xs text-sm leading-7 text-slate-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-auto pb-1">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-[#e9c349]/18",
              "bg-white/4 px-4 py-3 backdrop-blur-md"
            )}
          >
            <ShieldCheck className="size-5 shrink-0 text-[#e9c349]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f4d979]">
              Licensed & Regulated Trading Management Company
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

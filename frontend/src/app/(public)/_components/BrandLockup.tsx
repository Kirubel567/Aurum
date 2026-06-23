"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandLockupProps {
  className?: string;
  href?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
  tone?: "gold" | "white";
}

const ICON_BY_TONE = {
  gold: "/brand/aurum-icon-gold.png",
  white: "/brand/aurum-icon-white.png",
} as const;

export function BrandLockup({
  className,
  href = "/login",
  iconClassName,
  wordmarkClassName,
  priority = false,
  tone = "gold",
}: BrandLockupProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center gap-3 sm:gap-4",
        className
      )}
      aria-label="Aurum Sovereign Capital"
    >
      <div className={cn("relative h-9 w-9 shrink-0 sm:h-11 sm:w-11", iconClassName)}>
        <Image
          src={ICON_BY_TONE[tone]}
          alt="Aurum emblem"
          fill
          priority={priority}
          className="object-contain"
          sizes="44px"
        />
      </div>

      <div className={cn("relative h-8 w-[178px] shrink-0 sm:h-10 sm:w-[224px]", wordmarkClassName)}>
        <Image
          src="/brand/aurum-lettermark-white.png"
          alt="Aurum Sovereign Capital"
          fill
          priority={priority}
          className="object-contain object-left"
          sizes="(max-width: 640px) 178px, 224px"
        />
      </div>
    </Link>
  );
}

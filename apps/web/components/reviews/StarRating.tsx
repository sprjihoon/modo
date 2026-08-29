"use client";

import { Star } from "lucide-react";
import { STAR_MAX, STAR_MIN } from "@/lib/reviews";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "gold" | "brand";
  className?: string;
}

const SIZE = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
};

const FILL = {
  gold: "fill-[#FFB800] text-[#FFB800]",
  brand: "fill-[#00C896] text-[#00C896]",
};

export function StarRating({
  value,
  onChange,
  size = "md",
  color = "gold",
  className,
}: StarRatingProps) {
  const interactive = typeof onChange === "function";
  const stars = Array.from({ length: STAR_MAX }, (_, i) => i + STAR_MIN);

  return (
    <div
      className={cn(
        "inline-flex items-center",
        size === "xl" ? "gap-2" : "gap-0.5",
        className
      )}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${value}점 / ${STAR_MAX}점`}
    >
      {stars.map((star) => {
        const filled = star <= value;
        const icon = (
          <Star
            className={cn(
              SIZE[size],
              filled ? FILL[color] : "fill-gray-100 text-gray-200"
            )}
            strokeWidth={1.5}
          />
        );

        if (!interactive) {
          return <span key={star}>{icon}</span>;
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}점`}
            onClick={() => onChange(star)}
            className="p-0.5 rounded-md active:scale-90 transition-transform"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

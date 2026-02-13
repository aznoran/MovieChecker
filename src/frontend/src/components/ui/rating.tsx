"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
  className?: string;
}

export function Rating({
  value,
  onChange,
  max = 10,
  size = "md",
  readOnly = false,
  showValue = false,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (index: number) => {
    if (!readOnly && onChange) {
      onChange(index + 1);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readOnly) {
      setHoverValue(index + 1);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(null);
    }
  };

  const getStarFill = (index: number) => {
    const displayValue = hoverValue ?? value;
    const full = Math.floor(displayValue);
    const partial = displayValue - full;

    if (index < full) {
      return "text-yellow-400";
    } else if (index === full && partial >= 0.5) {
      return "text-yellow-400/50";
    } else {
      return "text-muted-foreground/20";
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className={cn(
          "flex items-center gap-0.5",
          !readOnly && "cursor-pointer"
        )}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            onMouseEnter={() => handleMouseEnter(i)}
            disabled={readOnly}
            className={cn(
              "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded-sm transition-colors",
              readOnly && "cursor-default"
            )}
            aria-label={`Rate ${i + 1} out of ${max}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "fill-current transition-colors",
                getStarFill(i),
                !readOnly && "hover:scale-110 transition-transform"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-muted-foreground ml-1">
          {value > 0 ? `${value.toFixed(1)}/${max}` : ""}
        </span>
      )}
    </div>
  );
}

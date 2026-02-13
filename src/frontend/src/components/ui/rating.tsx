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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (!readOnly && onChange) {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const halfWidth = rect.width / 2;
      
      // If clicked on left half, add 0.5, otherwise add 1.0
      const rating = clickX < halfWidth ? index + 0.5 : index + 1;
      onChange(rating);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (!readOnly) {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const halfWidth = rect.width / 2;
      
      // Show hover for half or full star
      const hoverRating = mouseX < halfWidth ? index + 0.5 : index + 1;
      setHoverValue(hoverRating);
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
            onClick={(e) => handleClick(e, i)}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onMouseEnter={() => handleMouseEnter(i)}
            disabled={readOnly}
            className={cn(
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-offset-1 rounded-sm transition-colors",
              readOnly && "cursor-default"
            )}
            aria-label={`Rate ${i + 0.5} to ${i + 1} out of ${max}`}
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

"use client";

import { Slot } from "@radix-ui/react-slot";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
  asChild?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  asChild = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus:ring-brand-600 rounded-full",
    secondary:
      "bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-600 rounded-full",
    outline:
      "border border-neutral-600 text-white hover:bg-neutral-900 focus:ring-neutral-600 bg-transparent rounded-full",
    ghost:
      "text-neutral-400 hover:text-brand-600 hover:bg-brand-900/10 rounded-full",
  };

  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={`${baseStyles} ${variants[variant]} ${className}`}
      aria-disabled={asChild ? disabled || isLoading : undefined}
      {...(!asChild && { disabled: disabled || isLoading })}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </Component>
  );
};

export default Button;

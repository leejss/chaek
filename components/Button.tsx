"use client";

import { Slot } from "@radix-ui/react-slot";
import type React from "react";

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
    "inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
    outline: "border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-50",
    ghost: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50",
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
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
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
          {children}
        </span>
      ) : (
        children
      )}
    </Component>
  );
};

export default Button;

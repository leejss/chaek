"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "./Button";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onLogout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      isLoading={isLoading}
      onClick={onLogout}
      className="px-3"
      aria-label="Logout"
      title="Logout"
    >
      <span className="inline-flex items-center gap-2">
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </span>
    </Button>
  );
}

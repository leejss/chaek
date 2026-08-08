"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

export function RouteDialog({
  ariaLabelledBy,
  children,
}: {
  ariaLabelledBy: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) {
          router.back();
        }
      }}
    >
      <DialogContent
        aria-labelledby={ariaLabelledBy}
        className="gap-0 rounded-2xl border bg-card p-6 text-card-foreground shadow-popover ring-0 sm:max-w-md sm:p-8"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

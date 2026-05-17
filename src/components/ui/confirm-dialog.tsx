"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  /** Anything clickable — wrapped in DialogTrigger via asChild */
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  /** Confirm button label, default "Lanjutkan" */
  confirmLabel?: string;
  /** Cancel button label, default "Batal" */
  cancelLabel?: string;
  /** Confirm button visual variant */
  variant?: ButtonProps["variant"];
  /**
   * Action to run when user clicks the confirm button. Can be a
   * Server Action (returning Promise<void>) or a sync handler. Dialog
   * closes only after the promise resolves so user sees the loading
   * state.
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Mobile-friendly confirm dialog using Radix primitives. Used for
 * destructive actions (delete expense, delete group). Centered on
 * viewport with safe-area padding so it never gets hidden behind the
 * floating bottom nav.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    try {
      setPending(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-float)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
          )}
        >
          <Dialog.Title className="text-lg font-semibold tracking-tight">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="lg" className="flex-1" disabled={pending}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={variant}
              size="lg"
              className="flex-1"
              loading={pending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

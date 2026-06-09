'use client';

import { useState, useCallback } from 'react';

interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'blue' | 'red' | 'green';
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmColor: 'blue' | 'red' | 'green';
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = useCallback(
    (
      message: string,
      onConfirm: () => void,
      options?: ConfirmDialogOptions
    ): void => {
      setDialog({
        isOpen: true,
        title: options?.title || 'Confirm',
        message,
        confirmText: options?.confirmText || 'OK',
        cancelText: options?.cancelText || 'Cancel',
        confirmColor: options?.confirmColor || 'blue',
        onConfirm: () => {
          onConfirm();
          setDialog(null);
        },
      });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  return {
    dialog,
    showConfirm,
    closeDialog,
  };
}


import { ReactNode, useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  icon,
  confirmIcon,
  confirmLabel = 'Logout',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div
    className="absolute inset-0 "
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
  />
  <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-6 text-center" style={{borderRadius:'12px'}}>
    
    {/* Icon */}
    <div className="flex justify-center mb-4">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
        {icon}
      </div>
    </div>

    {/* Title */}
    <h3 className="text-lg font-semibold text-gray-900">
      {title}
    </h3>

    {/* Message */}
    <p className="text-sm text-gray-500 mt-1 mb-3">
      {message}
    </p>

    {/* Buttons */}
    <div className="flex gap-3 mt-4">
      <button
        onClick={onCancel}
        className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition cursor-pointer"
        style={{borderRadius: '8px'}}
      >
        {cancelLabel}
      </button>

      <button
        ref={confirmRef}
        onClick={onConfirm}
        className="flex-1 py-2  bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer"
        style={{borderRadius: '8px'}}
      >
        {confirmIcon}
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
  );
}
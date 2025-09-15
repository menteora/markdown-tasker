import React from 'react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSecondaryAction?: () => void;
  title: string;
  confirmText?: string;
  secondaryText?: string;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, onSecondaryAction, title, confirmText = "Confirm", secondaryText, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-slate-300 mb-6">
          {children}
        </div>
        <div className="flex justify-end space-x-3">
          {onSecondaryAction && secondaryText && (
             <button onClick={onSecondaryAction} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
              {secondaryText}
            </button>
          )}
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;


import React, { useState, useRef, useEffect } from 'react';
import { X, KeyRound } from 'lucide-react';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
}

const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({ isOpen, onClose, onConfirm, title }) => {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onConfirm(password);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="text-slate-300 mb-6">
            <label htmlFor="supabase-password" className="block text-sm font-medium text-slate-300 mb-2">Supabase Password</label>
            <p className="text-xs text-slate-500 mb-2">Enter your Supabase user password to proceed. It will not be stored.</p>
            <input
              id="supabase-password"
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
              Cancel
            </button>
            <button type="submit" className="flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
              <KeyRound className="w-4 h-4" />
              <span>Confirm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupabaseAuthModal;

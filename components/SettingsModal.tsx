import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Partial<Settings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Email Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="senderName" className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
            <p className="text-xs text-slate-500 mb-2">This name is used in the task update note (e.g., "Reminder sent by...").</p>
            <input
              id="senderName"
              name="senderName"
              type="text"
              value={currentSettings.senderName}
              onChange={handleChange}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="emailPreamble" className="block text-sm font-medium text-slate-300 mb-1">Email Preamble</label>
            <p className="text-xs text-slate-500 mb-2">Text to appear before the task list. Use <code className="bg-slate-900 px-1 rounded">{'{userName}'}</code> as a placeholder for the assignee's name.</p>
            <textarea
              id="emailPreamble"
              name="emailPreamble"
              rows={4}
              value={currentSettings.emailPreamble}
              onChange={handleChange}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="emailPostamble" className="block text-sm font-medium text-slate-300 mb-1">Email Postamble</label>
             <p className="text-xs text-slate-500 mb-2">Text to appear after the task list.</p>
            <textarea
              id="emailPostamble"
              name="emailPostamble"
              rows={3}
              value={currentSettings.emailPostamble}
              onChange={handleChange}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button onClick={handleSave} className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

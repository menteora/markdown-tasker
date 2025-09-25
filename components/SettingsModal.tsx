
import React, { useState, useEffect } from 'react';
import { X, Save, HelpCircle } from 'lucide-react';
import type { Settings, User } from '../types';
import SupabaseHelpModal from './SupabaseHelpModal';
import { useProject } from '../contexts/ProjectContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, saveSettings, users } = useProject();
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'senderAlias' || name === 'ccAlias') {
      setCurrentSettings(prev => ({ ...prev, [name]: value || null }));
    } else if (type === 'number') {
      setCurrentSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setCurrentSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    saveSettings(currentSettings);
    alert("Settings saved!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">Email Reminder Settings</h3>
                <div className="space-y-6 pt-2">
                    {/* Email settings fields... */}
                    <div>
                        <label htmlFor="senderAlias" className="block text-sm font-medium text-slate-300 mb-1">Reminder Assignee</label>
                        <p className="text-xs text-slate-500 mb-2">Select a user to assign the reminder update note to.</p>
                        <select id="senderAlias" name="senderAlias" value={currentSettings.senderAlias ?? ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">None (Just a note)</option>
                            {users.map(user => (<option key={user.alias} value={user.alias}>{user.name} ({user.email})</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reminderMessage" className="block text-sm font-medium text-slate-300 mb-1">Reminder Update Note</label>
                        <p className="text-xs text-slate-500 mb-2">The text to add to a task's history when a reminder is sent.</p>
                        <input type="text" id="reminderMessage" name="reminderMessage" value={currentSettings.reminderMessage} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="emailCreationDateLabel" className="block text-sm font-medium text-slate-300 mb-1">Email Creation Date Label</label>
                        <p className="text-xs text-slate-500 mb-2">The label used for the task creation date in emails (e.g., "Created:", "Creato il:").</p>
                        <input type="text" id="emailCreationDateLabel" name="emailCreationDateLabel" value={currentSettings.emailCreationDateLabel} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="emailSubject" className="block text-sm font-medium text-slate-300 mb-1">Email Subject</label>
                        <p className="text-xs text-slate-500 mb-2">Use <code className="bg-slate-900 px-1 rounded">{'{projectTitle}'}</code> as a placeholder.</p>
                        <input type="text" id="emailSubject" name="emailSubject" value={currentSettings.emailSubject} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="ccAlias" className="block text-sm font-medium text-slate-300 mb-1">Default CC Assignee</label>
                        <p className="text-xs text-slate-500 mb-2">Optional. Select a user to CC on all reminder emails.</p>
                        <select id="ccAlias" name="ccAlias" value={currentSettings.ccAlias ?? ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">None</option>
                            {users.map(user => (<option key={user.alias} value={user.alias}>{user.name} ({user.email})</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="emailPreamble" className="block text-sm font-medium text-slate-300 mb-1">Email Preamble</label>
                        <p className="text-xs text-slate-500 mb-2">Use <code className="bg-slate-900 px-1 rounded">{'{userName}'}</code> as a placeholder.</p>
                        <textarea id="emailPreamble" name="emailPreamble" rows={4} value={currentSettings.emailPreamble} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="emailPostamble" className="block text-sm font-medium text-slate-300 mb-1">Email Postamble</label>
                        <p className="text-xs text-slate-500 mb-2">Text to appear after the task list.</p>
                        <textarea id="emailPostamble" name="emailPostamble" rows={3} value={currentSettings.emailPostamble} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="emailSignature" className="block text-sm font-medium text-slate-300 mb-1">Email Signature</label>
                        <p className="text-xs text-slate-500 mb-2">Use <code className="bg-slate-900 px-1 rounded">{'{senderName}'}</code> as a placeholder.</p>
                        <input type="text" id="emailSignature" name="emailSignature" value={currentSettings.emailSignature} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
            </div>

             <div>
                <h3 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2 flex items-center">
                    Cloud Backup Configuration (Supabase)
                    <button onClick={() => setIsHelpOpen(true)} className="ml-2 text-slate-400 hover:text-indigo-400" title="Setup Instructions">
                        <HelpCircle className="w-5 h-5"/>
                    </button>
                </h3>
                <div className="space-y-4 pt-2">
                    <div>
                        <label htmlFor="supabaseUrl" className="block text-sm font-medium text-slate-300 mb-1">Supabase URL</label>
                        <input type="url" id="supabaseUrl" name="supabaseUrl" value={currentSettings.supabaseUrl ?? ''} onChange={handleChange} placeholder="https://<project-ref>.supabase.co" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                    <div>
                        <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-slate-300 mb-1">Supabase Anon Key</label>
                        <input type="text" id="supabaseAnonKey" name="supabaseAnonKey" value={currentSettings.supabaseAnonKey ?? ''} onChange={handleChange} placeholder="eyJhbGciOi..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                    <div>
                        <label htmlFor="supabaseEmail" className="block text-sm font-medium text-slate-300 mb-1">Supabase User Email</label>
                        <input type="email" id="supabaseEmail" name="supabaseEmail" value={currentSettings.supabaseEmail ?? ''} onChange={handleChange} placeholder="you@example.com" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end mt-8 border-t border-slate-700 pt-6">
          <button onClick={handleSave} className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
            <Save className="w-5 h-5" />
            <span>Save All Settings</span>
          </button>
        </div>
      </div>
    </div>
    <SupabaseHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

export default SettingsModal;
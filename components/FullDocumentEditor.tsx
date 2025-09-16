
import React from 'react';
import { Save, X } from 'lucide-react';

interface FullDocumentEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const FullDocumentEditor: React.FC<FullDocumentEditorProps> = ({ content, onChange, onSave, onCancel }) => {
  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full flex-grow p-4 bg-slate-800 border border-slate-700 rounded-lg resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-300 text-sm leading-relaxed"
        autoFocus
      />
      <div className="flex justify-end items-center mt-4 space-x-3 flex-shrink-0">
        <button onClick={onCancel} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold flex items-center space-x-2">
          <X className="w-4 h-4" /><span>Cancel</span>
        </button>
        <button onClick={onSave} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold flex items-center space-x-2">
          <Save className="w-4 h-4" /><span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};

export default FullDocumentEditor;

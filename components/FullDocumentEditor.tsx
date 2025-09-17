

import React, { useRef, useState, useCallback } from 'react';
import { Save, X } from 'lucide-react';
import type { User } from '../types';
import Toolbar from './Toolbar';
import InputModal from './InputModal';

interface FullDocumentEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onCancel: () => void;
  users: User[];
}

const FullDocumentEditor: React.FC<FullDocumentEditorProps> = ({ content, onChange, onSave, onCancel, users }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{
      onSubmit: (value: string) => void;
      title: string;
      label: string;
      confirmText: string;
  } | null>(null);

  const handleInsertTextAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const newText = content.substring(0, selectionStart) + text + content.substring(selectionEnd);
    
    onChange(newText);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, onChange]);

  const handleFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task' | 'update') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = content.substring(selectionStart, selectionEnd);
    
    if (type === 'link') {
        setInputModalConfig({
            title: 'Insert Link',
            label: 'Enter the URL:',
            confirmText: 'Insert Link',
            onSubmit: (url) => {
                const charBefore = selectionStart > 0 ? content[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < content.length ? content[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';
                
                const linkText = selectedText || '🔗';
                const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[${linkText}](${safeUrl})` + spaceAfter;
                const newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
                onChange(newText);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const selStart = selectionStart + spaceBefore.length + 1;
                        const selEnd = selStart + linkText.length;
                        textareaRef.current.setSelectionRange(selStart, selEnd);
                    }
                }, 0);
            }
        });
        setIsInputModalOpen(true);
        return;
    }

    if (type === 'gmail') {
        setInputModalConfig({
            title: 'Insert Gmail Link',
            label: 'Enter the email subject:',
            confirmText: 'Create Link',
            onSubmit: (subject) => {
                const charBefore = selectionStart > 0 ? content[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < content.length ? content[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';

                const encodedQuery = encodeURIComponent(`subject:"${subject}"`);
                const searchUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
                const safeSearchUrl = searchUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[📨 ${subject}](${safeSearchUrl})` + spaceAfter;
                const newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
                onChange(newText);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const newCursorPos = selectionStart + insertion.length;
                        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                    }
                }, 0);
            }
        });
        setIsInputModalOpen(true);
        return;
    }


    let prefix = '';
    let suffix = '';
    let insertion = '';
    let newCursorPos = -1;
    
    switch (type) {
        case 'h1': prefix = '# '; break;
        case 'h2': prefix = '## '; break;
        case 'h3': prefix = '### '; break;
        case 'bold': prefix = '**'; suffix = '**'; break;
        case 'italic': prefix = '*'; suffix = '*'; break;
        case 'ul': prefix = '- '; break;
        case 'task': prefix = '- [ ] '; break;
        case 'update': {
            const today = new Date().toISOString().split('T')[0];
            const textBeforeCursor = content.substring(0, selectionStart);
            const atStartOfLine = selectionStart === 0 || textBeforeCursor.endsWith('\n');
            insertion = `${atStartOfLine ? '' : '\n'}  - ${today}: `;
            newCursorPos = selectionStart + insertion.length;
            break;
        }
    }

    let newText;
    if (insertion) {
        newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
    } else {
        newText = content.substring(0, selectionStart) + prefix + selectedText + suffix + content.substring(selectionEnd);
    }

    onChange(newText);
    
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            if (newCursorPos !== -1) {
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            } else if (selectedText.length === 0) {
                 const cursorPos = selectionStart + prefix.length;
                textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            } else {
                 textareaRef.current.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length);
            }
        }
    }, 0);

  }, [content, onChange]);


  return (
    <>
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex-shrink-0">
          <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={users} />
        </div>
        <textarea
          ref={textareaRef}
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
      {isInputModalOpen && inputModalConfig && (
          <InputModal
              isOpen={isInputModalOpen}
              onClose={() => setIsInputModalOpen(false)}
              onSubmit={inputModalConfig.onSubmit}
              title={inputModalConfig.title}
              label={inputModalConfig.label}
              confirmText={inputModalConfig.confirmText}
          />
      )}
    </>
  );
};

export default FullDocumentEditor;

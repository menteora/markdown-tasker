


import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import type { User, Task } from '../types';
import Toolbar from './Toolbar';
import { useProject } from '../contexts/ProjectContext';
import InputModal from './InputModal';
import DatePickerModal from './DatePickerModal';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ isOpen, onClose, task }) => {
  const { users, markdown, updateTaskBlock } = useProject();
  
  const initialContent = useMemo(() => {
    const lines = markdown.split('\n');
    const originalLineCount = task.blockEndLine - task.lineIndex + 1;
    return lines.slice(task.lineIndex, task.lineIndex + originalLineCount).join('\n');
  }, [markdown, task]);

  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{
      onSubmit: (value: string) => void;
      title: string;
      label: string;
      confirmText: string;
  } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 100);
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const handleSave = () => {
    const originalLineCount = task.blockEndLine - task.lineIndex + 1;
    updateTaskBlock(task.lineIndex, originalLineCount, content, false);
    onClose();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  const handleInsertTextAtCursor = useCallback((text: string, type?: 'assignee') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart } = textarea;

    if (type === 'assignee') {
        const textBeforeCursor = content.substring(0, selectionStart);
        const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        
        let lineEnd = content.indexOf('\n', selectionStart);
        if (lineEnd === -1) lineEnd = content.length;

        let currentLine = content.substring(lineStart, lineEnd);
        
        const globalAssigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/g;
        currentLine = currentLine.replace(globalAssigneeRegex, '');

        const newCurrentLine = currentLine.trimEnd() + ' ' + text;

        const newContent = content.substring(0, lineStart) + newCurrentLine + content.substring(lineEnd);
        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = lineStart + newCurrentLine.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        return;
    }

    const { selectionEnd } = textarea;
    const charBefore = selectionStart > 0 ? content[selectionStart - 1] : '\n';
    const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
    const insertion = `${spaceBefore}${text}`;

    const newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
    
    setContent(newText);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  const handleDateSelect = useCallback((date: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const charBefore = selectionStart > 0 ? content[selectionStart - 1] : '\n';
    const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
    const insertion = `${spaceBefore}!${date}`;

    const newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
    setContent(newText);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  const handleFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task' | 'update' | 'dueDate') => {
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
                setContent(newText);

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
                setContent(newText);

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

    if (type === 'dueDate') {
        setIsDatePickerOpen(true);
        return;
    }


    let prefix = '';
    let suffix = '';
    let insertion = '';
    let newCursorPos = -1;
    let newText;
    
    switch (type) {
        case 'h1': prefix = '# '; break;
        case 'h2': prefix = '## '; break;
        case 'h3': prefix = '### '; break;
        case 'bold': prefix = '**'; suffix = '**'; break;
        case 'italic': prefix = '*'; suffix = '*'; break;
        case 'ul': prefix = '- '; break;
        case 'task': {
            const today = new Date().toISOString().split('T')[0];
            if (selectionStart !== selectionEnd) {
                const newLines = selectedText.split('\n').map(line => {
                    if (line.trim() === '') return line;
                    if (line.trim().match(/^[-*] \[( |x)\]/)) return line;
                    return `- [ ] ${line.trim()} +${today}`;
                }).join('\n');
                
                newText = content.substring(0, selectionStart) + newLines + content.substring(selectionEnd);
                setContent(newText);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(selectionStart + newLines.length, selectionStart + newLines.length);
                    }
                }, 0);
                return;
            } else {
                const textBeforeCursor = content.substring(0, selectionStart);
                const atEndOfNonEmptyLine = selectionStart > 0 && content[selectionStart - 1] !== '\n';
                prefix = (atEndOfNonEmptyLine ? '\n' : '') + '- [ ] ';
                suffix = ` +${today}`;
            }
            break;
        }
        case 'update': {
            const today = new Date().toISOString().split('T')[0];
            const textBeforeCursor = content.substring(0, selectionStart);
            const atStartOfLine = selectionStart === 0 || textBeforeCursor.endsWith('\n');
            insertion = `${atStartOfLine ? '' : '\n'}  - ${today}: `;
            newCursorPos = selectionStart + insertion.length;
            break;
        }
    }

    if (insertion) {
        newText = content.substring(0, selectionStart) + insertion + content.substring(selectionEnd);
    } else {
        newText = content.substring(0, selectionStart) + prefix + selectedText + suffix + content.substring(selectionEnd);
    }

    setContent(newText);
    
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

  }, [content]);
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 border border-slate-700 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-slate-100">Edit Task</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto pr-2">
            <div className="mb-2">
              <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={users} />
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
            />
          </div>
          <div className="flex justify-end mt-4 space-x-3 flex-shrink-0 border-t border-slate-700 pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
              Cancel
            </button>
            <button onClick={handleSave} className="flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
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
      <DatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDate={handleDateSelect}
          title="Select Due Date"
          confirmText="Insert Date"
      />
    </>
  );
};

export default TaskEditModal;
import React, { useRef, useCallback } from 'react';
import Toolbar from './Toolbar';
import type { User } from '../types';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
}

const Editor: React.FC<EditorProps> = ({ value, onChange, users }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    
    const newValue = `${before}${text}${after}`;
    const newCursorPos = selectionStart + text.length;

    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const applyFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'h1' | 'h2' | 'h3' | 'ul' | 'task') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selectedText = value.substring(selectionStart, selectionEnd);

    let newValue: string;
    let newSelectionStart: number;
    let newSelectionEnd: number;

    const blockSyntaxMap: Record<string, string> = {
      h1: '# ',
      h2: '## ',
      h3: '### ',
      ul: '- ',
      task: '- [ ] ',
    };
    
    if (['h1', 'h2', 'h3', 'ul', 'task'].includes(type)) {
      const syntax = blockSyntaxMap[type];
      const lineStartIndex = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineEndIndex = value.indexOf('\n', lineStartIndex);
      const currentLineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const currentLine = value.substring(lineStartIndex, currentLineEnd);
      
      const beforeLine = value.substring(0, lineStartIndex);
      const afterLine = value.substring(currentLineEnd);

      // Simple toggle logic for block elements
      if (currentLine.startsWith(syntax)) {
        const newLine = currentLine.substring(syntax.length);
        newValue = `${beforeLine}${newLine}${afterLine}`;
        newSelectionStart = newSelectionEnd = selectionStart - syntax.length;
      } else {
        const newLine = `${syntax}${currentLine}`;
        newValue = `${beforeLine}${newLine}${afterLine}`;
        newSelectionStart = newSelectionEnd = selectionStart + syntax.length;
      }
    } else if (type === 'link') {
        const before = value.substring(0, selectionStart);
        const after = value.substring(selectionEnd);
        if (selectedText) {
            newValue = `${before}[${selectedText}](url)${after}`;
            newSelectionStart = selectionEnd + 3; // after '[selectedText]('
            newSelectionEnd = newSelectionStart + 3; // 'url'
        } else {
            newValue = `${before}[link text](url)${after}`;
            newSelectionStart = selectionStart + 1; // after '['
            newSelectionEnd = newSelectionStart + 9; // 'link text'
        }
    } else { // Inline formats like bold/italic
      const syntax = type === 'bold' ? '**' : '*';
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);

      if (selectedText) {
        newValue = `${before}${syntax}${selectedText}${syntax}${after}`;
        newSelectionStart = selectionStart + syntax.length;
        newSelectionEnd = selectionEnd + syntax.length;
      } else {
        newValue = `${before}${syntax}${syntax}${after}`;
        newSelectionStart = newSelectionEnd = selectionStart + syntax.length;
      }
    }

    onChange(newValue);

    // Restore focus and selection after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
    }, 0);

  }, [value, onChange]);


  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <Toolbar onFormat={applyFormat} onInsert={handleInsert} users={users} />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full flex-grow p-4 bg-slate-800 border border-slate-700 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-300 text-sm leading-relaxed"
        placeholder="Type your markdown here..."
        aria-label="Markdown Editor"
      />
    </div>
  );
};

export default Editor;
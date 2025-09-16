
import React, { useRef, useCallback, useEffect, useState } from 'react';
import Toolbar from './Toolbar';
import type { User } from '../types';
import { X, Link as LinkIcon, Mail } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  forwardedRef: React.RefObject<HTMLTextAreaElement>;
  onHeadingClick: (relativeLine: number) => void;
}

const LinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('https://');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConfirm(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">Insert Link</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="url-input" className="block text-sm font-medium text-slate-300 mb-2">
            Enter URL
          </label>
          <input
            ref={inputRef}
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold">
              Cancel
            </button>
            <button type="submit" className="flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold">
              <LinkIcon className="w-4 h-4" />
              <span>Insert Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GmailLinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subject: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [subject, setSubject] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim()) {
      onConfirm(subject);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">Insert Gmail Search Link</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="subject-input" className="block text-sm font-medium text-slate-300 mb-2">
            Enter the Gmail email subject here
          </label>
          <input
            ref={inputRef}
            id="subject-input"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
            placeholder="e.g., Modello servizi Master"
          />
          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold">
              Cancel
            </button>
            <button type="submit" className="flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold">
              <Mail className="w-4 h-4" />
              <span>Insert Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Editor: React.FC<EditorProps> = ({ value, onChange, users, forwardedRef, onHeadingClick }) => {
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isGmailLinkModalOpen, setIsGmailLinkModalOpen] = useState(false);
  const linkSelectionRef = useRef<{ start: number, end: number } | null>(null);

  useEffect(() => {
    const textarea = forwardedRef.current;
    if (textarea && selectionRef.current) {
      textarea.focus();
      textarea.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
      selectionRef.current = null;
    }
  }, [value, forwardedRef]);


  const handleInsert = useCallback((text: string) => {
    const textarea = forwardedRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    
    const newValue = `${before}${text}${after}`;
    const newCursorPos = selectionStart + text.length;

    selectionRef.current = { start: newCursorPos, end: newCursorPos };
    onChange(newValue);
    
  }, [value, onChange, forwardedRef]);

   const handleLinkInsert = (url: string) => {
    const textarea = forwardedRef.current;
    if (!textarea || !linkSelectionRef.current) return;

    const { start: selectionStart, end: selectionEnd } = linkSelectionRef.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    
    let replacement = '';
    let newSelectionStart = 0;
    let newSelectionEnd = 0;

    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    
    if (selectedText) {
        replacement = `[${selectedText}](${url})`;
        newSelectionStart = selectionStart + 1; // select the text inside []
        newSelectionEnd = newSelectionStart + selectedText.length;
    } else {
        replacement = `[link text](${url})`;
        newSelectionStart = selectionStart + 1; // select "link text"
        newSelectionEnd = newSelectionStart + 'link text'.length;
    }
    
    const newValue = `${before}${replacement}${after}`;

    selectionRef.current = { start: newSelectionStart, end: newSelectionEnd };
    onChange(newValue);
    setIsLinkModalOpen(false);
  };

  const handleGmailLinkInsert = (subject: string) => {
    const textarea = forwardedRef.current;
    if (!textarea || !linkSelectionRef.current) return;

    const { start: selectionStart } = linkSelectionRef.current;
    
    const trimmedSubject = subject.trim();
    // Sanitize parentheses for markdown compatibility, and spaces for URL
    const encodedSubject = trimmedSubject
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/ /g, '+');
      
    const url = `https://mail.google.com/mail/u/0/#search/subject%3A%22${encodedSubject}%22`;
    const replacement = `[✉️ ${trimmedSubject}](${url})`;

    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionStart);
    
    const newValue = `${before}${replacement}${after}`;
    const newCursorPos = selectionStart + replacement.length;

    selectionRef.current = { start: newCursorPos, end: newCursorPos };
    onChange(newValue);
    setIsGmailLinkModalOpen(false);
  };

  const applyFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task') => {
    const textarea = forwardedRef.current;
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

      if (currentLine.trim().startsWith(syntax.trim())) {
        let newLine = currentLine.replace(syntax, '');
        if (type === 'task') {
            const dateRegex = /\s\+\d{4}-\d{2}-\d{2}/;
            newLine = newLine.replace(dateRegex, '').trim();
        }
        newValue = `${beforeLine}${newLine}${afterLine}`;
        newSelectionStart = newSelectionEnd = Math.max(lineStartIndex, selectionStart - syntax.length);
      } else {
        let newLine;
        if(type === 'task') {
            const today = new Date().toISOString().split('T')[0];
            newLine = `${syntax}${currentLine.trim()} +${today}`;
        } else {
            newLine = `${syntax}${currentLine}`;
        }
        newValue = `${beforeLine}${newLine}${afterLine}`;
        newSelectionStart = newSelectionEnd = selectionStart + syntax.length;
      }
    } else if (type === 'link') {
        linkSelectionRef.current = { start: selectionStart, end: selectionEnd };
        setIsLinkModalOpen(true);
        return;
    } else if (type === 'gmail') {
        linkSelectionRef.current = { start: selectionStart, end: selectionEnd };
        setIsGmailLinkModalOpen(true);
        return;
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

    selectionRef.current = { start: newSelectionStart, end: newSelectionEnd };
    onChange(newValue);

  }, [value, onChange, forwardedRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const rect = textarea.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // A simple approximation of line height
    const lineHeight = textarea.scrollHeight / value.split('\n').length;
    if (lineHeight > 0) {
      const line = Math.floor((y + textarea.scrollTop) / lineHeight);
      const lineText = value.split('\n')[line];
      if (lineText && /^#+ /.test(lineText)) {
        textarea.style.cursor = 'pointer';
      } else {
        textarea.style.cursor = 'text';
      }
    }
  }, [value]);
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const lineIndex = value.substring(0, textarea.selectionStart).split('\n').length - 1;
    const lineText = value.split('\n')[lineIndex];
    if (lineText && /^#+ /.test(lineText)) {
      onHeadingClick(lineIndex);
    }
  }, [value, onHeadingClick]);


  return (
    <div className="h-full p-4 flex flex-col">
      <div className="flex-shrink-0 mb-4">
        <Toolbar onFormat={applyFormat} onInsert={handleInsert} users={users} />
      </div>
      <div className="flex-grow relative min-h-0">
        <textarea
            ref={forwardedRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            className="absolute inset-0 w-full h-full p-4 bg-slate-800 border border-slate-700 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-300 text-sm leading-relaxed"
            placeholder="Type your markdown here..."
            aria-label="Markdown Editor"
        />
      </div>
       <LinkModal
            isOpen={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            onConfirm={handleLinkInsert}
        />
        <GmailLinkModal
            isOpen={isGmailLinkModalOpen}
            onClose={() => setIsGmailLinkModalOpen(false)}
            onConfirm={handleGmailLinkInsert}
        />
    </div>
  );
};

export default Editor;

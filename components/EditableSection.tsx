

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { User, TaskUpdate, Task } from '../types';
import { Section } from '../hooks/useSectionParser';
import Toolbar from './Toolbar';
import { Pencil, Save, X, CheckCircle2, CalendarDays } from 'lucide-react';
import InputModal from './InputModal';
import DatePickerModal from './DatePickerModal';


// Autocomplete Component for @ mentions
interface MentionAutocompleteProps {
  users: User[];
  position: { top: number; left: number };
  onSelect: (user: User) => void;
  activeIndex: number;
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({ users, position, onSelect, activeIndex }) => {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest'
        });
    }, [activeIndex]);

    return (
        <div
            ref={listRef}
            className="absolute bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 p-1 w-64 max-h-60 overflow-y-auto"
            style={{ top: position.top, left: position.left }}
            aria-live="polite"
        >
            {users.map((user, index) => (
                <button
                    key={user.alias}
                    data-index={index}
                    onClick={() => onSelect(user)}
                    className={`w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md ${
                        activeIndex === index ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-200'
                    }`}
                    role="option"
                    aria-selected={activeIndex === index}
                >
                    <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                    <div>
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-slate-400 ml-2">@{user.alias}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};


// Re-usable parsing functions and components
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) return <a key={index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{linkMatch[1]}</a>;
    return part;
  });
};

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => <>{parseInlineMarkdown(text)}</>;

// InteractiveTaskItem Component
const InteractiveTaskItem: React.FC<{
  task: Task;
  taskBlockContent: string;
  blockLineCount: number;
  absoluteStartLine: number;
  onToggle: (absoluteLineIndex: number, isCompleted: boolean) => void;
  onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
  users: User[];
}> = ({ task, taskBlockContent, blockLineCount, absoluteStartLine, onToggle, onUpdateTaskBlock, users }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(taskBlockContent);
  const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);
  const assignee = task.assigneeAlias ? userByAlias.get(task.assigneeAlias) : null;
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
    if (!isEditing) {
      setEditedContent(taskBlockContent);
    }
  }, [taskBlockContent, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
        const end = textareaRef.current.value.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(end, end);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editedContent]);

  const handleSave = () => {
    onUpdateTaskBlock(absoluteStartLine, blockLineCount, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(taskBlockContent);
    setIsEditing(false);
  };
  
  const handleInsertTextAtCursor = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
        const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
        const insertion = `${spaceBefore}${text}`;
        
        const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
        
        setEditedContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = selectionStart + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [editedContent]);

      const handleDateSelect = useCallback((date: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
        const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
        const insertion = `${spaceBefore}!${date}`;

        const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
        setEditedContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = selectionStart + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [editedContent]);


  const handleFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task' | 'update' | 'dueDate') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = editedContent.substring(selectionStart, selectionEnd);
    
    if (type === 'link') {
        setInputModalConfig({
            title: 'Insert Link',
            label: 'Enter the URL:',
            confirmText: 'Insert Link',
            onSubmit: (url) => {
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';
                
                const linkText = selectedText || '🔗';
                const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[${linkText}](${safeUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

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
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';

                const encodedQuery = encodeURIComponent(`subject:"${subject}"`);
                const searchUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
                const safeSearchUrl = searchUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[📨 ${subject}](${safeSearchUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

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
            if (selectionStart !== selectionEnd) { // Multi-line selection
                const newLines = selectedText.split('\n').map(line => {
                    if (line.trim() === '') return line;
                    if (line.trim().match(/^[-*] \[( |x)\]/)) return line;
                    return `- [ ] ${line.trim()} +${today}`;
                }).join('\n');
                
                newText = editedContent.substring(0, selectionStart) + newLines + editedContent.substring(selectionEnd);
                setEditedContent(newText);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(selectionStart + newLines.length, selectionStart + newLines.length);
                    }
                }, 0);
                return;
            } else { // Single-line insertion
                const textBeforeCursor = editedContent.substring(0, selectionStart);
                const atEndOfNonEmptyLine = selectionStart > 0 && editedContent[selectionStart - 1] !== '\n';
                prefix = (atEndOfNonEmptyLine ? '\n' : '') + '- [ ] ';
                suffix = ` +${today}`;
            }
            break;
        }
        case 'update': {
            const today = new Date().toISOString().split('T')[0];
            const textBeforeCursor = editedContent.substring(0, selectionStart);
            const atStartOfLine = selectionStart === 0 || textBeforeCursor.endsWith('\n');
            insertion = `${atStartOfLine ? '' : '\n'}  - ${today}: `;
            newCursorPos = selectionStart + insertion.length;
            break;
        }
    }

    if (insertion) {
        newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
    } else {
        newText = editedContent.substring(0, selectionStart) + prefix + selectedText + suffix + editedContent.substring(selectionEnd);
    }

    setEditedContent(newText);
    
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

  }, [editedContent]);


  const getDueDateInfo = (dateString: string | null, isCompleted: boolean): { pillColor: string; label: string } | null => {
      if (!dateString || isCompleted) return null;
      const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(`${dateString}T00:00:00`);
      const diffTime = due.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { pillColor: 'bg-red-500/20 text-red-400', label: `Overdue` };
      if (diffDays === 0) return { pillColor: 'bg-yellow-500/20 text-yellow-400', label: 'Due today' };
      return { pillColor: 'bg-slate-700/50 text-slate-300', label: `Due in ${diffDays} day(s)` };
  };
  const dueDateInfo = getDueDateInfo(task.dueDate, task.completed);
  
  if (isEditing) {
    return (
      <>
        <div className="py-2 border-b border-indigo-500/30 bg-slate-800/30 rounded-lg p-3 my-2">
          <div className="mb-2">
            <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={users} />
          </div>
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md resize-y focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
            autoFocus
          />
          <div className="flex justify-end items-center mt-2 space-x-2">
            <button onClick={handleCancel} className="px-3 py-1 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold text-sm flex items-center space-x-2"><X className="w-4 h-4"/><span>Cancel</span></button>
            <button onClick={handleSave} className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold text-sm flex items-center space-x-2"><Save className="w-4 h-4"/><span>Save</span></button>
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
  }

  return (
    <div className="py-2 border-b border-slate-800">
        <div className="flex items-start space-x-3 group">
            <input type="checkbox" checked={task.completed} onChange={(e) => onToggle(absoluteStartLine, e.target.checked)} className="h-5 w-5 rounded-md bg-slate-700 border-slate-600 text-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-1"/>
            <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`leading-snug ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      <InlineMarkdown text={task.text} />
                    </span>
                    {assignee && (
                      <div className="inline-flex items-center space-x-1.5 bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap" title={`Assigned to ${assignee.name}`}>
                        <img src={assignee.avatarUrl} alt={assignee.name} className="h-4 w-4 rounded-full" />
                        <span>{assignee.name}</span>
                      </div>
                    )}
                    {dueDateInfo && (
                      <div className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${dueDateInfo.pillColor}`} title={dueDateInfo.label}>
                        <CalendarDays className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                    )}
                     {task.cost !== undefined && (
                      <span className="inline-flex items-center font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap">
                        ${task.cost.toFixed(2)}
                      </span>
                    )}
                    {task.completionDate && task.completed && (
                      <div className="inline-flex items-center space-x-1 bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap" title={`Completed on ${task.completionDate}`}>
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>{task.completionDate}</span>
                      </div>
                    )}
                </div>
            </div>
            <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Edit task and updates">
              <Pencil className="w-4 h-4" />
            </button>
        </div>
        {task.updates.length > 0 && (
            <div className="pl-8 mt-3 space-y-2 border-l-2 border-slate-800 ml-2.5">
                {task.updates.map(update => {
                    const updateAssignee = update.assigneeAlias ? userByAlias.get(update.assigneeAlias) : null;
                    return (
                        <div key={update.lineIndex} className="flex items-center space-x-2 text-sm text-slate-400 w-full group">
                            {updateAssignee ? <img src={updateAssignee.avatarUrl} title={updateAssignee.name} className="w-5 h-5 rounded-full flex-shrink-0" alt={updateAssignee.name} /> : <div className="w-5 h-5 flex-shrink-0" />}
                            <span className="font-mono text-slate-500 whitespace-nowrap">{update.date}:</span>
                            <p className="flex-grow min-w-0"><InlineMarkdown text={update.text} /></p>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};

// The Main EditableSection Component
interface EditableSectionProps {
  section: Section;
  users: User[];
  onSectionUpdate: (startLine: number, endLine: number, newContent: string) => void;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
}

const EditableSection: React.FC<EditableSectionProps> = ({ section, onSectionUpdate, ...props }) => {
  const [isEditing, setIsEditing] = useState(() => !section.content.trim());
  const [editedContent, setEditedContent] = useState(section.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const userByAlias = useMemo(() => new Map(props.users.map(u => [u.alias, u])), [props.users]);
  
  // Input Modal state
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{
      onSubmit: (value: string) => void;
      title: string;
      label: string;
      confirmText: string;
  } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ top: number, left: number } | null>(null);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<User[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  useEffect(() => {
    setEditedContent(section.content);
  }, [section.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
        const end = textareaRef.current.value.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(end, end);
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editedContent]);
  
  useEffect(() => {
    if (mentionQuery === null) {
      setFilteredMentionUsers([]);
    }
  }, [mentionQuery]);


  const handleSave = () => {
    onSectionUpdate(section.startLine, section.endLine, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(section.content);
    setIsEditing(false);
  };

  const handleMentionSelect = useCallback((user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = editedContent.substring(0, cursorPosition);
    
    const newText = textBeforeCursor.replace(/@(\w*)$/, `(@${user.alias}) `) + editedContent.substring(cursorPosition);
    
    setEditedContent(newText);
    setMentionQuery(null);

    setTimeout(() => {
        const newCursorPos = textBeforeCursor.lastIndexOf('@') + user.alias.length + 4;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editedContent]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery === null || filteredMentionUsers.length === 0) return;

    if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowUp') {
            setActiveMentionIndex(prev => (prev > 0 ? prev - 1 : filteredMentionUsers.length - 1));
        } else if (e.key === 'ArrowDown') {
            setActiveMentionIndex(prev => (prev < filteredMentionUsers.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const user = filteredMentionUsers[activeMentionIndex];
            if (user) handleMentionSelect(user);
        } else if (e.key === 'Escape') {
            setMentionQuery(null);
        }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      const text = textarea.value;
      setEditedContent(text);

      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch && mirrorRef.current && textareaRef.current) {
          const query = mentionMatch[1].toLowerCase();
          
          const pre = text.substring(0, cursorPosition);
          mirrorRef.current.textContent = pre;
          const span = document.createElement('span');
          mirrorRef.current.appendChild(span);
          
          const { offsetLeft: left, offsetTop: top, offsetHeight: height } = span;
          
          setMentionPosition({ top: top + height - textarea.scrollTop, left: left - textarea.scrollLeft });
          setMentionQuery(query);
          
          const filtered = props.users.filter(user =>
              user.alias.toLowerCase().includes(query) ||
              user.name.toLowerCase().includes(query)
          );
          setFilteredMentionUsers(filtered);
          setActiveMentionIndex(0);
      } else {
          setMentionQuery(null);
      }
  };
  
    const handleInsertTextAtCursor = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
        const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
        const insertion = `${spaceBefore}${text}`;

        const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
        
        setEditedContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = selectionStart + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [editedContent]);

  const handleDateSelect = useCallback((date: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
    const spaceBefore = /\s$/.test(charBefore) ? '' : ' ';
    const insertion = `${spaceBefore}!${date}`;

    const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
    setEditedContent(newText);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editedContent]);

  const handleFormat = useCallback((type: 'bold' | 'italic' | 'link' | 'gmail' | 'h1' | 'h2' | 'h3' | 'ul' | 'task' | 'update' | 'dueDate') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = editedContent.substring(selectionStart, selectionEnd);
    
    if (type === 'link') {
        setInputModalConfig({
            title: 'Insert Link',
            label: 'Enter the URL:',
            confirmText: 'Insert Link',
            onSubmit: (url) => {
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';
                
                const linkText = selectedText || '🔗';
                const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[${linkText}](${safeUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

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
                const charBefore = selectionStart > 0 ? editedContent[selectionStart - 1] : '\n';
                const charAfter = selectionEnd < editedContent.length ? editedContent[selectionEnd] : '\n';
                const spaceBefore = /^\s$/.test(charBefore) ? '' : ' ';
                const spaceAfter = /^\s$/.test(charAfter) ? '' : ' ';

                const encodedQuery = encodeURIComponent(`subject:"${subject}"`);
                const searchUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
                const safeSearchUrl = searchUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
                const insertion = spaceBefore + `[📨 ${subject}](${safeSearchUrl})` + spaceAfter;
                const newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
                setEditedContent(newText);

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
            if (selectionStart !== selectionEnd) { // Multi-line selection
                const newLines = selectedText.split('\n').map(line => {
                    if (line.trim() === '') return line;
                    if (line.trim().match(/^[-*] \[( |x)\]/)) return line;
                    return `- [ ] ${line.trim()} +${today}`;
                }).join('\n');
                
                newText = editedContent.substring(0, selectionStart) + newLines + editedContent.substring(selectionEnd);
                setEditedContent(newText);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        textareaRef.current.setSelectionRange(selectionStart + newLines.length, selectionStart + newLines.length);
                    }
                }, 0);
                return;
            } else { // Single-line insertion
                const textBeforeCursor = editedContent.substring(0, selectionStart);
                const atEndOfNonEmptyLine = selectionStart > 0 && editedContent[selectionStart - 1] !== '\n';
                prefix = (atEndOfNonEmptyLine ? '\n' : '') + '- [ ] ';
                suffix = ` +${today}`;
            }
            break;
        }
        case 'update': {
            const today = new Date().toISOString().split('T')[0];
            const textBeforeCursor = editedContent.substring(0, selectionStart);
            const atStartOfLine = selectionStart === 0 || textBeforeCursor.endsWith('\n');
            insertion = `${atStartOfLine ? '' : '\n'}  - ${today}: `;
            newCursorPos = selectionStart + insertion.length;
            break;
        }
    }

    if (insertion) {
        newText = editedContent.substring(0, selectionStart) + insertion + editedContent.substring(selectionEnd);
    } else {
        newText = editedContent.substring(0, selectionStart) + prefix + selectedText + suffix + editedContent.substring(selectionEnd);
    }

    setEditedContent(newText);
    
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

  }, [editedContent]);

  const renderPreviewContent = () => {
    const lines = section.content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const absoluteLineIndex = section.startLine + i;

      const hMatch = line.match(/^(#+) (.*)/);
      if (hMatch) {
          const level = hMatch[1].length;
          const text = hMatch[2].trim();
          let className = "font-bold ";
          if (level === 1) className += "text-3xl mt-6 mb-3 pb-2 border-b border-slate-700";
          else if (level === 2) className += "text-2xl mt-5 mb-2";
          else if (level === 3) className += "text-xl mt-4 mb-1";
          elements.push(React.createElement(`h${level}`, { key: i, className }, <InlineMarkdown text={text} />));
          i++; continue;
      }
      
      const taskMatch = line.match(/^- \[( |x)\] (.*)/);
      if (taskMatch) {
          let fullTaskText = taskMatch[2]; let assignee: User | null = null; let completionDate: string | null = null; let creationDate: string | null = null; let cost: number | undefined = undefined; let dueDate: string | null = null;
          const dateMatch = fullTaskText.match(/\s~([0-9]{4}-[0-9]{2}-[0-9]{2})/); if (dateMatch) { completionDate = dateMatch[1]; fullTaskText = fullTaskText.replace(dateMatch[0], '').trim(); }
          const costMatch = fullTaskText.match(/\s\(\$(\d+(\.\d{1,2})?)\)/); if (costMatch) { cost = parseFloat(costMatch[1]); fullTaskText = fullTaskText.replace(costMatch[0], '').trim(); }
          const assigneeMatch = fullTaskText.match(/\s\(@([a-zA-Z0-9_]+)\)/); if (assigneeMatch) { assignee = userByAlias.get(assigneeMatch[1]) || null; fullTaskText = fullTaskText.replace(assigneeMatch[0], '').trim(); }
          const creationDateMatch = fullTaskText.match(/\s\+([0-9]{4}-[0-9]{2}-[0-9]{2})/); if (creationDateMatch) { creationDate = creationDateMatch[1]; fullTaskText = fullTaskText.replace(creationDateMatch[0], '').trim(); }
          const dueDateMatch = fullTaskText.match(/\s!([0-9]{4}-[0-9]{2}-[0-9]{2})/); if (dueDateMatch) { dueDate = dueDateMatch[1]; fullTaskText = fullTaskText.replace(dueDateMatch[0], '').trim(); }
          const updates: TaskUpdate[] = []; let j = i + 1;
          while (j < lines.length) {
              const updateLine = lines[j]; const updateMatch = updateLine.match(/^  - (\d{4}-\d{2}-\d{2}): (.*)/);
              if (updateMatch) {
                  let updateText = updateMatch[2].trim(); let updateAssigneeAlias: string | null = null;
                  const updateAssigneeMatch = updateText.match(/\s\(@([a-zA-Z0-9_]+)\)/); if(updateAssigneeMatch){ updateAssigneeAlias = updateAssigneeMatch[1]; updateText = updateText.replace(updateAssigneeMatch[0], '').trim(); }
                  updates.push({ lineIndex: section.startLine + j, date: updateMatch[1], text: updateText, assigneeAlias: updateAssigneeAlias }); j++;
              } else { if (updateLine.trim() !== '') break; j++; }
          }
          const task: Task = {
            lineIndex: absoluteLineIndex, text: fullTaskText, completed: taskMatch[1] === 'x', assigneeAlias: assignee?.alias ?? null,
            creationDate, completionDate, dueDate, updates, projectTitle: '', cost,
          };

          elements.push(
            <InteractiveTaskItem 
                key={i} 
                task={task}
                taskBlockContent={lines.slice(i, j).join('\n')}
                blockLineCount={j - i}
                absoluteStartLine={absoluteLineIndex}
                onToggle={props.onToggle}
                onUpdateTaskBlock={props.onUpdateTaskBlock}
                users={props.users} 
            />
          );
          i = j; continue;
      }
      
      const ulMatch = line.match(/^[-*] (.*)/); if (ulMatch) elements.push(<li key={i} className="ml-6 list-disc text-slate-300"><InlineMarkdown text={ulMatch[1]} /></li>);
      else if (line.trim() === '') elements.push(<div key={i} className="h-4"></div>);
      else elements.push(<p key={i} className="text-slate-300 my-2 leading-relaxed"><InlineMarkdown text={line} /></p>);
      i++;
    }
    return elements;
  }

  if (isEditing) {
    return (
      <>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/50">
          <Toolbar onFormat={handleFormat} onInsert={handleInsertTextAtCursor} users={props.users} />
          <div className="relative mt-4">
              <div 
                  ref={mirrorRef}
                  className="w-full min-h-[120px] p-4 font-mono text-slate-300 text-sm leading-relaxed invisible absolute top-0 left-0 whitespace-pre-wrap break-words pointer-events-none"
                  aria-hidden="true"
              ></div>
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                className="w-full min-h-[120px] p-4 bg-slate-800 border border-slate-700 rounded-lg resize-none overflow-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-300 text-sm leading-relaxed"
                autoFocus
              />
              {mentionQuery !== null && filteredMentionUsers.length > 0 && mentionPosition && (
                  <MentionAutocomplete 
                      users={filteredMentionUsers}
                      position={mentionPosition}
                      onSelect={handleMentionSelect}
                      activeIndex={activeMentionIndex}
                  />
              )}
          </div>
          <div className="flex justify-end items-center mt-4 space-x-3">
            <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold flex items-center space-x-2">
              <X className="w-4 h-4" /><span>Cancel</span>
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold flex items-center space-x-2">
              <Save className="w-4 h-4" /><span>Save</span>
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
        <DatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onSelectDate={handleDateSelect}
            title="Select Due Date"
            confirmText="Insert Date"
        />
      </>
    );
  }

  return (
    <div className="relative group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors duration-200">
       <button 
        onClick={() => setIsEditing(true)} 
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
        aria-label="Edit section"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <div className="p-4 prose-invert pb-8">
        {renderPreviewContent()}
      </div>
    </div>
  );
};

export default EditableSection;
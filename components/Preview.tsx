import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, TaskUpdate, Heading } from '../types';
import { Pencil, Trash2, MessageSquarePlus, X, User as UserIcon, ChevronsUpDown, Mail } from 'lucide-react';

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return <a key={index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{linkMatch[1]}</a>;
    }
    return part;
  });
};

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
    return <>{parseInlineMarkdown(text)}</>;
};

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H20.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H3.375Z" />
  </svg>
);

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
          <label htmlFor="subject-input-preview" className="block text-sm font-medium text-slate-300 mb-2">
            Email Subject
          </label>
          <input
            ref={inputRef}
            id="subject-input-preview"
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

const AddUpdateForm: React.FC<{ onAdd: (text: string, assigneeAlias: string | null) => void; users: User[] }> = ({ onAdd, users }) => {
    const [text, setText] = useState('');
    const [assigneeAlias, setAssigneeAlias] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isGmailLinkModalOpen, setIsGmailLinkModalOpen] = useState(false);
    
    const assignee = useMemo(() => users.find(u => u.alias === assigneeAlias), [users, assigneeAlias]);

     const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            user.alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim(), assigneeAlias);
            setText('');
            setAssigneeAlias(null);
        }
    };

    const handleGmailLinkInsert = (subject: string) => {
      const trimmedSubject = subject.trim();
      const encodedSubject = trimmedSubject
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/ /g, '+');
      
      const url = `https://mail.google.com/mail/u/0/#search/subject%3A%22${encodedSubject}%22`;
      const linkText = `[✉️ ${trimmedSubject}](${url})`;

      const textarea = textareaRef.current;
      if (textarea) {
          const { selectionStart, selectionEnd } = textarea;
          const currentText = text;
          const newText = 
              currentText.substring(0, selectionStart) + 
              linkText + 
              currentText.substring(selectionEnd);
          
          setText(newText);
          
          setTimeout(() => {
              textarea.focus();
              const newCursorPos = selectionStart + linkText.length;
              textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
      } else {
          setText(prev => prev + linkText);
      }
      setIsGmailLinkModalOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isDropdownOpen) setSearchTerm('');
    }, [isDropdownOpen]);

    const handleSelect = (alias: string | null) => {
        setAssigneeAlias(alias);
        setIsDropdownOpen(false);
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="flex items-start space-x-2 pt-3">
                <MessageSquarePlus className="h-5 w-5 text-slate-500 mt-2 flex-shrink-0" />
                <textarea
                    ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Add a new update..." rows={1}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-500"
                />
                <button type="button" onClick={() => setIsGmailLinkModalOpen(true)} className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors" title="Insert Gmail Link">
                    <Mail className="h-5 w-5 text-slate-400" />
                </button>
                <div className="relative" ref={dropdownRef}>
                    <button type="button" onClick={() => setIsDropdownOpen(p => !p)} className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors">
                        {assignee ? <img src={assignee.avatarUrl} alt={assignee.name} className="h-5 w-5 rounded-full" /> : <UserIcon className="h-5 w-5 text-slate-400" />}
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                            <div className="p-1">
                                <input
                                    type="text"
                                    placeholder="Search assignee..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sticky top-0 mb-1 px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredUsers.map(user => (
                                        <button type="button" key={user.alias} onClick={() => handleSelect(user.alias)} className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-700">
                                            <img src={user.avatarUrl} alt={user.name} className="h-5 w-5 rounded-full" />
                                            <span className="text-sm text-slate-200">{user.name}</span>
                                        </button>
                                    ))}
                                    {filteredUsers.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">No users found.</p>}
                                </div>
                                {(assignee || searchTerm) && <div className="border-t border-slate-700 my-1"></div>}
                                <button type="button" onClick={() => handleSelect(null)} className="w-full text-left text-sm text-slate-400 px-2 py-1.5 rounded-md hover:bg-slate-700">
                                    No Assignee
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold text-sm disabled:bg-slate-600 disabled:cursor-not-allowed"
                    disabled={!text.trim()} aria-label="Add Update">
                    Add
                </button>
            </form>
            <GmailLinkModal 
                isOpen={isGmailLinkModalOpen}
                onClose={() => setIsGmailLinkModalOpen(false)}
                onConfirm={handleGmailLinkInsert}
            />
        </>
    );
};

const TaskUpdateItem: React.FC<{
    update: TaskUpdate;
    onUpdate: (lineIndex: number, newDate: string, newText: string, newAlias: string | null) => void;
    onDelete: (lineIndex: number) => void;
    users: User[];
}> = ({ update, onUpdate, onDelete, users }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [date, setDate] = useState(update.date);
    const [text, setText] = useState(update.text);
    const [alias, setAlias] = useState(update.assigneeAlias);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);

    const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);
    const assignee = update.assigneeAlias ? userByAlias.get(update.assigneeAlias) : null;
    const currentAssignee = useMemo(() => users.find(u => u.alias === alias), [users, alias]);
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            user.alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
                setIsAssigneeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isAssigneeDropdownOpen) setSearchTerm('');
    }, [isAssigneeDropdownOpen]);

    const handleSave = () => {
        if (text.trim()){
            onUpdate(update.lineIndex, date, text.trim(), alias);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center space-x-2 text-sm w-full">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-1 text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none w-32"/>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-1 text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"/>
                
                <div className="relative" ref={assigneeDropdownRef}>
                    <button type="button" onClick={() => setIsAssigneeDropdownOpen(p => !p)} className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-md p-1 text-slate-300 w-40 text-left">
                        <span className="truncate">{currentAssignee?.name ?? 'No Assignee'}</span>
                        <ChevronsUpDown className="w-4 h-4 text-slate-400 ml-1 flex-shrink-0" />
                    </button>
                    {isAssigneeDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                            <div className="p-1">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sticky top-0 mb-1 px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <div className="max-h-40 overflow-y-auto">
                                    {filteredUsers.map(u => (
                                        <button type="button" key={u.alias} onClick={() => { setAlias(u.alias); setIsAssigneeDropdownOpen(false); }} className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-700">
                                            <img src={u.avatarUrl} alt={u.name} className="h-5 w-5 rounded-full" />
                                            <span className="text-sm text-slate-200">{u.name}</span>
                                        </button>
                                    ))}
                                    {filteredUsers.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">No users found.</p>}
                                </div>
                                <div className="border-t border-slate-700 my-1"></div>
                                <button type="button" onClick={() => { setAlias(null); setIsAssigneeDropdownOpen(false); }} className="w-full text-left text-sm text-slate-400 px-2 py-1.5 rounded-md hover:bg-slate-700">
                                    No Assignee
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleSave} className="p-1.5 rounded-md bg-green-600 hover:bg-green-700 transition-colors">Save</button>
                <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>
        );
    }

    return (
        <div className="group flex items-center space-x-2 text-sm text-slate-400 w-full">
            {assignee ? <img src={assignee.avatarUrl} title={assignee.name} className="w-5 h-5 rounded-full flex-shrink-0" /> : <div className="w-5 h-5 flex-shrink-0" />}
            <span className="font-mono text-slate-500 whitespace-nowrap">{update.date}:</span>
            <p className="flex-grow min-w-0"><InlineMarkdown text={update.text} /></p>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 flex-shrink-0">
                <button onClick={() => setIsEditing(true)} className="p-1 rounded-md hover:bg-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(update.lineIndex)} className="p-1 rounded-md hover:bg-slate-700 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        </div>
    );
};

interface InteractiveTaskItemProps {
  lineIndex: number; text: string; completed: boolean; assignee: User | null; creationDate: string | null; completionDate: string | null; updates: TaskUpdate[]; cost?: number;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onAssign: (lineIndex: number, userAlias: string | null) => void;
  onUpdateCompletionDate: (lineIndex: number, newDate: string) => void;
  onUpdateCreationDate: (lineIndex: number, newDate: string) => void;
  onAddTaskUpdate: (taskLineIndex: number, updateText: string, assigneeAlias: string | null) => void;
  onUpdateTaskUpdate: (updateLineIndex: number, newDate: string, newText: string, newAlias: string | null) => void;
  onDeleteTaskUpdate: (updateLineIndex: number) => void;
  users: User[];
}

const InteractiveTaskItem: React.FC<InteractiveTaskItemProps> = (props) => {
  const { lineIndex, text, completed, assignee, creationDate, completionDate, updates, cost, onToggle, onAssign, onUpdateCompletionDate, onUpdateCreationDate, onAddTaskUpdate, onUpdateTaskUpdate, onDeleteTaskUpdate, users } = props;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.alias.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) setSearchTerm('');
  }, [isDropdownOpen]);

  const handleSelect = (userAlias: string | null) => {
    onAssign(lineIndex, userAlias);
    setIsDropdownOpen(false);
  };
  
  return (
    <div className="py-2 border-b border-slate-800">
        <div className="flex items-center space-x-3 group">
            <input type="checkbox" checked={completed} onChange={(e) => onToggle(lineIndex, e.target.checked)} className="h-5 w-5 rounded-md bg-slate-700 border-slate-600 text-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 cursor-pointer"/>
            <span className={`flex-grow ${completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
              <InlineMarkdown text={text} />
              {cost !== undefined && (
                <span className="ml-2 text-xs font-semibold bg-green-200 text-green-800 px-2 py-0.5 rounded-full align-middle">
                  ${cost.toFixed(2)}
                </span>
              )}
            </span>
             {creationDate && !completed && (
                <input type="date" value={creationDate} onChange={(e) => onUpdateCreationDate(lineIndex, e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none" aria-label="Creation Date"/>
            )}
            {completed && completionDate && (
                <input type="date" value={completionDate} onChange={(e) => onUpdateCompletionDate(lineIndex, e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none" aria-label="Completion Date"/>
            )}
            <div className="relative">
                <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center justify-center px-2 py-1 rounded-md transition-colors duration-200 bg-slate-800 hover:bg-slate-700">
                    {assignee ? (
                        <div className="flex items-center space-x-2">
                        <img src={assignee.avatarUrl} alt={assignee.name} className="h-6 w-6 rounded-full" />
                        <span className="text-sm text-slate-300 font-medium">{assignee.name}</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1 text-slate-400">
                        <UserPlusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Assign</span>
                        </div>
                    )}
                </button>
                {isDropdownOpen && (
                    <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                        <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search assignee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full mb-2 px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <div className="text-xs text-slate-400 px-2 pb-1 font-semibold">Assign to...</div>
                        {filteredUsers.map(user => (
                            <button key={user.alias} onClick={() => handleSelect(user.alias)} className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-700">
                                <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                                <span className="text-sm text-slate-200">{user.name}</span>
                            </button>
                        ))}
                        {filteredUsers.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">No users found.</p>}
                        <div className="border-t border-slate-700 my-1"></div>
                        <button onClick={() => handleSelect(null)} className="w-full text-left text-sm text-slate-400 px-2 py-1.5 rounded-md hover:bg-slate-700">Unassign</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        {(updates.length > 0) && (
             <div className="pl-8 mt-3 space-y-2 border-l-2 border-slate-800 ml-2.5">
                {updates.map(update => (
                    <TaskUpdateItem key={update.lineIndex} update={update} onUpdate={onUpdateTaskUpdate} onDelete={onDeleteTaskUpdate} users={users} />
                ))}
            </div>
        )}
        <div className="pl-8">
            <AddUpdateForm onAdd={(text, alias) => onAddTaskUpdate(lineIndex, text, alias)} users={users} />
        </div>
    </div>
  );
};


interface PreviewProps {
  markdown: string;
  headings: Heading[];
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onAssign: (lineIndex: number, userAlias: string | null) => void;
  onUpdateCompletionDate: (lineIndex: number, newDate: string) => void;
  onUpdateCreationDate: (lineIndex: number, newDate: string) => void;
  onAddTaskUpdate: (taskLineIndex: number, updateText: string, assigneeAlias: string | null) => void;
  onUpdateTaskUpdate: (updateLineIndex: number, newDate: string, newText: string, newAlias: string | null) => void;
  onDeleteTaskUpdate: (updateLineIndex: number) => void;
  onHeadingClick: (slug: string) => void;
  users: User[];
  forwardedRef: React.RefObject<HTMLDivElement>;
}

const Preview: React.FC<PreviewProps> = (props) => {
  const { markdown, headings, onHeadingClick, users, forwardedRef } = props;
  const userByAlias = useMemo(() => new Map(users.map(u => [u.alias, u])), [users]);
  const headingsByLine = useMemo(() => new Map(headings.map(h => [h.line, h])), [headings]);

  const renderContent = () => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const relativeLineIndex = i;

      const headingInfo = headingsByLine.get(relativeLineIndex);
      if (headingInfo) {
          const commonProps = {
              key: relativeLineIndex,
              id: headingInfo.slug,
              onClick: () => onHeadingClick(headingInfo.slug),
          };
          const textNode = <InlineMarkdown text={headingInfo.text} />;
          let className = "cursor-pointer hover:text-indigo-400 transition-colors ";
          if (headingInfo.level === 1) className += "text-3xl font-bold mt-6 mb-3 pb-2 border-b border-slate-700";
          else if (headingInfo.level === 2) className += "text-2xl font-semibold mt-5 mb-2";
          else if (headingInfo.level === 3) className += "text-xl font-semibold mt-4 mb-1";
          
          elements.push(React.createElement(`h${headingInfo.level}`, { ...commonProps, className }, textNode));
          i++;
          continue;
      }
      
      const taskMatch = line.match(/^- \[( |x)\] (.*)/);
      if (taskMatch) {
        let fullTaskText = taskMatch[2];
        let assignee: User | null = null;
        let completionDate: string | null = null;
        let creationDate: string | null = null;
        let cost: number | undefined = undefined;
        
        const dateRegex = /\s~([0-9]{4}-[0-9]{2}-[0-9]{2})$/;
        const dateMatch = fullTaskText.match(dateRegex);
        if (dateMatch) {
            completionDate = dateMatch[1];
            fullTaskText = fullTaskText.replace(dateRegex, '').trim();
        }

        const costRegex = /\s\(\$(\d+(\.\d{1,2})?)\)$/;
        const costMatch = fullTaskText.match(costRegex);
        if (costMatch) {
          cost = parseFloat(costMatch[1]);
          fullTaskText = fullTaskText.replace(costRegex, '').trim();
        }

        const assigneeRegex = /\s\(@([a-zA-Z0-9_]+)\)/;
        const assigneeMatch = fullTaskText.match(assigneeRegex);
        if (assigneeMatch) {
          const alias = assigneeMatch[1];
          assignee = userByAlias.get(alias) || null;
          fullTaskText = fullTaskText.replace(assigneeRegex, '').trim();
        }
        
        const creationDateRegex = /\s\+([0-9]{4}-[0-9]{2}-[0-9]{2})/;
        const creationDateMatch = fullTaskText.match(creationDateRegex);
        if (creationDateMatch) {
            creationDate = creationDateMatch[1];
            fullTaskText = fullTaskText.replace(creationDateRegex, '').trim();
        }


        const updates: TaskUpdate[] = [];
        let j = i + 1;
        const updateRegex = /^  - (\d{4}-\d{2}-\d{2}): (.*)/;
        while (j < lines.length) {
            const updateLine = lines[j];
            const updateMatch = updateLine.match(updateRegex);
            if (updateMatch) {
                let updateText = updateMatch[2].trim();
                let updateAssigneeAlias: string | null = null;
                const updateAssigneeMatch = updateText.match(assigneeRegex);
                if (updateAssigneeMatch) {
                    updateAssigneeAlias = updateAssigneeMatch[1];
                    updateText = updateText.replace(assigneeRegex, '').trim();
                }

                updates.push({
                    lineIndex: j,
                    date: updateMatch[1],
                    text: updateText,
                    assigneeAlias: updateAssigneeAlias,
                });
                j++;
            } else {
                 if (updateLine.trim() !== '') {
                    break;
                 }
                 j++;
            }
        }

        elements.push(
          <InteractiveTaskItem key={i} lineIndex={i} text={fullTaskText} completed={taskMatch[1] === 'x'} assignee={assignee} creationDate={creationDate} completionDate={completionDate} updates={updates} cost={cost} {...props} />
        );
        i = j;
        continue;
      }
      
      const ulMatch = line.match(/^[-*] (.*)/); if (ulMatch) elements.push(<li key={i} className="ml-6 list-disc text-slate-300"><InlineMarkdown text={ulMatch[1]} /></li>);
      else if (line.trim() === '') elements.push(<div key={i} className="h-4"></div>);
      else elements.push(<p key={i} className="text-slate-300 my-2 leading-relaxed"><InlineMarkdown text={line} /></p>);
      
      i++;
    }
    return elements;
  };

  return (
    <div ref={forwardedRef} className="h-full p-8 overflow-y-auto prose-invert pb-32">
      {renderContent()}
    </div>
  );
};

export default Preview;
import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, ListTodo, UserPlus, Link } from 'lucide-react';
import type { User } from '../types';

type FormatType = 'bold' | 'italic' | 'link' | 'h1' | 'h2' | 'h3' | 'ul' | 'task';

interface ToolbarProps {
  onFormat: (type: FormatType) => void;
  onInsert: (text: string) => void;
  users: User[];
}

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ onFormat, onInsert, users }) => {
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssigneeSelect = (alias: string) => {
    onInsert(` (@${alias})`);
    setIsAssigneeDropdownOpen(false);
  };

  return (
    <div className="flex items-center space-x-1 bg-slate-800 p-2 rounded-lg border border-slate-700 text-slate-300">
      <ToolbarButton onClick={() => onFormat('h1')} label="Heading 1"><span className="font-bold text-sm w-5 h-5 flex items-center justify-center">H1</span></ToolbarButton>
      <ToolbarButton onClick={() => onFormat('h2')} label="Heading 2"><span className="font-bold text-sm w-5 h-5 flex items-center justify-center">H2</span></ToolbarButton>
      <ToolbarButton onClick={() => onFormat('h3')} label="Heading 3"><span className="font-bold text-sm w-5 h-5 flex items-center justify-center">H3</span></ToolbarButton>
      
      <div className="w-px h-6 bg-slate-700 mx-2"></div>
      
      <ToolbarButton onClick={() => onFormat('bold')} label="Bold"><Bold className="w-5 h-5" /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat('italic')} label="Italic"><Italic className="w-5 h-5" /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat('link')} label="Insert Link"><Link className="w-5 h-5" /></ToolbarButton>

      <div className="w-px h-6 bg-slate-700 mx-2"></div>

      <ToolbarButton onClick={() => onFormat('ul')} label="Unordered List"><List className="w-5 h-5" /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat('task')} label="Task List"><ListTodo className="w-5 h-5" /></ToolbarButton>
      
      <div className="w-px h-6 bg-slate-700 mx-2"></div>

       <div className="relative" ref={dropdownRef}>
        <ToolbarButton onClick={() => setIsAssigneeDropdownOpen(p => !p)} label="Assign User">
          <UserPlus className="w-5 h-5" />
        </ToolbarButton>
        {isAssigneeDropdownOpen && (
          <div className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
            <div className="p-2">
              <div className="text-xs text-slate-400 px-2 pb-1 font-semibold">Insert Assignee...</div>
              {users.map(user => (
                <button
                  key={user.alias}
                  onClick={() => handleAssigneeSelect(user.alias)}
                  className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-700"
                >
                  <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                  <span className="text-sm text-slate-200">{user.name}</span>
                  <span className="text-xs text-slate-400">@{user.alias}</span>
                </button>
              ))}
              {users.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">No assignees found.</p>}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Toolbar;
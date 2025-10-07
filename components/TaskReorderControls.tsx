import React from 'react';
import { ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react';

interface TaskReorderControlsProps {
  onReorder: (direction: 'up' | 'down' | 'top' | 'bottom') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const ReorderButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    title={title}
  >
    {children}
  </button>
);

const TaskReorderControls: React.FC<TaskReorderControlsProps> = ({ onReorder, canMoveUp, canMoveDown }) => {
  return (
    <div className="flex items-center border border-slate-700 bg-slate-800/50 rounded-md mr-1">
      <ReorderButton onClick={() => onReorder('top')} disabled={!canMoveUp} title="Move to top of list">
        <ChevronsUp className="w-4 h-4" />
      </ReorderButton>
      <ReorderButton onClick={() => onReorder('up')} disabled={!canMoveUp} title="Move up">
        <ChevronUp className="w-4 h-4" />
      </ReorderButton>
      <div className="w-px h-4 bg-slate-700"></div>
      <ReorderButton onClick={() => onReorder('down')} disabled={!canMoveDown} title="Move down">
        <ChevronDown className="w-4 h-4" />
      </ReorderButton>
      <ReorderButton onClick={() => onReorder('bottom')} disabled={!canMoveDown} title="Move to bottom of list">
        <ChevronsDown className="w-4 h-4" />
      </ReorderButton>
    </div>
  );
};

export default TaskReorderControls;

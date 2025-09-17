

import React from 'react';
import { useSectionParser, Section } from '../hooks/useSectionParser';
import type { User } from '../types';
import EditableSection from './EditableSection';

interface EditableDocumentViewProps {
  markdown: string;
  users: User[];
  onSectionUpdate: (startLine: number, endLine: number, newContent: string) => void;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onAssign: (lineIndex: number, userAlias: string | null) => void;
  onUpdateCompletionDate: (lineIndex: number, newDate: string) => void;
  onUpdateCreationDate: (lineIndex: number, newDate: string) => void;
  onUpdateDueDate: (lineIndex: number, newDate: string | null) => void;
  onUpdateTaskText: (lineIndex: number, newText: string) => void;
  onAddTaskUpdate: (taskLineIndex: number, updateText: string, assigneeAlias: string | null) => void;
  onUpdateTaskUpdate: (updateLineIndex: number, newDate: string, newText: string, newAlias: string | null) => void;
  onDeleteTaskUpdate: (updateLineIndex: number) => void;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, onSectionUpdate, ...handlers } = props;
  const sections = useSectionParser(markdown);

  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
                {sections.map(section => (
                    <EditableSection
                        key={section.startLine}
                        section={section}
                        users={props.users}
                        onSectionUpdate={onSectionUpdate}
                        {...handlers}
                    />
                ))}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;


import React from 'react';
import { useSectionParser, Section } from '../hooks/useSectionParser';
import type { User } from '../types';
import EditableSection from './EditableSection';

interface EditableDocumentViewProps {
  markdown: string;
  users: User[];
  onSectionUpdate: (startLine: number, endLine: number, newContent: string) => void;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
  onMoveSection: (sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => void;
  onDuplicateSection: (sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => void;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, onSectionUpdate, onMoveSection, onDuplicateSection, ...handlers } = props;
  const sections = useSectionParser(markdown);

  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
                {sections.map((section, index) => (
                    <EditableSection
                        key={section.heading?.text ? `${section.heading.text}-${section.startLine}` : section.startLine}
                        section={section}
                        sectionIndex={index}
                        allSections={sections}
                        onSectionUpdate={onSectionUpdate}
                        onMoveSection={onMoveSection}
                        onDuplicateSection={onDuplicateSection}
                        {...handlers}
                        users={props.users}
                    />
                ))}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;
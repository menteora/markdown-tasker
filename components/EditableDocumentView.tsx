

import React, { useMemo } from 'react';
import { useSectionParser } from '../hooks/useSectionParser';
import type { User, Project, Heading } from '../types';
import EditableSection from './EditableSection';

interface EditableDocumentViewProps {
  markdown: string;
  users: User[];
  onSectionUpdate: (startLine: number, endLine: number, newContent: string) => void;
  onToggle: (lineIndex: number, isCompleted: boolean) => void;
  onUpdateTaskBlock: (absoluteStartLine: number, originalLineCount: number, newContent: string) => void;
  onMoveSection: (sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => void;
  onDuplicateSection: (sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => void;
  projects: Project[];
  viewScope: 'single' | 'all';
  currentProjectIndex: number;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, onSectionUpdate, onMoveSection, onDuplicateSection, projects, viewScope, currentProjectIndex, ...handlers } = props;
  const sections = useSectionParser(markdown);

  const relevantProjects = useMemo(() =>
    viewScope === 'all' ? projects : (projects[currentProjectIndex] ? [projects[currentProjectIndex]] : []),
    [viewScope, projects, currentProjectIndex]
  );

  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
                {sections.map((section, index) => {
                    const projectForSection = relevantProjects.find(
                        p => section.startLine >= p.startLine && section.startLine <= p.endLine
                    );
                    const tocHeadings = projectForSection?.headings;

                    return (
                        <EditableSection
                            key={section.heading?.text ? `${section.heading.text}-${section.startLine}` : section.startLine}
                            section={section}
                            sectionIndex={index}
                            allSections={sections}
                            onSectionUpdate={onSectionUpdate}
                            onMoveSection={onMoveSection}
                            onDuplicateSection={onDuplicateSection}
                            tocHeadings={tocHeadings}
                            {...handlers}
                            users={props.users}
                        />
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;
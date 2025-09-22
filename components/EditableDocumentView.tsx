

import React, { useMemo, useCallback } from 'react';
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

  const projectStartLine = useMemo(() => {
    if (viewScope === 'single' && projects[currentProjectIndex]) {
        return projects[currentProjectIndex].startLine;
    }
    return 0;
  }, [viewScope, projects, currentProjectIndex]);
  
  const handleMoveSectionWithOffset = useCallback((sectionToMove: {startLine: number, endLine: number}, destinationLine: number) => {
      const absoluteSectionToMove = {
          startLine: sectionToMove.startLine + projectStartLine,
          endLine: sectionToMove.endLine + projectStartLine,
      };
      const absoluteDestinationLine = destinationLine > 0 ? destinationLine + projectStartLine : 0;
      onMoveSection(absoluteSectionToMove, absoluteDestinationLine);
  }, [projectStartLine, onMoveSection]);

  const handleDuplicateSectionWithOffset = useCallback((sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => {
      const absoluteSectionToDuplicate = {
          startLine: sectionToDuplicate.startLine + projectStartLine,
          endLine: sectionToDuplicate.endLine + projectStartLine,
      };
      const absoluteDestinationLine = destinationLine > 0 ? destinationLine + projectStartLine : 0;
      onDuplicateSection(absoluteSectionToDuplicate, absoluteDestinationLine);
  }, [projectStartLine, onDuplicateSection]);


  return (
    <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-4">
                {sections.map((section, index) => {
                    const projectForSection = viewScope === 'single'
                        ? projects[currentProjectIndex]
                        : projects.find(p => section.startLine + projectStartLine >= p.startLine && section.startLine + projectStartLine <= p.endLine);

                    const tocHeadings = projectForSection?.headings;

                    return (
                        <EditableSection
                            key={section.heading?.text ? `${section.heading.text}-${section.startLine}` : section.startLine}
                            section={section}
                            sectionIndex={index}
                            allSections={sections}
                            onSectionUpdate={onSectionUpdate}
                            onMoveSection={handleMoveSectionWithOffset}
                            onDuplicateSection={handleDuplicateSectionWithOffset}
                            tocHeadings={tocHeadings}
                            {...handlers}
                            users={props.users}
                            viewScope={viewScope}
                            projectStartLine={projectStartLine}
                        />
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default EditableDocumentView;
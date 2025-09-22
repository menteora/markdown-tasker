

import React, { useMemo, useCallback } from 'react';
import { useSectionParser } from '../hooks/useSectionParser';
import type { User, Project, Heading } from '../types';
import EditableSection from './EditableSection';
import { useProject } from '../contexts/ProjectContext';

interface EditableDocumentViewProps {
  markdown: string;
  projects: Project[];
  viewScope: 'single' | 'all';
  currentProjectIndex: number;
}

const EditableDocumentView: React.FC<EditableDocumentViewProps> = (props) => {
  const { markdown, projects, viewScope, currentProjectIndex } = props;
  const { users, updateSection, moveSection, duplicateSection, toggleTask, updateTaskBlock } = useProject();
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
      moveSection(absoluteSectionToMove, absoluteDestinationLine);
  }, [projectStartLine, moveSection]);

  const handleDuplicateSectionWithOffset = useCallback((sectionToDuplicate: {startLine: number, endLine: number}, destinationLine: number) => {
      const absoluteSectionToDuplicate = {
          startLine: sectionToDuplicate.startLine + projectStartLine,
          endLine: sectionToDuplicate.endLine + projectStartLine,
      };
      const absoluteDestinationLine = destinationLine > 0 ? destinationLine + projectStartLine : 0;
      duplicateSection(absoluteSectionToDuplicate, absoluteDestinationLine);
  }, [projectStartLine, duplicateSection]);

  const handleUpdateSection = useCallback((startLine: number, endLine: number, newContent: string) => {
    const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + startLine : startLine;
    const absoluteEndLine = (viewScope === 'single' && projects[currentProjectIndex]) ? projects[currentProjectIndex].startLine + endLine : endLine;
    updateSection(absoluteStartLine, absoluteEndLine, newContent);
  }, [viewScope, currentProjectIndex, projects, updateSection]);

  const handleToggleTask = useCallback((lineIndex: number, isCompleted: boolean) => {
    const absoluteLineIndex = (viewScope === 'single' && projects[currentProjectIndex])
      ? projects[currentProjectIndex].startLine + lineIndex
      : lineIndex;
    toggleTask(absoluteLineIndex, isCompleted);
  }, [viewScope, currentProjectIndex, projects, toggleTask]);

  const handleUpdateTaskBlock = useCallback((startLine: number, lineCount: number, newContent: string) => {
    const absoluteStartLine = (viewScope === 'single' && projects[currentProjectIndex])
      ? projects[currentProjectIndex].startLine + startLine
      : startLine;
    updateTaskBlock(absoluteStartLine, lineCount, newContent);
  }, [viewScope, currentProjectIndex, projects, updateTaskBlock]);


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
                            onSectionUpdate={handleUpdateSection}
                            onMoveSection={handleMoveSectionWithOffset}
                            onDuplicateSection={handleDuplicateSectionWithOffset}
                            onToggle={handleToggleTask}
                            onUpdateTaskBlock={handleUpdateTaskBlock}
                            tocHeadings={tocHeadings}
                            users={users}
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

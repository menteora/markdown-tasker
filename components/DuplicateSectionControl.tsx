import React, { useState, useRef, useEffect } from 'react';
import { Section } from '../hooks/useSectionParser';
import { Copy, CornerDownRight, ArrowUpToLine } from 'lucide-react';

interface DuplicateSectionControlProps {
    allSections: Section[];
    currentSectionIndex: number;
    onDuplicateSection: (destinationLine: number) => void;
}

const DuplicateSectionControl: React.FC<DuplicateSectionControlProps> = ({ allSections, currentSectionIndex, onDuplicateSection }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDuplicate = (destinationLine: number) => {
        onDuplicateSection(destinationLine);
        setIsOpen(false);
    };

    const currentSection = allSections[currentSectionIndex];
    if (!currentSection) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-2 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-indigo-600 hover:text-white"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Duplicate section"
                title="Duplicate section"
            >
                <Copy className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30" role="menu">
                    <div className="p-1">
                        <div className="px-2 py-1 text-xs font-semibold text-slate-400">Duplicate section after...</div>
                        
                        <button
                            onClick={() => handleDuplicate(0)}
                            className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"
                            role="menuitem"
                        >
                            <ArrowUpToLine className="w-4 h-4 mr-2 flex-shrink-0" />
                           Top of file
                        </button>
                        
                        {allSections.map((section) => {
                            const sectionTitle = section.heading?.text || 'Preamble';
                            
                            return (
                                <button
                                    key={section.startLine}
                                    onClick={() => handleDuplicate(section.endLine + 1)}
                                    className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"
                                    role="menuitem"
                                    title={`After: "${sectionTitle}"`}
                                >
                                    <CornerDownRight className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">"{sectionTitle}"</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuplicateSectionControl;
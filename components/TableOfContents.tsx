import React, { useState } from 'react';
import type { Heading } from '../types';
import { BookMarked, ChevronRight } from 'lucide-react';

interface TableOfContentsProps {
  headings: Heading[];
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ headings }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const projectHeadings = headings.filter(h => h.level > 1);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    document.getElementById(slug)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    setIsOpen(false);
  };

  if (projectHeadings.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 -left-4 z-20">
      <button
        onClick={() => setIsOpen(p => !p)}
        className="p-2 rounded-full bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-lg"
        title="Table of Contents"
        aria-label="Toggle Table of Contents"
        aria-expanded={isOpen}
      >
        <BookMarked className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
      </button>

      <div
        className={`absolute top-0 left-12 w-64 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
      >
        <nav className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4">
          <h4 className="font-bold text-slate-200 mb-2">Contents</h4>
          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {projectHeadings.map((heading) => (
              <li key={heading.slug}>
                <a
                  href={`#${heading.slug}`}
                  onClick={(e) => handleLinkClick(e, heading.slug)}
                  className="flex items-start text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                  style={{ paddingLeft: `${(heading.level - 2) * 16}px` }}
                >
                   <ChevronRight className="w-4 h-3 mr-1 mt-0.5 flex-shrink-0" />
                   <span className="flex-grow">{heading.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default TableOfContents;

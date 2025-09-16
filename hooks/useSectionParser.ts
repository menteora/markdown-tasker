
import { useMemo } from 'react';
import type { Heading } from '../types';

// Simple slugify, doesn't need to be collision-proof for this use case.
const slugify = (text: string): string => {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export interface Section {
  startLine: number;
  endLine: number;
  content: string;
  heading: Heading | null;
}

export const useSectionParser = (markdown: string): Section[] => {
  return useMemo(() => {
    const lines = markdown.split('\n');
    const sections: Section[] = [];
    if (lines.length === 0 && markdown === '') return [];

    const headingIndices: { line: number; level: number; text: string }[] = [];
    lines.forEach((line, index) => {
      const hMatch = line.match(/^(#{1,3}) (.*)/);
      if (hMatch) {
        headingIndices.push({
          line: index,
          level: hMatch[1].length,
          text: hMatch[2].trim(),
        });
      }
    });

    if (headingIndices.length === 0) {
      sections.push({
        startLine: 0,
        endLine: lines.length - 1,
        content: markdown,
        heading: null,
      });
      return sections;
    }

    if (headingIndices[0].line > 0) {
      sections.push({
        startLine: 0,
        endLine: headingIndices[0].line - 1,
        content: lines.slice(0, headingIndices[0].line).join('\n'),
        heading: null,
      });
    }

    headingIndices.forEach((h, i) => {
      const startLine = h.line;
      const endLine = i < headingIndices.length - 1 ? headingIndices[i + 1].line - 1 : lines.length - 1;
      sections.push({
        startLine: startLine,
        endLine: endLine,
        content: lines.slice(startLine, endLine + 1).join('\n'),
        heading: {
          text: h.text,
          slug: slugify(h.text), // Slug doesn't need to be unique here
          level: h.level,
          line: h.line,
        },
      });
    });

    return sections;
  }, [markdown]);
};

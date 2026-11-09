import React from 'react';
import type { BlogContentNode } from '@/lib/data/blog-categories';

interface BlogContentRendererProps {
  nodes: readonly BlogContentNode[];
}

export function BlogContentRenderer({ nodes }: BlogContentRendererProps) {
  return (
    <div className="space-y-6 text-slate-200 leading-relaxed font-sans">
      {nodes.map((node, index) => {
        if (node.type === 'heading') {
          if (node.level === 2) {
            return (
              <h2
                key={`h2-${index}`}
                className="text-xl sm:text-2xl font-extrabold text-white mt-10 mb-4 pt-4 border-t border-slate-800/80 flex items-center gap-2"
              >
                <span className="w-1.5 h-6 rounded-full bg-sky-500 shrink-0 inline-block" />
                <span>{node.text}</span>
              </h2>
            );
          }
          return (
            <h3
              key={`h3-${index}`}
              className="text-lg sm:text-xl font-bold text-sky-400 mt-6 mb-3"
            >
              {node.text}
            </h3>
          );
        }

        if (node.type === 'list') {
          return (
            <ul
              key={`ul-${index}`}
              className="space-y-2.5 my-4 ps-4 sm:ps-6 border-s-2 border-slate-800 text-slate-300 text-base"
            >
              {node.items.map((item, itemIdx) => (
                <li key={`li-${index}-${itemIdx}`} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Paragraph
        return (
          <p
            key={`p-${index}`}
            className="text-slate-300 text-base sm:text-lg leading-relaxed selection:bg-sky-500/30"
          >
            {node.text}
          </p>
        );
      })}
    </div>
  );
}


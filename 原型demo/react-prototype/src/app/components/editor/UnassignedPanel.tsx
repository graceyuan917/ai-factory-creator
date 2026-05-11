import React, { useState, useEffect, useRef } from 'react';
import { Cog, GitBranch, X, PackageOpen } from 'lucide-react';
import type { FactoryNode } from '../../data/mockData';

interface UnassignedPanelProps {
  nodes: FactoryNode[];
  selectedId: string;
  onSelect: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
}

export function UnassignedPanel({ nodes, selectedId, onSelect, onRemove }: UnassignedPanelProps) {
  const [flash, setFlash] = useState(false);
  const prevCount = useRef(nodes.length);

  useEffect(() => {
    if (nodes.length > prevCount.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1200);
      prevCount.current = nodes.length;
      return () => clearTimeout(timer);
    }
    prevCount.current = nodes.length;
  }, [nodes.length]);

  function handleDragStart(e: React.DragEvent, node: FactoryNode) {
    e.dataTransfer.setData('application/x-unassigned-node', JSON.stringify({
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.name,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="border-b border-[#142235] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-amber-900/8 border-b border-amber-700/20">
        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <PackageOpen size={10} className="text-amber-500" />
          Unassigned
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
            flash
              ? 'bg-amber-400/30 text-amber-200 animate-pulse'
              : 'bg-amber-500/15 text-amber-300'
          }`}
        >
          {nodes.length}
        </span>
      </div>

      {/* Node Cards */}
      <div className="max-h-[120px] overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="text-[9px] text-slate-600 text-center py-3 px-2">
            Drag assets here from the library or 3D viewport
          </div>
        ) : (
          nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const Icon = node.type === 'line' ? GitBranch : Cog;
            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
                onClick={() => onSelect(node.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-[10px] border-b border-[#142235] cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-amber-600/10 text-amber-300'
                    : 'bg-[#0a1525] text-slate-300 hover:bg-[#0f2035]'
                }`}
              >
                <Icon size={10} className="text-orange-400/70 flex-shrink-0" />
                <span className="flex-1 truncate">{node.name}</span>
                <span className="text-[8px] text-amber-600/70 bg-amber-900/15 rounded px-1 py-0.5 flex-shrink-0">
                  {node.type === 'line' ? 'Line' : 'Equipment'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
                  className="text-slate-600 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

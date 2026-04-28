import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight, ChevronDown, Building2, Layers3, GitBranch, Cog,
  Maximize2, Plus, Copy, Trash2, AlertCircle, MousePointer2,
} from 'lucide-react';
import type { FactoryNode } from '../../data/mockData';
import { NODE_STATUS_TEXT } from '../../types/factoryEditor';

// ══════════════════════════════════════════════════════════════════════════════
// ErrorDot — red pulsing indicator with hover tooltip
// ══════════════════════════════════════════════════════════════════════════════
function ErrorDot({ message }: { message: string }) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function handleMouseEnter() {
    if (dotRef.current) {
      const r = dotRef.current.getBoundingClientRect();
      setPos({ x: r.right + 10, y: r.top });
    }
  }

  return (
    <>
      <span
        ref={dotRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        className="flex-shrink-0 w-2 h-2 rounded-full bg-red-400 animate-pulse cursor-help"
      />
      {pos && createPortal(
        <div
          className="fixed z-[9999] w-60 bg-[#0c1c2e] border border-red-600/50 rounded-lg shadow-2xl p-3 pointer-events-none"
          style={{ left: pos.x, top: pos.y - 4 }}
        >
          <div
            className="absolute -left-[5px] top-3 w-2.5 h-2.5 bg-[#0c1c2e] border-l border-b border-red-600/50 rotate-45"
          />
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-red-300 uppercase tracking-wide">配置错误</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">{message}</p>
          <div className="mt-2 pt-2 border-t border-red-900/40 text-[9px] text-slate-500 flex items-center gap-1">
            <MousePointer2 size={9} className="text-slate-600" />
            点击节点在右侧面板修复
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tree Node Component
// ══════════════════════════════════════════════════════════════════════════════
export function TreeNode({
  node, depth, selectedId, expandedIds, onSelect, onToggle, onDrillIn,
}: {
  node: FactoryNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDrillIn: (id: string) => void;
}) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;
  const canDrillIn = node.type === 'line' || node.type === 'equipment';

  const icon = (() => {
    if (node.status === 'error') {
      switch (node.type) {
        case 'factory':   return <Building2 size={11} className="text-red-400 flex-shrink-0" />;
        case 'process':   return <Layers3 size={11} className="text-red-400 flex-shrink-0" />;
        case 'line':      return <GitBranch size={10} className="text-red-400 flex-shrink-0" />;
        case 'equipment': return <Cog size={10} className="text-red-400 flex-shrink-0" />;
      }
    }
    switch (node.type) {
      case 'factory':   return <Building2 size={11} className="text-blue-400 flex-shrink-0" />;
      case 'process':   return <Layers3 size={11} className="text-amber-400 flex-shrink-0" />;
      case 'line':      return <GitBranch size={10} className="text-emerald-400 flex-shrink-0" />;
      case 'equipment': return <Cog size={10} className="text-purple-400 flex-shrink-0" />;
    }
  })();

  const statusDot = node.status ? (
    node.status === 'error' ? (
      <ErrorDot message={node.errorMessage || NODE_STATUS_TEXT['error']} />
    ) : (
      <span
        className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
          node.status === 'configured' ? 'bg-emerald-400' :
          node.status === 'partial'    ? 'bg-amber-400'   : 'bg-slate-600'
        }`}
        title={NODE_STATUS_TEXT[node.status] || node.status}
      />
    )
  ) : null;

  return (
    <div>
      <div
        onClick={() => { onSelect(node.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (canDrillIn) onDrillIn(node.id); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (canDrillIn) setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm mx-1 group transition-colors text-[11px] ${
          node.status === 'error'
            ? isSelected
              ? 'bg-blue-600/20 text-red-300'
              : 'text-red-400 hover:text-red-300 hover:bg-[#0f2035]'
            : isSelected
            ? 'bg-blue-600/20 text-blue-300'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f2035]'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 p-0 bg-transparent border-none cursor-pointer focus:outline-none"
          >
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-[10px]" />
        )}

        {icon}
        <span className="flex-1 truncate text-[11px]">{node.name}</span>
        {statusDot}

        <div className="hidden group-hover:flex items-center gap-0.5 ml-1 flex-shrink-0">
          {canDrillIn && (
            <button
              onClick={(e) => { e.stopPropagation(); onDrillIn(node.id); }}
              className="text-slate-600 hover:text-blue-400 p-0.5 transition-colors"
              title={node.type === 'line' ? 'Enter Line View' : 'Enter Equipment View'}
            >
              <Maximize2 size={9} />
            </button>
          )}
          {node.type !== 'equipment' && (
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="text-slate-600 hover:text-blue-400 p-0.5 transition-colors"
              title="Add child"
            >
              <Plus size={9} />
            </button>
          )}
          {(node.type === 'line' || node.type === 'equipment') && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="text-slate-600 hover:text-blue-400 p-0.5 transition-colors"
                title="Duplicate"
              >
                <Copy size={9} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="text-slate-600 hover:text-red-400 p-0.5 transition-colors"
                title="Delete"
              >
                <Trash2 size={9} />
              </button>
            </>
          )}
        </div>
      </div>

      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 bg-[#0d1f33] border border-[#1e3a55] rounded-lg shadow-xl py-1 text-[11px] min-w-[140px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => { onDrillIn(node.id); setCtxMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-blue-300 hover:bg-[#142235] flex items-center gap-2"
            >
              <Maximize2 size={10} />
              {node.type === 'line' ? 'Enter Line View' : 'Enter Equipment View'}
            </button>
            <div className="my-1 border-t border-[#142235]" />
            <button
              onClick={() => setCtxMenu(null)}
              className="w-full text-left px-3 py-1.5 text-slate-400 hover:bg-[#142235] flex items-center gap-2"
            >
              <Copy size={10} /> 复制
            </button>
            <button
              onClick={() => setCtxMenu(null)}
              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-[#142235] flex items-center gap-2"
            >
              <Trash2 size={10} /> 删除
            </button>
          </div>
        </>,
        document.body
      )}

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onDrillIn={onDrillIn}
            />
          ))}
        </div>
      )}
    </div>
  );
}

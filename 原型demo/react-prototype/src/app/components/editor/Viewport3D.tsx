import React, { useState } from 'react';
import {
  ChevronRight, Cog, Navigation, MousePointer2, Move, ZoomIn, ZoomOut, Play, Pause, RotateCcw,
} from 'lucide-react';
import type { FactoryNode } from '../../data/mockData';
import type { ViewMode } from '../../types/factoryEditor';

// ── Viewport Toolbar ──────────────────────────────────────────────────────────
const VIEWPORT_TOOLS = [
  { id: 'select',   icon: MousePointer2, label: 'Select (S)' },
  { id: 'move',     icon: Move,          label: 'Move (M)' },
  { id: 'rotate',   icon: RotateCcw,     label: 'Rotate (R)' },
  { id: 'zoomin',   icon: ZoomIn,        label: 'Zoom In (+)' },
  { id: 'zoomout',  icon: ZoomOut,       label: 'Zoom Out (−)' },
] as const;

function ViewportToolbar() {
  console.log('ViewportToolbar rendered');
  const [activeTool, setActiveTool] = useState<string>('select');
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[#071526]/90 border border-[#142235] rounded-lg p-1.5 backdrop-blur-sm z-10"
      onClick={(e) => {
        console.log('Toolbar container clicked', e.target);
        e.stopPropagation();
      }}
    >
      {VIEWPORT_TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          type="button"
          key={id}
          title={label}
          onClick={() => {
            console.log('Toolbar button clicked:', id);
            setActiveTool(id);
          }}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            activeTool === id
              ? 'bg-blue-600/30 text-blue-400'
              : 'text-slate-500 hover:text-slate-200 hover:bg-[#142235]'
          }`}
        >
          <Icon size={13} />
        </button>
      ))}

      {/* Divider */}
      <div className="my-0.5 border-t border-[#142235]" />

      {/* Play / Pause toggle */}
      <button
        type="button"
        title={playing ? 'Pause simulation' : 'Play simulation'}
        onClick={() => {
          console.log('Play/pause button clicked');
          setPlaying((v) => !v);
        }}
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
          playing
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'text-slate-500 hover:text-slate-200 hover:bg-[#142235]'
        }`}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </div>
  );
}

// ── Floor / Overlay Nav Panel ─────────────────────────────────────────────────
const FLOORS = [
  { id: '2f', label: '2F' },
  { id: '1f', label: '1F' },
  { id: 'b1', label: 'B1' },
];

const OVERLAYS = [
  { id: 'agv', label: 'AGV Paths', icon: Navigation },
];

function FloorNavPanel() {
  console.log('FloorNavPanel rendered');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [activeFloor, setActiveFloor] = useState('1f');
  const [floorsOpen, setFloorsOpen] = useState(true);
  const [overlaysOpen, setOverlaysOpen] = useState(true);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set(['agv']));

  function toggleOverlay(id: string) {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      className="absolute right-3 top-3 flex flex-col gap-2 min-w-[100px]"
      onClick={(e) => {
        console.log('FloorNavPanel container clicked', e.target);
        e.stopPropagation();
      }}
    >
      {/* View mode toggle */}
      <div className="bg-[#071526]/90 border border-[#142235] rounded-lg p-1 backdrop-blur-sm flex">
        {(['3d', '2d'] as const).map((mode) => (
          <button
            type="button"
            key={mode}
            onClick={() => {
              console.log('View mode button clicked:', mode);
              setViewMode(mode);
            }}
            className={`flex-1 px-2 py-1 text-[9px] rounded transition-colors font-medium ${
              viewMode === mode
                ? 'bg-blue-600/30 text-blue-400'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Floors */}
      <div className="bg-[#071526]/90 border border-[#142235] rounded-lg backdrop-blur-sm overflow-hidden">
        <button
          type="button"
          onClick={() => {
            console.log('Floors toggle clicked');
            setFloorsOpen((v) => !v);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider hover:bg-[#142235] transition-colors"
        >
          Floors
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${floorsOpen ? 'rotate-0' : '-rotate-90'}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {floorsOpen && (
          <div className="px-1.5 pb-1.5 space-y-0.5">
            {FLOORS.map((floor) => (
              <button
                type="button"
                key={floor.id}
                onClick={() => {
                  console.log('Floor button clicked:', floor.id);
                  setActiveFloor(floor.id);
                }}
                className={`w-full text-left px-2 py-1 text-[10px] rounded transition-colors ${
                  activeFloor === floor.id
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#142235]'
                }`}
              >
                {floor.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      <div className="bg-[#071526]/90 border border-[#142235] rounded-lg backdrop-blur-sm overflow-hidden">
        <button
          type="button"
          onClick={() => {
            console.log('Overlays toggle clicked');
            setOverlaysOpen((v) => !v);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider hover:bg-[#142235] transition-colors"
        >
          Overlays
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${overlaysOpen ? 'rotate-0' : '-rotate-90'}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {overlaysOpen && (
          <div className="px-1.5 pb-1.5 space-y-0.5">
            {OVERLAYS.map(({ id, label, icon: Icon }) => (
              <label
                key={id}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer rounded hover:bg-[#142235] transition-colors"
              >
                <Icon size={10} />
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={activeOverlays.has(id)}
                  onChange={() => {
                    console.log('Overlay checkbox toggled:', id);
                    toggleOverlay(id);
                  }}
                  className="ml-auto accent-blue-600 w-2.5 h-2.5"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mock equipment slots for line view ────────────────────────────────────────
const MOCK_EQUIPMENT_SLOTS = [
  { id: 'slot-a', label: '印刷机', color: 'bg-blue-900/40 border-blue-700/50' },
  { id: 'slot-b', label: '贴片机', color: 'bg-purple-900/40 border-purple-700/50' },
  { id: 'slot-c', label: '回流焊炉', color: 'bg-amber-900/40 border-amber-700/50' },
  { id: 'slot-d', label: 'AOI检测', color: 'bg-emerald-900/40 border-emerald-700/50' },
  { id: 'slot-e', label: '包装机', color: 'bg-cyan-900/40 border-cyan-700/50' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Viewport3D
// ══════════════════════════════════════════════════════════════════════════════
export function Viewport3D({
  selectedNode,
  viewMode,
  viewContextNode,
  breadcrumb,
  onBreadcrumbClick,
  onCanvasNodeClick,
}: {
  selectedNode: FactoryNode | null;
  viewMode: ViewMode;
  viewContextNode: FactoryNode | null;
  breadcrumb: FactoryNode[];
  onBreadcrumbClick: (id: string) => void;
  onCanvasNodeClick: (id: string) => void;
}) {
  // ── Floor view: derive highlight type from selected node ──
  const highlightType = viewMode === 'floor' ? selectedNode?.type ?? null : null;

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-[#07111e]">

      {/* ── Breadcrumb bar ── */}
      {breadcrumb.length > 0 && (
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-[#050f1a]/80 border-b border-[#142235]">
          {breadcrumb.map((crumb, i) => {
            const isLast = i === breadcrumb.length - 1;
            const viewLabel: Record<string, string> = { factory: 'Floor View', process: 'Floor View', line: 'Line View', equipment: 'Equipment View' };
            return (
              <React.Fragment key={crumb.id}>
                {i > 0 && <ChevronRight size={9} className="text-slate-700 flex-shrink-0" />}
                <button
                  onClick={() => {
                    console.log('Breadcrumb clicked:', crumb.id, crumb.name, 'isLast:', isLast);
                    if (!isLast) {
                      onBreadcrumbClick(crumb.id);
                    }
                  }}
                  className={`text-[10px] truncate max-w-[120px] transition-colors ${
                    isLast
                      ? 'text-slate-400 cursor-default'
                      : 'text-slate-600 hover:text-blue-400 cursor-pointer'
                  }`}
                >
                  {crumb.name}
                </button>
                {isLast && (
                  <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] bg-blue-600/15 text-blue-500 border border-blue-600/20 flex-shrink-0">
                    {viewLabel[crumb.type] ?? 'Floor View'}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Main canvas area ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Viewport Toolbar */}
        <ViewportToolbar />

        {/* Grid floor */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(30,58,95,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30,58,95,0.35) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* ══ FLOOR VIEW ══ */}
        {viewMode === 'floor' && (
          <div
            className={`relative rounded border-2 cursor-pointer transition-all select-none ${
              highlightType === 'factory'
                ? 'border-blue-400/80 animate-pulse shadow-lg shadow-blue-500/20'
                : 'border-[#1e3a55]'
            }`}
            style={{ width: 580, height: 360 }}
            onClick={() => onCanvasNodeClick(breadcrumb[0]?.id ?? '')}
          >
            {/* Factory label */}
            <div className="absolute top-2 left-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider select-none">
              Floor View · {breadcrumb[0]?.name ?? 'Factory'}
            </div>

            {/* Process zone — top area */}
            <div
              className={`absolute rounded border transition-all cursor-pointer ${
                highlightType === 'process'
                  ? 'bg-amber-500/20 border-amber-400/70 animate-pulse'
                  : 'bg-amber-900/10 border-amber-900/30 hover:bg-amber-500/10 hover:border-amber-500/40'
              }`}
              style={{ top: 36, left: 16, width: '58%', height: '34%' }}
              title="Process Zone"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute top-1.5 left-2 text-[9px] text-amber-500/70 font-medium">Process Zone</span>
            </div>

            {/* Line zone — bottom strip */}
            <div
              className={`absolute rounded border transition-all cursor-pointer ${
                highlightType === 'line' || highlightType === 'equipment'
                  ? 'bg-emerald-500/20 border-emerald-400/70'
                  : 'bg-emerald-900/10 border-emerald-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/40'
              }`}
              style={{ top: '52%', left: 16, right: 16, height: '34%' }}
              title="Line Zone"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute top-1.5 left-2 text-[9px] text-emerald-500/70 font-medium">产线地板区域</span>

              {/* Equipment callout pin */}
              {highlightType === 'equipment' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                  <div className="bg-[#0d1f33] border border-blue-400/60 rounded px-2 py-0.5 text-[10px] text-blue-300 whitespace-nowrap shadow-lg">
                    {selectedNode?.name}
                  </div>
                  <div className="w-px h-3 bg-blue-400/50" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ LINE VIEW ══ */}
        {viewMode === 'line' && (
          <div
            className="relative flex flex-col gap-3 select-none"
            style={{ width: 580 }}
            onClick={() => viewContextNode && onCanvasNodeClick(viewContextNode.id)}
          >
            {/* Line container */}
            <div className="rounded border border-emerald-700/50 bg-emerald-900/10 p-4 cursor-pointer hover:border-emerald-500/60 transition-all">
              <div className="text-[10px] text-emerald-400/80 font-semibold uppercase tracking-wider mb-3">
                Line View · {viewContextNode?.name ?? 'Line'}
              </div>
              {/* Conveyor + equipment blocks */}
              <div className="relative flex items-center gap-3 py-2">
                {/* Conveyor track */}
                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-slate-700/50 border-y border-slate-600/30 rounded -z-0" />
                {(viewContextNode?.children?.length
                  ? viewContextNode.children
                  : MOCK_EQUIPMENT_SLOTS.map((s) => ({ id: s.id, name: s.label, type: 'equipment' as const }))
                ).map((eq, i) => {
                  const isSelected = eq.id === selectedNode?.id;
                  const colors = [
                    { bg: 'bg-blue-900/50', border: 'border-blue-700/60', text: 'text-blue-300' },
                    { bg: 'bg-purple-900/50', border: 'border-purple-700/60', text: 'text-purple-300' },
                    { bg: 'bg-amber-900/50', border: 'border-amber-700/60', text: 'text-amber-300' },
                    { bg: 'bg-emerald-900/50', border: 'border-emerald-700/60', text: 'text-emerald-300' },
                    { bg: 'bg-cyan-900/50', border: 'border-cyan-700/60', text: 'text-cyan-300' },
                  ];
                  const c = colors[i % colors.length];
                  return (
                    <button
                      key={eq.id}
                      onClick={(e) => { e.stopPropagation(); onCanvasNodeClick(eq.id); }}
                      className={`relative z-10 flex-shrink-0 w-24 h-20 rounded border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'border-blue-400 bg-blue-600/25 shadow-lg shadow-blue-500/20'
                          : `${c.bg} ${c.border} hover:border-blue-400/60`
                      }`}
                    >
                      <Cog size={16} className={isSelected ? 'text-blue-300' : c.text} />
                      <span className={`text-[9px] text-center leading-tight px-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        {eq.name}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border border-[#07111e]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] text-slate-600 text-center">点击设备方块查看详情 · 点击空白区域选中产线</div>
          </div>
        )}

        {/* ══ EQUIPMENT VIEW ══ */}
        {viewMode === 'equipment' && (
          <div
            className="flex flex-col items-center gap-3 cursor-pointer select-none"
            onClick={() => viewContextNode && onCanvasNodeClick(viewContextNode.id)}
          >
            {/* Equipment block */}
            <div className="rounded-xl border-2 border-blue-400/70 bg-blue-900/20 shadow-xl shadow-blue-500/10 flex flex-col items-center justify-center gap-3 transition-all"
              style={{ width: 280, height: 200 }}
            >
              <div className="w-14 h-14 rounded-xl border-2 border-blue-400/60 bg-blue-600/20 flex items-center justify-center animate-pulse">
                <Cog size={28} className="text-blue-400" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-200">
                  {viewContextNode?.name ?? selectedNode?.name ?? '设备'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Equipment View</div>
              </div>
            </div>
              <div className="text-[10px] text-slate-600">Click to select equipment</div>
          </div>
        )}

        {/* Floor / Overlay Nav Panel (Floor View only) */}
        {viewMode === 'floor' && <FloorNavPanel />}
      </div>

      {/* ── Status bar ── */}
      <div className="flex-shrink-0 h-6 bg-[#050f1a]/90 border-t border-[#142235] flex items-center px-3 gap-4 text-[10px] text-slate-600">
        {selectedNode && (
          <>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">Selected:</span>
              <span className="text-slate-300">{selectedNode.name}</span>
            </span>
            <span className="text-[#142235]">|</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">Type:</span>
              <span className="text-blue-400 capitalize">{selectedNode.type}</span>
            </span>
            <span className="text-[#142235]">|</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">View:</span>
              <span className="text-emerald-400 capitalize">
                {viewMode === 'floor' ? 'Floor' : viewMode === 'line' ? 'Line' : 'Equipment'}
              </span>
            </span>
          </>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          USD Composer Connected
        </span>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft, ChevronRight, ChevronDown, Search, Package, Layers3,
  Grid3X3, List, Plus, Edit2, Eye, X, SlidersHorizontal, ChevronUp, Check,
  Move, RotateCcw, MousePointer2, ZoomIn, Maximize2, Settings,
  Cpu, GitBranch, Box, Activity, Wifi, BarChart3, Info, History,
} from 'lucide-react';
import { assetLibraryCategories, type AssetItem } from '../data/mockData';

// ── 制程 & 类型 filter options (固定) ─────────────────────────────────────
const PROCESS_OPTIONS = [
  { id: 'smt', label: 'SMT' },
  { id: 'pth', label: 'PTH' },
  { id: 'assy', label: 'ASSY' },
  { id: 'test', label: 'TEST' },
  { id: 'packing', label: 'PACKING' },
];

const TYPE_OPTIONS = ['产线', '设备', '公辅机房', '治具', '仓储'];

// ── Mock asset structure tree (for viewer) ──────────────────────────────────
function buildAssetTree(asset: AssetItem) {
  const isLine = asset.type?.includes('Line') || asset.type?.includes('产线');
  if (isLine) {
    return {
      id: asset.id,
      name: asset.name,
      type: 'line' as const,
      children: [
        {
          id: `${asset.id}-s1`, name: 'Station 1 — Printing', type: 'station' as const,
          children: [
            { id: `${asset.id}-s1-p`, name: 'Stencil Printer', type: 'equipment' as const, children: [] },
          ],
        },
        {
          id: `${asset.id}-s2`, name: 'Station 2 — Placement', type: 'station' as const,
          children: [
            { id: `${asset.id}-s2-m1`, name: 'Chip Mounter #1', type: 'equipment' as const, children: [] },
            { id: `${asset.id}-s2-m2`, name: 'Chip Mounter #2', type: 'equipment' as const, children: [] },
          ],
        },
        {
          id: `${asset.id}-s3`, name: 'Station 3 — Soldering', type: 'station' as const,
          children: [
            { id: `${asset.id}-s3-r`, name: 'Reflow Oven', type: 'equipment' as const, children: [] },
          ],
        },
      ],
    };
  }
  return {
    id: asset.id,
    name: asset.name,
    type: 'equipment' as const,
    children: [
      { id: `${asset.id}-mech`, name: 'Mechanical Structure', type: 'component' as const, children: [] },
      { id: `${asset.id}-ctrl`, name: 'Control System', type: 'component' as const, children: [] },
      { id: `${asset.id}-sens`, name: 'Sensor Array', type: 'component' as const, children: [] },
    ],
  };
}

// ✅ 修复：完整定义 TreeNode 类型（包含 children）
interface TreeNode {
  id: string;
  name: string;
  type: 'line' | 'station' | 'equipment' | 'component';
  children?: TreeNode[];
}

// ══════════════════════════════════════════════════════════════════════════════
// AssetViewerPage — full-screen asset editor (like FactoryEditorPage)
// ══════════════════════════════════════════════════════════════════════════════
function AssetViewerPage({
  asset,
  onBack,
}: {
  asset: AssetItem;
  onBack: () => void;
}) {
  const tree = useMemo(() => buildAssetTree(asset), [asset]);
  const [selectedNodeId, setSelectedNodeId] = useState(asset.id);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([asset.id, `${asset.id}-s1`, `${asset.id}-s2`, `${asset.id}-s3`])
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic-info', '3d-model', 'dimensions', 'iot-config', 'production', 'maintenance'])
  );

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const [viewTool, setViewTool] = useState<'select' | 'move' | 'rotate' | 'zoom'>('select');
  const emptyBiz = { protocol: '', ipAddress: '', port: '', standardCT: '', capacityPerHr: '', availability: '', mtbf: '', lastMaintenance: '' };
  const [bizData, setBizData] = useState(emptyBiz);
  const [pendingBiz, setPendingBiz] = useState(emptyBiz);
  const [isEditingBiz, setIsEditingBiz] = useState(false);

  function startEditBiz() { setPendingBiz({ ...bizData }); setIsEditingBiz(true); }
  function saveBiz() { setBizData({ ...pendingBiz }); setIsEditingBiz(false); }
  function cancelBiz() { setIsEditingBiz(false); }
  function updatePending(key: keyof typeof emptyBiz, value: string) {
    setPendingBiz(prev => ({ ...prev, [key]: value }));
  }
  const displayBiz = isEditingBiz ? pendingBiz : bizData;

  function toggleExpand(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ✅ 修复：安全递归渲染，移除非空断言 ! 和 as 强制类型
  function renderNode(node: TreeNode, depth = 0): React.ReactNode {
    const hasChildren = !!node.children && node.children.length > 0;
    const expanded = expandedNodes.has(node.id);
    const selected = selectedNodeId === node.id;
    const icon =
      node.type === 'line' ? <GitBranch size={11} className="flex-shrink-0" /> :
      node.type === 'station' ? <Box size={11} className="flex-shrink-0" /> :
      node.type === 'component' ? <Settings size={11} className="flex-shrink-0" /> :
      <Cpu size={11} className="flex-shrink-0" />;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            setSelectedNodeId(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`w-full flex items-center gap-1.5 pr-3 py-1.5 text-left text-[11px] transition-colors ${
            selected
              ? 'bg-blue-600/15 text-blue-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e243a]'
          }`}
        >
          {hasChildren ? (
            <ChevronDown
              size={10}
              className={`flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          ) : (
            <span className="w-2.5 flex-shrink-0" />
          )}
          {icon}
          <span className="flex-1 truncate">{node.name}</span>
        </button>

        {/* ✅ 修复：安全判断 + 无类型断言 */}
        {hasChildren && expanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const viewTools = [
    { id: 'select', icon: <MousePointer2 size={13} />, title: 'Select' },
    { id: 'move',   icon: <Move size={13} />,          title: 'Move' },
    { id: 'rotate', icon: <RotateCcw size={13} />,     title: 'Rotate' },
    { id: 'zoom',   icon: <ZoomIn size={13} />,        title: 'Zoom' },
  ] as const;


  return (
    <div className="flex flex-col h-screen bg-[#07111e] text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="h-11 bg-[#050f1a] border-b border-[#142235] flex items-center px-4 gap-3 flex-shrink-0 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-[11px] transition-colors flex-shrink-0"
        >
          <ChevronLeft size={13} /> Asset Library
        </button>
        <div className="w-px h-4 bg-[#1e3a55]" />
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Layers3 size={11} />
          </div>
          <span className="text-[11px] font-semibold tracking-widest text-blue-300 uppercase">AI Factory Creator</span>
        </div>
        <div className="w-px h-4 bg-[#1e3a55]" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Package size={12} className="text-blue-400 flex-shrink-0" />
          <span className="text-[11px] font-medium text-slate-200 truncate">{asset.name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 flex-shrink-0">
            {asset.type}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Asset Tree */}
        <aside className="w-52 bg-[#050f1a] border-r border-[#142235] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#142235] flex items-center gap-1.5">
            <Activity size={11} className="text-blue-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Asset Structure</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {renderNode(tree)}
          </div>
        </aside>

        {/* Center: Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#07111e]">
          {/* Viewport Toolbar */}
          <div className="h-9 bg-[#050f1a] border-b border-[#142235] flex items-center px-3 gap-1 flex-shrink-0">
            {viewTools.map((t) => (
              <button
                key={t.id}
                title={t.title}
                onClick={() => setViewTool(t.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  viewTool === t.id
                    ? 'bg-blue-600/25 text-blue-300'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-[#142235]'
                }`}
              >
                {t.icon}
              </button>
            ))}
            <div className="w-px h-4 bg-[#1e3a55] mx-1" />
            <button
              title="Fit View"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#142235] transition-colors"
            >
              <Maximize2 size={13} />
            </button>
            <button
              title="Toggle Grid"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#142235] transition-colors"
            >
              <Grid3X3 size={13} />
            </button>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600">
              <span>3D Asset Viewer</span>
              <span className="text-[9px] text-slate-700">·</span>
              <span>{asset.category?.toUpperCase()}</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(rgba(20,34,53,0.6) 1px, transparent 1px),
                linear-gradient(90deg, rgba(20,34,53,0.6) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          >
            {/* Center glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-96 h-96 rounded-full bg-blue-600/5 blur-3xl" />
            </div>

            {/* Asset image centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-[420px] h-[280px] rounded-xl overflow-hidden border border-[#1e3a55]/60 shadow-2xl shadow-blue-900/20">
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111e]/40 to-transparent" />
                </div>
                {/* Selection highlight */}
                <div className="absolute -inset-1 rounded-xl border border-blue-500/40 pointer-events-none" />
                {/* Name label */}
                <div className="absolute -bottom-7 left-0 right-0 text-center text-[11px] text-blue-300 font-medium">
                  {asset.name}
                </div>
              </div>
            </div>

            {/* Coordinates overlay */}
            <div className="absolute bottom-3 left-3 text-[9px] text-slate-700 font-mono">
              X: 0.00  Y: 0.00  Z: 0.00
            </div>

            {/* Zoom indicator */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button className="w-6 h-6 rounded bg-[#0b1d30] border border-[#142235] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors text-xs">−</button>
              <span className="text-[10px] text-slate-600">100%</span>
              <button className="w-6 h-6 rounded bg-[#0b1d30] border border-[#142235] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors text-xs">+</button>
            </div>
          </div>
        </div>

        {/* Right: Properties Panel */}
        <aside className="w-64 bg-[#050f1a] border-l border-[#142235] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#142235] flex-shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Properties</span>
            <div className="flex items-center gap-0.5">
              {isEditingBiz ? (
                <>
                  <button onClick={saveBiz} title="Save" className="w-6 h-6 flex items-center justify-center rounded text-green-400 hover:bg-green-500/15 transition-colors">
                    <Check size={12} />
                  </button>
                  <button onClick={cancelBiz} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-[#142235] transition-colors">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <button onClick={startEditBiz} title="Edit" className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 hover:bg-[#142235] transition-colors">
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <AccordionSection title="Basic Info" id="basic-info" expanded={expandedSections.has('basic-info')} onToggle={toggleSection}>
              <PropRow label="Name" value={asset.name} />
              <PropRow label="Type" value={asset.type} />
              <PropRow label="Category" value={asset.category?.toUpperCase() ?? '—'} />
              {asset.manufacturer && <PropRow label="Manufacturer" value={asset.manufacturer} />}
              {asset.model && <PropRow label="Model No." value={asset.model} />}
            </AccordionSection>

            {/* 3D Model */}
            <AccordionSection title="3D Model" id="3d-model" expanded={expandedSections.has('3d-model')} onToggle={toggleSection}>
              <PropRow label="USD Path" value={`/Assets/${asset.id}.usd`} />
              <PropRow label="Format" value="USD" />
              <PropRow label="Poly Count" value="~24,500" />
              <PropRow label="LOD Levels" value="3" />
            </AccordionSection>

            {/* Dimensions */}
            <AccordionSection title="Dimensions" id="dimensions" expanded={expandedSections.has('dimensions')} onToggle={toggleSection}>
              <PropRow label="Width" value="2400 mm" />
              <PropRow label="Depth" value="1800 mm" />
              <PropRow label="Height" value="1650 mm" />
            </AccordionSection>

            {/* IoT Configuration */}
            <AccordionSection title="IoT Configuration" id="iot-config" expanded={expandedSections.has('iot-config')} onToggle={toggleSection}>
              <BizInputRow label="Protocol" value={displayBiz.protocol} onChange={v => updatePending('protocol', v)} placeholder="e.g. OPC-UA" editing={isEditingBiz} />
              <BizInputRow label="IP Address" value={displayBiz.ipAddress} onChange={v => updatePending('ipAddress', v)} placeholder="e.g. 192.168.1.100" editing={isEditingBiz} />
              <BizInputRow label="Port" value={displayBiz.port} onChange={v => updatePending('port', v)} placeholder="e.g. 4840" editing={isEditingBiz} />
            </AccordionSection>

            {/* Production Data */}
            <AccordionSection title="Production Data" id="production" expanded={expandedSections.has('production')} onToggle={toggleSection}>
              <BizInputRow label="Standard CT" value={displayBiz.standardCT} onChange={v => updatePending('standardCT', v)} placeholder="e.g. 45s" editing={isEditingBiz} />
              <BizInputRow label="Capacity / hr" value={displayBiz.capacityPerHr} onChange={v => updatePending('capacityPerHr', v)} placeholder="e.g. 1200" editing={isEditingBiz} />
              <BizInputRow label="Availability" value={displayBiz.availability} onChange={v => updatePending('availability', v)} placeholder="e.g. 90%" editing={isEditingBiz} />
            </AccordionSection>

            {/* Maintenance */}
            <AccordionSection title="Maintenance" id="maintenance" expanded={expandedSections.has('maintenance')} onToggle={toggleSection}>
              <BizInputRow label="MTBF" value={displayBiz.mtbf} onChange={v => updatePending('mtbf', v)} placeholder="e.g. 2000 hrs" editing={isEditingBiz} />
              <BizInputRow label="Last Maintenance" value={displayBiz.lastMaintenance} onChange={v => updatePending('lastMaintenance', v)} placeholder="e.g. 2024-12-01" editing={isEditingBiz} />
            </AccordionSection>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AccordionSection({
  title, id, expanded, onToggle, children,
}: {
  title: string; id: string; expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#142235]">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#0a1c2e] transition-colors"
      >
        <span className="text-[11px] font-semibold text-slate-300">{title}</span>
        <ChevronDown size={12} className={`text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function BizInputRow({ label, value, onChange, placeholder, editing }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; editing: boolean;
}) {
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] text-slate-500 flex-shrink-0">{label}</span>
        <span className="text-[10px] text-right text-slate-600 italic">{value || 'Not configured'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Not configured'}
        className="flex-1 bg-[#071526] border border-[#1e3a55] rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-colors min-w-0"
      />
    </div>
  );
}

function PropRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-[10px] text-right ${dim ? 'text-slate-600 italic' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AssetLibraryPage
// ══════════════════════════════════════════════════════════════════════════════
export function AssetLibraryPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const [selectedCat, setSelectedCat] = useState(category || 'smt');
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(['smt-lines', 'stencil-printers', 'chip-mounters', 'reflow-ovens']));
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [viewingAsset, setViewingAsset] = useState<AssetItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const currentCat = assetLibraryCategories.find((c) => c.id === selectedCat);

  const activeFilterCount = selectedTypes.size;

  const filteredItems = useMemo(() => {
    if (!currentCat) return [];
    const allItems = currentCat.subcategories.flatMap((s) =>
      selectedSubCat && s.id !== selectedSubCat ? [] : s.items
    );
    return allItems.filter((item) => {
      if (selectedTypes.size > 0 && !selectedTypes.has(item.type)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q)
      );
    });
  }, [currentCat, selectedSubCat, searchQuery, selectedTypes]);

  function toggleType(type: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  function toggleSub(id: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectProcess(catId: string) {
    setSelectedCat(catId);
    setSelectedSubCat(null);
    setSelectedTypes(new Set());
  }

  function clearAllFilters() {
    setSelectedTypes(new Set());
    setSearchQuery('');
  }

  // If viewing an asset, show the full-screen asset editor
  if (viewingAsset) {
    return <AssetViewerPage asset={viewingAsset} onBack={() => setViewingAsset(null)} />;
  }

  return (
    <div className="flex h-screen bg-[#07111e] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 h-11 bg-[#07111e] border-b border-[#142235] flex items-center px-4 z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors mr-4"
        >
          <ChevronLeft size={14} /> Home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <Layers3 size={11} />
          </div>
          <span className="text-xs font-semibold tracking-widest text-blue-300 uppercase">AI Factory Creator</span>
        </div>
        <div className="ml-4 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="hover:text-slate-300 cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
          <ChevronRight size={11} />
          <span className="hover:text-slate-300 cursor-pointer transition-colors" onClick={() => navigate('/asset-library')}>3D Asset Library</span>
          {currentCat && (
            <>
              <ChevronRight size={11} />
              <span className="text-blue-400">{currentCat.name}</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate('/asset-library/lifecycle')}
            className="flex items-center gap-1.5 text-xs border border-[#1e3a55] text-slate-400 hover:text-slate-200 hover:border-[#2a4a6a] px-3 py-1.5 rounded-md transition-colors"
          >
            <History size={12} /> Lifecycle
          </button>
          <button
            onClick={() => navigate('/asset-library/asset-versions/irb-4600')}
            className="flex items-center gap-1.5 text-xs border border-[#1e3a55] text-slate-400 hover:text-slate-200 hover:border-[#2a4a6a] px-3 py-1.5 rounded-md transition-colors"
          >
            <GitBranch size={12} /> Version Mgmt
          </button>
          <button className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors">
            <Plus size={12} /> Upload Asset
          </button>
        </div>
      </div>

      <div className="flex w-full pt-11">
        {/* Left Category Tree */}
        <aside className="w-60 bg-[#07111e] border-r border-[#142235] flex flex-col flex-shrink-0 overflow-hidden">

          {/* ── Search + Filter combo ── */}
          <div className="p-3 border-b border-[#142235] space-y-2">
            {/* Input row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full bg-[#071526] border border-[#1e3a55] rounded-md pl-7 pr-3 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* Filter toggle button */}
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`relative flex items-center justify-center w-7 h-7 rounded border transition-colors flex-shrink-0 ${
                  filterOpen || activeFilterCount > 0
                    ? 'border-blue-500/60 bg-blue-600/15 text-blue-400'
                    : 'border-[#1e3a55] text-slate-500 hover:text-slate-200 hover:border-[#2a4a6a]'
                }`}
                title="Filter"
              >
                <SlidersHorizontal size={13} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter panel (collapsible) */}
            {filterOpen && (
              <div className="bg-[#071526] border border-[#1e3a55] rounded-md p-2.5 space-y-3">
                {/* 制程 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">制程</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PROCESS_OPTIONS.map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => selectProcess(proc.id)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          selectedCat === proc.id
                            ? 'bg-blue-600/25 text-blue-300 border-blue-500/60'
                            : 'text-slate-500 border-[#1e3a55] hover:text-slate-300 hover:border-[#2a4a6a]'
                        }`}
                      >
                        {proc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 类型 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">类型</span>
                    {selectedTypes.size > 0 && (
                      <button
                        onClick={() => setSelectedTypes(new Set())}
                        className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TYPE_OPTIONS.map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          selectedTypes.has(type)
                            ? 'bg-blue-600/25 text-blue-300 border-blue-500/60'
                            : 'text-slate-500 border-[#1e3a55] hover:text-slate-300 hover:border-[#2a4a6a]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear all */}
                {(activeFilterCount > 0 || searchQuery) && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full text-[10px] text-slate-500 hover:text-slate-300 border border-[#1e3a55] rounded py-1 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Category Tree */}
          <div className="flex-1 overflow-y-auto">
            {assetLibraryCategories.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => { setSelectedCat(cat.id); setSelectedSubCat(null); setSelectedTypes(new Set()); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[11px] transition-colors ${
                    selectedCat === cat.id
                      ? 'bg-blue-600/15 text-blue-300 border-l-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e243a] border-l-2 border-transparent'
                  }`}
                >
                  <Package size={12} className={selectedCat === cat.id ? 'text-blue-400' : 'text-slate-600'} />
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <span className="text-[10px] text-slate-600 bg-[#071526] px-1.5 py-0.5 rounded">{cat.count}</span>
                </button>

                {selectedCat === cat.id &&
                  cat.subcategories.map((sub) => (
                    <div key={sub.id}>
                      <button
                        onClick={() => {
                          toggleSub(sub.id);
                          setSelectedSubCat(selectedSubCat === sub.id ? null : sub.id);
                        }}
                        className={`w-full flex items-center gap-2 pl-7 pr-3 py-2 text-left text-[11px] transition-colors ${
                          selectedSubCat === sub.id
                            ? 'text-slate-200 bg-[#0e243a]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-[#0d1e2e]'
                        }`}
                      >
                        <ChevronDown
                          size={10}
                          className={`transition-transform flex-shrink-0 ${expandedSubs.has(sub.id) ? '' : '-rotate-90'}`}
                        />
                        <span className="flex-1">{sub.name}</span>
                        <span className="text-[10px] text-slate-600">{sub.count}</span>
                      </button>

                      {expandedSubs.has(sub.id) &&
                        sub.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedAsset(item)}
                            className={`w-full flex items-center gap-2 pl-11 pr-3 py-1.5 text-left text-[11px] transition-colors ${
                              selectedAsset?.id === item.id
                                ? 'text-blue-300 bg-blue-600/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-[#0d1e2e]'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-11 bg-[#071526] border-b border-[#142235] flex items-center px-4 gap-3 flex-shrink-0">
            <span className="text-xs text-slate-400">
              {currentCat?.name} —
              <span className="text-slate-200 ml-1">
                {filteredItems.length} items
                {selectedSubCat ? ` in ${currentCat?.subcategories.find((s) => s.id === selectedSubCat)?.name}` : ''}
                {selectedTypes.size > 0 ? ` · ${selectedTypes.size} type filter${selectedTypes.size > 1 ? 's' : ''}` : ''}
              </span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex border border-[#1e3a55] rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 py-1 transition-colors ${viewMode === 'grid' ? 'bg-[#1e3a55] text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Grid3X3 size={13} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 transition-colors ${viewMode === 'list' ? 'bg-[#1e3a55] text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Asset Grid / List */}
          <div className="flex-1 overflow-y-auto p-5">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Package size={48} strokeWidth={1} />
                <p className="text-sm mt-3">No assets found</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <AssetCard
                    key={item.id}
                    item={item}
                    selected={selectedAsset?.id === item.id}
                    onClick={() => setSelectedAsset(item)}
                    onEdit={() => { setSelectedAsset(item); setShowEditModal(true); }}
                    onView={() => setViewingAsset(item)}
                  />
                ))}
                <div className="bg-[#0b1d30] border border-dashed border-[#1e3a55] rounded-lg flex flex-col items-center justify-center h-44 cursor-pointer hover:border-blue-500/60 hover:bg-[#0e243a] transition-all group">
                  <Plus size={22} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span className="text-[11px] text-slate-600 mt-2 group-hover:text-slate-400 transition-colors">Add Asset</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredItems.map((item) => (
                  <AssetListRow
                    key={item.id}
                    item={item}
                    selected={selectedAsset?.id === item.id}
                    onClick={() => setSelectedAsset(item)}
                    onEdit={() => { setSelectedAsset(item); setShowEditModal(true); }}
                    onView={() => setViewingAsset(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedAsset && (
          <aside className="w-64 bg-[#071526] border-l border-[#142235] flex flex-col overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#142235]">
              <span className="text-xs font-semibold text-slate-200">Asset Details</span>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-[#142235] transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="h-40 overflow-hidden relative bg-[#07111e]">
              <img
                src={selectedAsset.thumbnail}
                alt={selectedAsset.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071526] to-transparent" />
              {/* Quick view button overlay */}
              <button
                onClick={() => setViewingAsset(selectedAsset)}
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"
              >
                <div className="flex items-center gap-1.5 text-white text-xs bg-blue-600/80 px-3 py-1.5 rounded-md">
                  <Eye size={12} /> Open in Viewer
                </div>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">{selectedAsset.name}</div>
                <div className="text-[11px] text-blue-400 mt-0.5">{selectedAsset.type}</div>
              </div>

              <DetailSection title="Basic Information">
                <DetailRow label="Category" value={selectedAsset.category.toUpperCase()} />
                <DetailRow label="Type" value={selectedAsset.type} />
                {selectedAsset.manufacturer && <DetailRow label="Manufacturer" value={selectedAsset.manufacturer} />}
                {selectedAsset.model && <DetailRow label="Model" value={selectedAsset.model} />}
              </DetailSection>

              <DetailSection title="3D Model Info">
                <DetailRow label="USD Path" value={`/Assets/${selectedAsset.id}.usd`} />
                <DetailRow label="Format" value="USD" />
                <DetailRow label="Poly Count" value="~24,500" />
              </DetailSection>

              <DetailSection title="Business Data">
                <DetailRow label="Standard CT" value="Not configured" dim />
                <DetailRow label="Capacity/Day" value="Not configured" dim />
                <DetailRow label="IoT Points" value="Not mapped" dim />
              </DetailSection>
            </div>

            <div className="p-4 border-t border-[#142235] space-y-2">
              <button
                onClick={() => setViewingAsset(selectedAsset)}
                className="w-full text-xs bg-[#0b1d30] hover:bg-[#0e243a] border border-[#1e3a55] hover:border-blue-500/50 text-slate-200 px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye size={11} /> Open in Viewer
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit2 size={11} /> Edit Business Data
              </button>
            </div>
          </aside>
        )}
      </div>

      {showEditModal && selectedAsset && (
        <AssetEditModal asset={selectedAsset} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AssetCard({
  item, selected, onClick, onEdit, onView,
}: {
  item: AssetItem; selected: boolean; onClick: () => void; onEdit: () => void; onView: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0b1d30] border rounded-lg overflow-hidden cursor-pointer transition-all group ${
        selected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-[#142235] hover:border-blue-500/40'
      }`}
    >
      <div className="h-32 relative overflow-hidden bg-[#071526]">
        <img
          src={item.thumbnail}
          alt={item.name}
          className="w-full h-full object-cover opacity-65 group-hover:opacity-85 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30]/60 to-transparent" />
        <div className="absolute top-2 left-2 bg-[#071526]/80 rounded px-1.5 py-0.5 text-[9px] text-slate-400">
          {item.type}
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="bg-blue-600/80 hover:bg-blue-600 rounded p-1 transition-colors"
            title="Edit Business Data"
          >
            <Edit2 size={10} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="bg-[#071526]/80 hover:bg-blue-600/80 rounded p-1 transition-colors"
            title="Open in Viewer"
          >
            <Eye size={10} className="text-slate-300 group-hover:text-white" />
          </button>
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-[11px] font-medium text-slate-200 truncate">{item.name}</div>
        {item.manufacturer && (
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.manufacturer}</div>
        )}
      </div>
    </div>
  );
}

function AssetListRow({
  item, selected, onClick, onEdit, onView,
}: {
  item: AssetItem; selected: boolean; onClick: () => void; onEdit: () => void; onView: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${
        selected ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-[#0b1d30] border border-[#142235] hover:border-blue-500/30'
      }`}
    >
      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#071526]">
        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover opacity-70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-slate-200 truncate">{item.name}</div>
        <div className="text-[10px] text-slate-500">{item.manufacturer} {item.model}</div>
      </div>
      <div className="text-[10px] text-slate-500 bg-[#071526] px-2 py-0.5 rounded">{item.type}</div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="text-slate-400 hover:text-blue-400 transition-colors p-1"
          title="Open in Viewer"
        >
          <Eye size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-slate-400 hover:text-blue-400 transition-colors p-1"
          title="Edit Business Data"
        >
          <Edit2 size={12} />
        </button>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-[10px] text-right ${dim ? 'text-slate-600 italic' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

function AssetEditModal({ asset, onClose }: { asset: AssetItem; onClose: () => void }) {
  const [data, setData] = useState({
    standardCT: '', capacityPerHr: '', availability: '',
    mtbf: '', lastMaintenance: '',
    protocol: '', ipAddress: '', port: '',
    notes: '',
  });

  function update(key: keyof typeof data, value: string) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[480px] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235] flex-shrink-0">
          <span className="text-sm font-semibold text-slate-100">Edit Business Data — {asset.name}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <ModalSection title="Production Data">
            <ModalField label="Standard Cycle Time (s)" value={data.standardCT} onChange={v => update('standardCT', v)} placeholder="e.g. 45" />
            <ModalField label="Capacity / Hour (pcs)" value={data.capacityPerHr} onChange={v => update('capacityPerHr', v)} placeholder="e.g. 1200" />
            <ModalField label="Availability (%)" value={data.availability} onChange={v => update('availability', v)} placeholder="e.g. 90" />
          </ModalSection>

          <ModalSection title="Maintenance">
            <ModalField label="MTBF (hrs)" value={data.mtbf} onChange={v => update('mtbf', v)} placeholder="e.g. 2000" />
            <ModalField label="Last Maintenance" value={data.lastMaintenance} onChange={v => update('lastMaintenance', v)} placeholder="e.g. 2024-12-01" />
          </ModalSection>

          <ModalSection title="IoT Configuration">
            <ModalField label="Protocol" value={data.protocol} onChange={v => update('protocol', v)} placeholder="e.g. OPC-UA" />
            <ModalField label="IP Address" value={data.ipAddress} onChange={v => update('ipAddress', v)} placeholder="e.g. 192.168.1.100" />
            <ModalField label="Port" value={data.port} onChange={v => update('port', v)} placeholder="e.g. 4840" />
          </ModalSection>

          <ModalSection title="Notes">
            <textarea
              value={data.notes}
              onChange={e => update('notes', e.target.value)}
              rows={3}
              placeholder="Technical notes..."
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </ModalSection>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors">
            Cancel
          </button>
          <button onClick={onClose} className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-[#142235] space-y-3">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}

function ModalField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}
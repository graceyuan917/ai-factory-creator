import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft, Move, RotateCcw, MousePointer2, ZoomIn, Maximize2, Grid3X3,
  Settings, Cpu, GitBranch, Box, ChevronDown, Edit2, Check, X, Package, Plus, Minus,
  Upload, Download, Trash2, Archive, Save,
} from 'lucide-react';
import { assetLibraryCategories, type AssetItem, type AssetStatus } from '../data/mockData';

// ── Mock asset structure tree ──────────────────────────────────────────────────
interface TreeNode {
  id: string;
  name: string;
  type: 'line' | 'station' | 'equipment' | 'component';
  children?: TreeNode[];
}

function buildAssetTree(asset: AssetItem): TreeNode {
  const isLine = asset.type?.includes('Line') || asset.type?.includes('产线');
  if (isLine) {
    return {
      id: asset.id, name: asset.name, type: 'line',
      children: [
        {
          id: `${asset.id}-s1`, name: 'Station 1 — Printing', type: 'station',
          children: [{ id: `${asset.id}-s1-p`, name: 'Stencil Printer', type: 'equipment', children: [] }],
        },
        {
          id: `${asset.id}-s2`, name: 'Station 2 — Placement', type: 'station',
          children: [
            { id: `${asset.id}-s2-m1`, name: 'Chip Mounter #1', type: 'equipment', children: [] },
            { id: `${asset.id}-s2-m2`, name: 'Chip Mounter #2', type: 'equipment', children: [] },
          ],
        },
        {
          id: `${asset.id}-s3`, name: 'Station 3 — Soldering', type: 'station',
          children: [{ id: `${asset.id}-s3-r`, name: 'Reflow Oven', type: 'equipment', children: [] }],
        },
      ],
    };
  }
  return {
    id: asset.id, name: asset.name, type: 'equipment',
    children: [
      { id: `${asset.id}-mech`, name: 'Mechanical Structure', type: 'component', children: [] },
      { id: `${asset.id}-ctrl`, name: 'Control System', type: 'component', children: [] },
      { id: `${asset.id}-sens`, name: 'Sensor Array', type: 'component', children: [] },
    ],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function findAssetById(id: string): AssetItem | undefined {
  for (const cat of assetLibraryCategories) {
    for (const sub of cat.subcategories) {
      const found = sub.items.find(item => item.id === id);
      if (found) return found;
    }
  }
  return undefined;
}

// ── Asset status display config ──────────────────────────────────────────────
const ASSET_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Draft',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  active:   { label: 'Active',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  inactive: { label: 'Inactive', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  archived: { label: 'Archived', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

// ══════════════════════════════════════════════════════════════════════════════
// AssetEditorPage — full-screen asset viewer
// ══════════════════════════════════════════════════════════════════════════════
export function AssetEditorPage() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const isNew = assetId === 'new';
  const asset = useMemo(() => (assetId && !isNew ? findAssetById(assetId) : undefined), [assetId, isNew]);

  const tree = useMemo(() => (asset ? buildAssetTree(asset) : null), [asset]);
  const [selectedNodeId, setSelectedNodeId] = useState(assetId ?? '');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([assetId ?? '', `${assetId}-s1`, `${assetId}-s2`, `${assetId}-s3`])
  );

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic-info', '3d-model', 'dimensions', 'iot-config', 'production', 'maintenance'])
  );
  const [viewTool, setViewTool] = useState<'select' | 'move' | 'rotate' | 'zoom'>('select');

  // Biz form state (inline edit)
  const emptyBiz = { protocol: '', ipAddress: '', port: '', standardCT: '', capacityPerHr: '', availability: '', mtbf: '', lastMaintenance: '' };
  const [bizData, setBizData] = useState(emptyBiz);
  const [pendingBiz, setPendingBiz] = useState(emptyBiz);
  const [isEditingBiz, setIsEditingBiz] = useState(false);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(asset?.name ?? 'New Asset');

  // Demo status toggle for action buttons
  const [currentStatus, setCurrentStatus] = useState<AssetStatus>(asset?.status ?? 'draft');
  const statusCfg = ASSET_STATUS_CONFIG[currentStatus] ?? ASSET_STATUS_CONFIG.draft;

  // Action button handlers (demo)
  function handleUpload() { alert('Upload new version'); }
  function handleSave() { alert('Asset saved'); }
  function handleDownload() { alert('Download started'); }
  function handleActivate() { setCurrentStatus('active'); }
  function handleDeactivate() { setCurrentStatus('inactive'); }
  function handleArchive() { setCurrentStatus('archived'); }
  function handleDelete() { if (window.confirm('Delete this asset?')) setCurrentStatus('archived'); }
  function handleRestore() { setCurrentStatus('inactive'); }

  function toggleSection(id: string) {
    setExpandedSections(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleExpand(id: string) {
    setExpandedNodes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function startEditBiz() { setPendingBiz({ ...bizData }); setIsEditingBiz(true); }
  function saveBiz() { setBizData({ ...pendingBiz }); setIsEditingBiz(false); }
  function cancelBiz() { setIsEditingBiz(false); }
  function updatePending(key: keyof typeof emptyBiz, value: string) {
    setPendingBiz(prev => ({ ...prev, [key]: value }));
  }
  const displayBiz = isEditingBiz ? pendingBiz : bizData;

  if (!asset && !isNew) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07111e] text-slate-400 text-sm">
        Asset not found.{' '}
        <button onClick={() => navigate('/asset-library')} className="ml-2 text-blue-400 underline">
          Back to library
        </button>
      </div>
    );
  }

  const viewTools = [
    { id: 'select', icon: <MousePointer2 size={13} />, title: 'Select' },
    { id: 'move',   icon: <Move size={13} />,          title: 'Move' },
    { id: 'rotate', icon: <RotateCcw size={13} />,     title: 'Rotate' },
    { id: 'zoom',   icon: <ZoomIn size={13} />,        title: 'Zoom' },
  ] as const;

  function renderNode(node: TreeNode, depth = 0): React.ReactNode {
    const hasChildren = !!node.children && node.children.length > 0;
    const expanded = expandedNodes.has(node.id);
    const selected = selectedNodeId === node.id;
    const icon =
      node.type === 'line'      ? <GitBranch size={11} className="flex-shrink-0" /> :
      node.type === 'station'   ? <Box size={11} className="flex-shrink-0" /> :
      node.type === 'component' ? <Settings size={11} className="flex-shrink-0" /> :
      <Cpu size={11} className="flex-shrink-0" />;
    return (
      <div key={node.id}>
        <button
          onClick={() => { setSelectedNodeId(node.id); if (hasChildren) toggleExpand(node.id); }}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`w-full flex items-center gap-1.5 pr-3 py-1.5 text-left text-[11px] transition-colors ${
            selected ? 'bg-blue-600/15 text-blue-300' : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e243a]'
          }`}
        >
          {hasChildren ? (
            <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          ) : (
            <span className="w-2.5 flex-shrink-0" />
          )}
          {icon}
          <span className="flex-1 truncate">{node.name}</span>
        </button>
        {hasChildren && expanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#07111e] text-slate-100 overflow-hidden">
      {/* ── Header ── */}
      <header className="h-11 bg-[#050f1a] border-b border-[#142235] flex items-center px-4 gap-3 flex-shrink-0 z-20">
        <button
          onClick={() => navigate('/asset-library')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-[11px] transition-colors flex-shrink-0"
        >
          <ChevronLeft size={13} /> Asset Library
        </button>
        <div className="w-px h-4 bg-[#1e3a55]" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Package size={12} className="text-blue-400 flex-shrink-0" />
          {isNew ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="bg-[#071526] border border-[#1e3a55] rounded px-2 py-0.5 text-[11px] text-slate-100 w-48 focus:outline-none focus:border-blue-500"
              placeholder="New Asset Name"
              autoFocus
            />
          ) : (
            <>
              {isEditingName ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                  className="bg-[#071526] border border-[#1e3a55] rounded px-2 py-0.5 text-[11px] text-slate-100 w-48 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <span className="text-[11px] font-medium text-slate-200 truncate">{asset.name}</span>
              )}
              <button
                onClick={() => { setEditName(asset.name); setIsEditingName(!isEditingName); }}
                className="text-slate-500 hover:text-blue-400 p-0.5 rounded transition-colors flex-shrink-0"
                title="Edit Name"
              >
                <Edit2 size={11} />
              </button>
              <span className="text-[9px] px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 flex-shrink-0">
                {asset.type}
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded border flex-shrink-0 ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleUpload}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 border border-[#1e3a55] rounded px-2 py-1 transition-colors"
            title="Upload new version"
          >
            <Upload size={11} /> Upload
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-[10px] text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 transition-colors"
          >
            <Save size={11} /> Save
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 border border-[#1e3a55] rounded px-2 py-1 transition-colors"
            title="Download"
          >
            <Download size={11} />
          </button>
          <div className="w-px h-4 bg-[#1e3a55]" />
          {currentStatus === 'draft' && (
            <button onClick={handleActivate}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-600/40 rounded px-2 py-1 transition-colors">
              <Check size={11} /> Activate
            </button>
          )}
          {currentStatus === 'inactive' && (
            <button onClick={handleActivate}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-600/40 rounded px-2 py-1 transition-colors">
              <Check size={11} /> Activate
            </button>
          )}
          {currentStatus === 'active' && (
            <button onClick={handleDeactivate}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white border border-[#1e3a55] hover:bg-amber-600/40 rounded px-2 py-1 transition-colors">
              <X size={11} /> Deactivate
            </button>
          )}
          {(currentStatus === 'draft' || currentStatus === 'active' || currentStatus === 'inactive') && (
            <button onClick={handleArchive}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-orange-400 border border-[#1e3a55] hover:border-orange-500/40 rounded px-2 py-1 transition-colors">
              <Archive size={11} /> Archive
            </button>
          )}
          {currentStatus === 'draft' && (
            <button onClick={handleDelete}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-white border border-red-500/30 hover:bg-red-600/40 rounded px-2 py-1 transition-colors">
              <Trash2 size={11} /> Delete
            </button>
          )}
          {currentStatus === 'archived' && (
            <button onClick={handleRestore}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-white border border-blue-500/30 hover:bg-blue-600/40 rounded px-2 py-1 transition-colors">
              <RotateCcw size={11} /> Restore
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Asset Structure Tree */}
        <aside className="w-52 bg-[#050f1a] border-r border-[#142235] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#142235]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Asset Structure</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {isNew ? (
              <div className="flex items-center justify-center h-full text-slate-600 text-[10px] px-3 text-center">
                Save the asset to generate its structure tree.
              </div>
            ) : (
              renderNode(tree)
            )}
          </div>
        </aside>

        {/* Center: 3D Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#07111e]">
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
            {/* Floating vertical toolbar (FactoryEditorPage style) */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[#071526]/90 border border-[#142235] rounded-lg p-1.5 backdrop-blur-sm z-10">
              {viewTools.map(t => (
                <button
                  key={t.id}
                  title={t.title}
                  onClick={() => setViewTool(t.id)}
                  className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                    viewTool === t.id
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-[#142235]'
                  }`}
                >
                  {t.icon}
                </button>
              ))}
              <div className="my-0.5 border-t border-[#142235]" />
              <button
                title="Fit View"
                className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-[#142235] transition-colors"
              >
                <Maximize2 size={13} />
              </button>
              <button
                title="Toggle Grid"
                className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-[#142235] transition-colors"
              >
                <Grid3X3 size={13} />
              </button>
            </div>

            {/* Center glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-96 h-96 rounded-full bg-blue-600/5 blur-3xl" />
            </div>

            {isNew ? (
              /* New Asset placeholder */
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Package size={48} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">New Asset</p>
                  <p className="text-[11px] text-slate-600 mt-1">Configure properties on the right panel to get started.</p>
                </div>
              </div>
            ) : (
              /* Asset image centered */
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
                  <div className="absolute -inset-1 rounded-xl border border-blue-500/40 pointer-events-none" />
                  <div className="absolute -bottom-7 left-0 right-0 text-center text-[11px] text-blue-300 font-medium">
                    {asset.name}
                  </div>
                </div>
              </div>
            )}

            {/* Coordinates overlay */}
            <div className="absolute bottom-3 left-3 text-[9px] text-slate-700 font-mono">
              X: 0.00  Y: 0.00  Z: 0.00
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button className="w-6 h-6 rounded bg-[#0b1d30] border border-[#142235] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors text-xs">
                <Minus size={10} />
              </button>
              <span className="text-[10px] text-slate-600">100%</span>
              <button className="w-6 h-6 rounded bg-[#0b1d30] border border-[#142235] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors text-xs">
                <Plus size={10} />
              </button>
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
            {isNew ? (
              <>
                <AccordionSection title="Basic Info" expanded={expandedSections.has('basic-info')} onToggle={() => toggleSection('basic-info')}>
                  <PropRow label="Name" value={editName || 'Not configured'} dim={!editName} />
                  <PropRow label="Type" value="—" dim />
                  <PropRow label="Category" value="—" dim />
                  <PropRow label="Status" value="Draft" />
                </AccordionSection>
                <AccordionSection title="3D Model" expanded={expandedSections.has('3d-model')} onToggle={() => toggleSection('3d-model')}>
                  <PropRow label="USD Path" value="—" dim />
                  <PropRow label="Format" value="—" dim />
                  <PropRow label="Poly Count" value="—" dim />
                </AccordionSection>
                <AccordionSection title="Dimensions" expanded={expandedSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
                  <PropRow label="Width" value="—" dim />
                  <PropRow label="Depth" value="—" dim />
                  <PropRow label="Height" value="—" dim />
                </AccordionSection>
                <AccordionSection title="IoT Configuration" expanded={expandedSections.has('iot-config')} onToggle={() => toggleSection('iot-config')}>
                  <PropRow label="Protocol" value="Not configured" dim />
                  <PropRow label="IP Address" value="Not configured" dim />
                  <PropRow label="Port" value="Not configured" dim />
                </AccordionSection>
                <AccordionSection title="Production Data" expanded={expandedSections.has('production')} onToggle={() => toggleSection('production')}>
                  <PropRow label="Standard CT" value="Not configured" dim />
                  <PropRow label="Capacity / hr" value="Not configured" dim />
                  <PropRow label="Availability" value="Not configured" dim />
                </AccordionSection>
                <AccordionSection title="Maintenance" expanded={expandedSections.has('maintenance')} onToggle={() => toggleSection('maintenance')}>
                  <PropRow label="MTBF" value="Not configured" dim />
                  <PropRow label="Last Maintenance" value="Not configured" dim />
                </AccordionSection>
              </>
            ) : (
              <>
                {/* Basic Info */}
                <AccordionSection title="Basic Info" expanded={expandedSections.has('basic-info')} onToggle={() => toggleSection('basic-info')}>
                  <PropRow label="Name" value={asset.name} />
                  <PropRow label="Type" value={asset.type} />
                  <PropRow label="Category" value={asset.category?.toUpperCase() ?? '—'} />
                  {asset.manufacturer && <PropRow label="Manufacturer" value={asset.manufacturer} />}
                  {asset.model && <PropRow label="Model No." value={asset.model} />}
                </AccordionSection>

                {/* 3D Model */}
                <AccordionSection title="3D Model" expanded={expandedSections.has('3d-model')} onToggle={() => toggleSection('3d-model')}>
                  <PropRow label="USD Path" value={`/Assets/${asset.id}.usd`} />
                  <PropRow label="Format" value="USD" />
                  <PropRow label="Poly Count" value="~24,500" />
                  <PropRow label="LOD Levels" value="3" />
                </AccordionSection>

                {/* Dimensions */}
                <AccordionSection title="Dimensions" expanded={expandedSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
                  <PropRow label="Width" value="2400 mm" />
                  <PropRow label="Depth" value="1800 mm" />
                  <PropRow label="Height" value="1650 mm" />
                </AccordionSection>

                {/* IoT Configuration */}
                <AccordionSection title="IoT Configuration" expanded={expandedSections.has('iot-config')} onToggle={() => toggleSection('iot-config')}>
                  <BizInputRow label="Protocol" value={displayBiz.protocol} onChange={v => updatePending('protocol', v)} placeholder="e.g. OPC-UA" editing={isEditingBiz} />
                  <BizInputRow label="IP Address" value={displayBiz.ipAddress} onChange={v => updatePending('ipAddress', v)} placeholder="e.g. 192.168.1.100" editing={isEditingBiz} />
                  <BizInputRow label="Port" value={displayBiz.port} onChange={v => updatePending('port', v)} placeholder="e.g. 4840" editing={isEditingBiz} />
                </AccordionSection>

                {/* Production Data */}
                <AccordionSection title="Production Data" expanded={expandedSections.has('production')} onToggle={() => toggleSection('production')}>
                  <BizInputRow label="Standard CT" value={displayBiz.standardCT} onChange={v => updatePending('standardCT', v)} placeholder="e.g. 45s" editing={isEditingBiz} />
                  <BizInputRow label="Capacity / hr" value={displayBiz.capacityPerHr} onChange={v => updatePending('capacityPerHr', v)} placeholder="e.g. 1200" editing={isEditingBiz} />
                  <BizInputRow label="Availability" value={displayBiz.availability} onChange={v => updatePending('availability', v)} placeholder="e.g. 90%" editing={isEditingBiz} />
                </AccordionSection>

                {/* Maintenance */}
                <AccordionSection title="Maintenance" expanded={expandedSections.has('maintenance')} onToggle={() => toggleSection('maintenance')}>
                  <BizInputRow label="MTBF" value={displayBiz.mtbf} onChange={v => updatePending('mtbf', v)} placeholder="e.g. 2000 hrs" editing={isEditingBiz} />
                  <BizInputRow label="Last Maintenance" value={displayBiz.lastMaintenance} onChange={v => updatePending('lastMaintenance', v)} placeholder="e.g. 2024-12-01" editing={isEditingBiz} />
                </AccordionSection>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AccordionSection({ title, expanded, onToggle, children }: {
  title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#142235]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#0a1c2e] transition-colors"
      >
        <span className="text-[11px] font-semibold text-slate-300">{title}</span>
        <ChevronDown size={12} className={`text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
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

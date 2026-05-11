import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Box, Layers3 } from 'lucide-react';

type AssetNode = { id: string; label: string; children?: AssetNode[] };
type AssetCat  = { id: string; label: string; icon: string; color: string; nodeType: 'line' | 'equipment'; children: AssetNode[] };

const ASSET_CATEGORIES: AssetCat[] = [
  {
    id: 'equipment', label: 'Production Equipment', icon: '⚙', color: 'text-blue-400', nodeType: 'equipment',
    children: [
      { id: 'a-smt', label: 'Chip Mounters', children: [
        { id: 'a-juki',  label: 'JUKI KE-3020 High-Speed Mounter' },
        { id: 'a-fuji',  label: 'FUJI NXT Multi-Function Mounter' },
        { id: 'a-asm',   label: 'ASM SIPLACE SX Mounter' },
      ]},
      { id: 'a-print', label: 'Solder Paste Printers', children: [
        { id: 'a-dek',   label: 'DEK Horizon Auto Printer' },
        { id: 'a-mpm',   label: 'MPM Momentum Printer' },
      ]},
      { id: 'a-reflow', label: 'Reflow Ovens', children: [
        { id: 'a-ersa',  label: 'Kurtz Ersa Reflow Oven' },
        { id: 'a-heller', label: 'Heller 1800EXL Reflow Oven' },
      ]},
      { id: 'a-aoi', label: 'Inspection Equipment', children: [
        { id: 'a-saki',  label: 'Saki BF-X2 SPI Inspector' },
        { id: 'a-koh',   label: 'Koh Young Zenith AOI' },
        { id: 'a-vi',    label: 'Viscom S3088 AOI' },
      ]},
    ],
  },
  {
    id: 'lines', label: 'Production Lines', icon: '▣', color: 'text-emerald-400', nodeType: 'line',
    children: [
      { id: 'l-smt', label: 'SMT Line Template', children: [] },
      { id: 'l-pth', label: 'PTH Line Template', children: [] },
      { id: 'l-assy', label: 'ASSY Line Template', children: [] },
    ],
  },
  {
    id: 'fixtures', label: 'Fixtures & Jigs', icon: '◈', color: 'text-amber-400', nodeType: 'equipment',
    children: [
      { id: 'f-jig1', label: 'Wave Solder Carrier Jig', children: [] },
      { id: 'f-jig2', label: 'Test Fixture', children: [] },
    ],
  },
  {
    id: 'facility', label: 'Facility Equipment', icon: '◉', color: 'text-violet-400', nodeType: 'equipment',
    children: [
      { id: 'fac-hvac', label: 'HVAC Air Handling Unit', children: [] },
      { id: 'fac-ups',  label: 'UPS Power System', children: [] },
    ],
  },
  {
    id: 'storage', label: 'Storage & Logistics', icon: '▷', color: 'text-slate-400', nodeType: 'equipment',
    children: [
      { id: 's-rack', label: 'Automated Storage Rack', children: [] },
      { id: 's-agv',  label: 'AGV Transport Vehicle', children: [] },
    ],
  },
];

function AssetLibraryNode({ node, depth, nodeType }: { node: AssetNode; depth: number; nodeType: 'line' | 'equipment' }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isLeaf = !hasChildren;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-factory-node', JSON.stringify({
      assetId: node.id,
      assetName: node.label,
      nodeType,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        draggable={isLeaf}
        onDragStart={isLeaf ? handleDragStart : undefined}
        className={`flex items-center gap-1 py-0.5 rounded-sm mx-1 transition-colors text-[10px] ${
          isLeaf
            ? 'cursor-grab text-slate-400 hover:text-blue-300 hover:bg-blue-600/10 active:cursor-grabbing'
            : 'cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-[#0f2035]'
        }`}
        style={{ paddingLeft: `${6 + depth * 10}px` }}
      >
        {hasChildren ? (
          open
            ? <ChevronDown size={9} className="text-slate-600 flex-shrink-0" />
            : <ChevronRight size={9} className="text-slate-600 flex-shrink-0" />
        ) : (
          <span className="w-2.5 flex-shrink-0 text-center text-slate-700">·</span>
        )}
        {isLeaf && <Box size={9} className="text-blue-400/70 flex-shrink-0" />}
        <span className="truncate">{node.label}</span>
      </div>
      {open && hasChildren && node.children!.map((child) => (
        <AssetLibraryNode key={child.id} node={child} depth={depth + 1} nodeType={nodeType} />
      ))}
    </div>
  );
}

export function AssetLibraryPanel() {
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['equipment']));

  function toggleCat(id: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function matchesSearch(node: AssetNode): boolean {
    if (node.label.toLowerCase().includes(search.toLowerCase())) return true;
    return (node.children ?? []).some(matchesSearch);
  }

  const filtered: AssetCat[] = search
    ? ASSET_CATEGORIES.map((cat) => ({
        ...cat,
        children: cat.children.filter(matchesSearch),
      })).filter((cat) => cat.children.length > 0)
    : ASSET_CATEGORIES;

  return (
    <div className="border-b border-[#142235] flex-shrink-0 flex flex-col" style={{ maxHeight: '45%' }}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#142235]">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Layers3 size={10} className="text-blue-400" /> Asset Library
        </span>
      </div>

      <div className="px-2 py-1.5 border-b border-[#142235]">
        <div className="relative">
          <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-6 pr-2 py-1 bg-[#040d18] border border-[#1e3a55] rounded text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => toggleCat(cat.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold hover:bg-[#0f2035] transition-colors"
            >
              {openCats.has(cat.id)
                ? <ChevronDown size={9} className="text-slate-600" />
                : <ChevronRight size={9} className="text-slate-600" />}
              <span className={cat.color}>{cat.icon}</span>
              <span className="text-slate-300">{cat.label}</span>
              <span className="ml-auto text-[9px] text-slate-600">{cat.children.length}</span>
            </button>
            {openCats.has(cat.id) && cat.children.map((node) => (
              <AssetLibraryNode key={node.id} node={node} depth={1} nodeType={cat.nodeType} />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-4">No assets found</div>
        )}
      </div>

      <div className="px-2 py-1.5 border-t border-[#142235]">
        <div className="text-[9px] text-slate-700 text-center">Drag assets into the 3D viewport or tree</div>
      </div>
    </div>
  );
}

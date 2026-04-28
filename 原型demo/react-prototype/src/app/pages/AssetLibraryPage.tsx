import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ChevronLeft, ChevronRight, ChevronDown, Search, Package, Layers3,
  Grid3X3, List, Plus, Edit2, X, SlidersHorizontal, Check,
  Move, RotateCcw, MousePointer2, ZoomIn, Maximize2, Settings,
  Cpu, GitBranch, Box, Activity, Wifi, BarChart3, Info, History, Trash2,
  Download, CheckSquare, Copy, Eye,
} from 'lucide-react';
import { assetLibraryCategories, type AssetItem, type AssetLibraryCategory, type AssetSubCategory, type AssetStatus } from '../data/mockData';

const MOCK_DATA_VERSION = '1.0';
const LOCAL_STORAGE_KEY = 'asset-library-categories';
const LOCAL_STORAGE_VERSION_KEY = 'asset-library-categories-version';

const ASSET_STATUS_CONFIG: Record<AssetStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  active:   { label: 'Active',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  inactive: { label: 'Inactive', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  archived: { label: 'Archived', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

// ── 制程 & 类型 filter options (固定) ─────────────────────────────────────
const PROCESS_OPTIONS = [
  { id: 'smt', label: 'SMT' },
  { id: 'pth', label: 'PTH' },
  { id: 'assy', label: 'ASSY' },
  { id: 'test', label: 'TEST' },
  { id: 'packing', label: 'PACKING' },
];

const TYPE_OPTIONS = ['产线', '设备', '公辅机房', '治具', '仓储'];

function genId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(['smt-lines', 'stencil-printers', 'chip-mounters', 'reflow-ovens']));
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [copyingAsset, setCopyingAsset] = useState<AssetItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Batch selection state ──────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchConfirm, setBatchConfirm] = useState<{
    type: 'toggle' | 'delete';
    enableIds: string[];
    disableIds: string[];
    deleteIds: string[];
    blockedIds: { id: string; reason: string }[];
  } | null>(null);
  const [batchResult, setBatchResult] = useState<{
    type: 'download' | 'toggle' | 'delete';
    success: number;
    fail: { id: string; name: string; reason: string }[];
  } | null>(null);

  // ── Categories state (mutable, persisted, version-gated) ─────────────────
  const [categories, setCategories] = useState<AssetLibraryCategory[]>(() => {
    try {
      const savedVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);
      if (savedVersion !== MOCK_DATA_VERSION) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return [...assetLibraryCategories];
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AssetLibraryCategory[]) : [...assetLibraryCategories];
    } catch {
      return [...assetLibraryCategories];
    }
  });

  // ── Dialog states ──────────────────────────────────────────────────────
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editCatTarget, setEditCatTarget] = useState<AssetLibraryCategory | null>(null);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [editSubTarget, setEditSubTarget] = useState<{ catId: string; sub?: AssetSubCategory } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    catId?: string;
  } | null>(null);

  // Persist to localStorage (with version for cache invalidation)
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, MOCK_DATA_VERSION);
  }, [categories]);

  // ── CRUD handlers ──────────────────────────────────────────────────────
  function handleAddCategory(name: string, desc: string) {
    const newCat: AssetLibraryCategory = {
      id: genId(), name, count: 0, thumbnail: '', description: desc, subcategories: [],
    };
    setCategories(prev => [...prev, newCat]);
  }

  function handleEditCategory(id: string, name: string, desc: string) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, description: desc } : c));
  }

  function handleDeleteCategory(id: string) {
    const remaining = categories.filter(c => c.id !== id);
    setCategories(remaining);
    if (selectedCat === id) {
      setSelectedCat(remaining.length > 0 ? remaining[0].id : '');
      setSelectedSubCat(null);
    }
  }

  function handleAddSubCategory(catId: string, name: string) {
    const newSub: AssetSubCategory = {
      id: genId(), name, count: 0, items: [],
    };
    setCategories(prev => prev.map(c => c.id === catId
      ? { ...c, subcategories: [...c.subcategories, newSub] } : c
    ));
  }

  function handleEditSubCategory(catId: string, subId: string, name: string) {
    setCategories(prev => prev.map(c => c.id === catId
      ? { ...c, subcategories: c.subcategories.map(s => s.id === subId ? { ...s, name } : s) }
      : c
    ));
  }

  function handleDeleteSubCategory(catId: string, subId: string) {
    setCategories(prev => prev.map(c => c.id === catId
      ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) }
      : c
    ));
    if (selectedSubCat === subId) setSelectedSubCat(null);
  }

  const currentCat = categories.find((c) => c.id === selectedCat);

  const activeFilterCount = selectedTypes.size + (selectedStatus !== 'all' ? 1 : 0);

  const filteredItems = useMemo(() => {
    if (!currentCat) return [];
    const allItems = currentCat.subcategories.flatMap((s) =>
      selectedSubCat && s.id !== selectedSubCat ? [] : s.items
    );
    return allItems.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(item.type)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.manufacturer?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q)
      );
    });
  }, [currentCat, selectedSubCat, searchQuery, selectedTypes, selectedStatus]);

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
    setSelectedStatus('all');
    setSearchQuery('');
  }

  // ── Batch selection handlers ────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  }

  function enterSelectMode() {
    setSelectMode(true);
    setSelectedAsset(null);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  /** Find all assets across all categories by IDs */
  function findAssetsByIds(ids: Set<string>): AssetItem[] {
    const result: AssetItem[] = [];
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        for (const item of sub.items) {
          if (ids.has(item.id)) result.push(item);
        }
      }
    }
    return result;
  }

  /** Update asset status in state */
  function updateAssetStatus(id: string, newStatus: AssetStatus) {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      subcategories: cat.subcategories.map(sub => ({
        ...sub,
        items: sub.items.map(item =>
          item.id === id ? { ...item, status: newStatus } : item
        ),
      })),
    })));
  }

  /** Execute batch enable/disable */
  function executeBatchToggle(enableIds: string[], disableIds: string[]) {
    const fail: { id: string; name: string; reason: string }[] = [];
    for (const id of enableIds) updateAssetStatus(id, 'active');
    for (const id of disableIds) updateAssetStatus(id, 'inactive');
    setBatchResult({
      type: 'toggle',
      success: enableIds.length + disableIds.length,
      fail: [],
    });
    setSelectedIds(new Set());
    setBatchConfirm(null);
  }

  /** Validate and prepare batch delete — 必须遵循状态-操作映射 */
  function prepareBatchDelete() {
    const assets = findAssetsByIds(selectedIds);
    const deleteIds: string[] = [];
    const blockedIds: { id: string; reason: string }[] = [];
    for (const a of assets) {
      // 草稿: 可删除
      if (a.status === 'draft') {
        deleteIds.push(a.id);
        continue;
      }
      // 禁用: 被项目引用的不可删除
      if (a.status === 'inactive') {
        if (a.referencedByProjects && a.referencedByProjects > 0) {
          blockedIds.push({ id: a.id, reason: `被 ${a.referencedByProjects} 个项目引用，不可删除` });
        } else {
          deleteIds.push(a.id);
        }
        continue;
      }
      // 激活: 必须先禁用
      if (a.status === 'active') {
        blockedIds.push({ id: a.id, reason: '激活状态的资产必须先禁用才能删除' });
        continue;
      }
      // 归档: 只有管理员可操作
      if (a.status === 'archived') {
        blockedIds.push({ id: a.id, reason: '归档资产只有管理员可操作' });
        continue;
      }
    }
    setBatchConfirm({
      type: 'delete',
      enableIds: [],
      disableIds: [],
      deleteIds,
      blockedIds,
    });
  }

  /** Execute batch delete */
  function executeBatchDelete(ids: string[]) {
    // Remove assets from all categories
    setCategories(prev => prev.map(cat => ({
      ...cat,
      count: cat.count - cat.subcategories.reduce((sum, sub) =>
        sum + sub.items.filter(i => ids.includes(i.id)).length, 0
      ),
      subcategories: cat.subcategories.map(sub => ({
        ...sub,
        count: sub.count - sub.items.filter(i => ids.includes(i.id)).length,
        items: sub.items.filter(i => !ids.includes(i.id)),
      })),
    })));
    setSelectedIds(new Set());
    setBatchConfirm(null);
  }

  /** Batch download */
  function handleBatchDownload() {
    const names = findAssetsByIds(selectedIds).map(a => a.name);
    setBatchResult({
      type: 'download',
      success: names.length,
      fail: [],
    });
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

                {/* 状态 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">状态</span>
                    {selectedStatus !== 'all' && (
                      <button onClick={() => setSelectedStatus('all')} className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'active', 'draft', 'inactive', 'archived'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedStatus(s)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          selectedStatus === s
                            ? 'bg-blue-600/25 text-blue-300 border-blue-500/60'
                            : 'text-slate-500 border-[#1e3a55] hover:text-slate-300 hover:border-[#2a4a6a]'
                        }`}
                      >
                        {s === 'all' ? 'All' : ASSET_STATUS_CONFIG[s].label}
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
            {/* ── Tree header with Add button ── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#142235] sticky top-0 bg-[#07111e] z-10">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Categories</span>
              <button
                onClick={() => { setEditCatTarget(null); setShowCatDialog(true); }}
                className="text-slate-500 hover:text-blue-400 p-0.5 rounded transition-colors"
                title="Add Category"
              >
                <Plus size={13} />
              </button>
            </div>
            {categories.map((cat) => (
              <div key={cat.id}>
                {/* ── Category row ── */}
                <div className="group relative">
                  <button
                    onClick={() => { setSelectedCat(cat.id); setSelectedSubCat(null); setSelectedTypes(new Set()); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[11px] transition-colors ${
                      selectedCat === cat.id
                        ? 'bg-blue-600/15 text-blue-300 border-l-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e243a] border-l-2 border-transparent'
                    }`}
                  >
                    <Package size={12} className={selectedCat === cat.id ? 'text-blue-400' : 'text-slate-600'} />
                    <span className="flex-1 font-medium truncate">{cat.name}</span>
                    <span className="text-[10px] text-slate-600 bg-[#071526] px-1.5 py-0.5 rounded">{cat.count}</span>
                  </button>
                  {/* Hover actions */}
                  <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 bg-[#07111e]/90 pl-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCatTarget(cat); setShowCatDialog(true); }}
                      className="text-slate-500 hover:text-blue-400 p-0.5 rounded transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditSubTarget({ catId: cat.id }); setShowSubDialog(true); }}
                      className="text-slate-500 hover:text-green-400 p-0.5 rounded transition-colors"
                      title="Add Subcategory"
                    >
                      <Plus size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'category', id: cat.id, name: cat.name }); }}
                      className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                {selectedCat === cat.id &&
                  cat.subcategories.map((sub) => (
                    <div key={sub.id}>
                      {/* ── Subcategory row ── */}
                      <div className="group relative">
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
                          <span className="flex-1 truncate">{sub.name}</span>
                          <span className="text-[10px] text-slate-600">{sub.count}</span>
                        </button>
                        {/* Hover actions */}
                        <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 bg-[#07111e]/90 pl-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditSubTarget({ catId: cat.id, sub }); setShowSubDialog(true); }}
                            className="text-slate-500 hover:text-blue-400 p-0.5 rounded transition-colors"
                            title="Edit Subcategory"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'subcategory', id: sub.id, name: sub.name, catId: cat.id }); }}
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                            title="Delete Subcategory"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>

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
              {!selectMode && (
                <button
                  onClick={enterSelectMode}
                  className="flex items-center gap-1.5 text-xs border border-[#1e3a55] text-slate-400 hover:text-slate-200 hover:border-[#2a4a6a] px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <CheckSquare size={13} /> Batch Select
                </button>
              )}
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

          {/* Batch Toolbar (shown when in select mode) */}
          {selectMode && (
            <div className="h-10 bg-blue-600/10 border-b border-blue-500/30 flex items-center px-4 gap-3 flex-shrink-0">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectMode && selectedIds.size === filteredItems.length && filteredItems.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3 h-3 rounded border-slate-500 bg-transparent accent-blue-500"
                />
                <span className="text-[11px] text-blue-300 font-medium">{selectedIds.size} selected</span>
              </label>
              <div className="w-px h-4 bg-blue-500/30" />
              <button
                onClick={handleBatchDownload}
                disabled={selectedIds.size === 0}
                className="text-[11px] text-slate-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1 rounded transition-colors"
              >
                <Download size={11} className="inline mr-1" />Batch Download
              </button>
              <button
                onClick={() => {
                  const assets = findAssetsByIds(selectedIds);
                  const enableIds = assets.filter(a => a.status === 'inactive' || a.status === 'draft').map(a => a.id);
                  if (enableIds.length === 0) return;
                  setBatchConfirm({ type: 'toggle', enableIds, disableIds: [], deleteIds: [], blockedIds: [] });
                }}
                disabled={!findAssetsByIds(selectedIds).some(a => a.status === 'inactive' || a.status === 'draft')}
                className="text-[11px] text-slate-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1 rounded transition-colors"
              >
                <Check size={11} className="inline mr-1" />批量启用
              </button>
              <button
                onClick={() => {
                  const assets = findAssetsByIds(selectedIds);
                  const disableIds = assets.filter(a => a.status === 'active').map(a => a.id);
                  if (disableIds.length === 0) return;
                  setBatchConfirm({ type: 'toggle', enableIds: [], disableIds, deleteIds: [], blockedIds: [] });
                }}
                disabled={!findAssetsByIds(selectedIds).some(a => a.status === 'active')}
                className="text-[11px] text-slate-300 hover:text-white bg-amber-600/20 hover:bg-amber-600/40 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1 rounded transition-colors"
              >
                <SlidersHorizontal size={11} className="inline mr-1" />批量禁用
              </button>
              <button
                onClick={prepareBatchDelete}
                disabled={selectedIds.size === 0}
                className="text-[11px] text-red-300 hover:text-white bg-red-600/20 hover:bg-red-600/40 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1 rounded transition-colors"
              >
                <Trash2 size={11} className="inline mr-1" />Batch Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={11} className="inline mr-1" />Clear
              </button>
              <button
                onClick={exitSelectMode}
                className="text-[11px] text-slate-300 hover:text-white bg-slate-600/30 hover:bg-slate-600/50 px-2.5 py-1 rounded transition-colors ml-auto"
              >
                Cancel
              </button>
            </div>
          )}

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
                    selectMode={selectMode}
                    isChecked={selectedIds.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onClick={() => setSelectedAsset(item)}
                    onView={() => navigate(`/asset-library/${item.id}/editor`)}
                    onCopy={() => setCopyingAsset(item)}
                  />
                ))}
                <div className="bg-[#0b1d30] border border-dashed border-[#1e3a55] rounded-lg flex flex-col items-center justify-center h-44 cursor-pointer hover:border-blue-500/60 hover:bg-[#0e243a] transition-all group"
                  onClick={() => navigate('/asset-library/new/editor')}>
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
                    selectMode={selectMode}
                    isChecked={selectedIds.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onClick={() => setSelectedAsset(item)}
                    onEdit={() => { setSelectedAsset(item); setShowEditModal(true); }}
                    onView={() => navigate(`/asset-library/${item.id}/editor`)}
                    onCopy={() => setCopyingAsset(item)}
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
              {/* Quick open editor overlay */}
              <button
                onClick={() => navigate(`/asset-library/${selectedAsset.id}/editor`)}
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"
              >
                <div className="flex items-center gap-1.5 text-white text-xs bg-blue-600/80 px-3 py-1.5 rounded-md">
                  <Eye size={12} /> Open Editor
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
                <DetailRow label="Status" value={ASSET_STATUS_CONFIG[selectedAsset.status]?.label ?? '—'} />
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
                onClick={() => navigate(`/asset-library/${selectedAsset.id}/editor`)}
                className="w-full text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/60 text-blue-300 px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye size={11} /> Open Editor
              </button>
              <button
                onClick={() => setCopyingAsset(selectedAsset)}
                className="w-full text-xs bg-[#0b1d30] hover:bg-[#0e243a] border border-[#1e3a55] hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300 px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy size={11} /> Copy Asset
              </button>
            </div>
          </aside>
        )}
      </div>

      {showEditModal && selectedAsset && (
        <AssetEditModal asset={selectedAsset} onClose={() => setShowEditModal(false)} />
      )}

      {copyingAsset && (
        <CopyAssetModal asset={copyingAsset} onClose={() => setCopyingAsset(null)} />
      )}

      {/* ── CRUD Dialogs ── */}
      {showCatDialog && (
        <CategoryDialog
          target={editCatTarget}
          onSave={(name, desc) => {
            if (editCatTarget) {
              handleEditCategory(editCatTarget.id, name, desc);
            } else {
              handleAddCategory(name, desc);
            }
            setShowCatDialog(false);
            setEditCatTarget(null);
          }}
          onCancel={() => { setShowCatDialog(false); setEditCatTarget(null); }}
        />
      )}
      {showSubDialog && editSubTarget && (
        <SubCategoryDialog
          catId={editSubTarget.catId}
          target={editSubTarget.sub}
          onSave={(catId, name) => {
            if (editSubTarget.sub) {
              handleEditSubCategory(catId, editSubTarget.sub.id, name);
            } else {
              handleAddSubCategory(catId, name);
            }
            setShowSubDialog(false);
            setEditSubTarget(null);
          }}
          onCancel={() => { setShowSubDialog(false); setEditSubTarget(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.type === 'category' ? 'Category' : 'Subcategory'}`}
          message={
            confirmDelete.type === 'category'
              ? `Are you sure you want to delete "${confirmDelete.name}"? This will also remove all subcategories and assets within it.`
              : `Are you sure you want to delete "${confirmDelete.name}"? This will also remove all assets within it.`
          }
          onConfirm={() => {
            if (confirmDelete.type === 'category') {
              handleDeleteCategory(confirmDelete.id);
            } else if (confirmDelete.catId) {
              handleDeleteSubCategory(confirmDelete.catId, confirmDelete.id);
            }
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── Batch Operation Dialogs ── */}
      {batchConfirm?.type === 'toggle' && (
        <ConfirmDialog
          title="批量启用/禁用"
          message={
            batchConfirm.enableIds.length > 0 && batchConfirm.disableIds.length > 0
              ? `将启用 ${batchConfirm.enableIds.length} 个资产，禁用 ${batchConfirm.disableIds.length} 个资产。确定要继续吗？`
              : batchConfirm.enableIds.length > 0
                ? `将启用 ${batchConfirm.enableIds.length} 个资产（草稿/禁用 → 激活）。确定要继续吗？`
                : `将禁用 ${batchConfirm.disableIds.length} 个资产（激活 → 禁用）。确定要继续吗？`
          }
          confirmLabel="Confirm"
          confirmCls="bg-blue-600 hover:bg-blue-700"
          onConfirm={() => executeBatchToggle(batchConfirm.enableIds, batchConfirm.disableIds)}
          onCancel={() => setBatchConfirm(null)}
        />
      )}
      {batchConfirm?.type === 'delete' && (
        <BatchDeleteDialog
          deleteIds={batchConfirm.deleteIds}
          blockedIds={batchConfirm.blockedIds}
          onConfirm={() => executeBatchDelete(batchConfirm.deleteIds)}
          onCancel={() => setBatchConfirm(null)}
        />
      )}
      {batchResult && (
        <BatchResultDialog
          result={batchResult}
          onClose={() => setBatchResult(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CopyAssetModal({ asset, onClose }: { asset: AssetItem; onClose: () => void }) {
  const latestVersion = asset.versions?.[asset.versions.length - 1];
  const [sourceVersionId, setSourceVersionId] = useState(latestVersion?.id ?? '');
  const [newName, setNewName] = useState(`${asset.name}_copy`);

  function handleConfirm() {
    // In a real app this would create the new asset via API
    alert(`已创建新资产：${newName}（从 ${asset.name} ${latestVersion?.versionLabel ?? 'V1.0'} 复制）`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[440px] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <div className="flex items-center gap-2">
            <Copy size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold text-slate-100">Copy Asset</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] text-slate-400">
            Creates a fully independent new asset with its own version history starting at <span className="text-blue-300 font-medium">V1.0</span>.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Source Version</label>
            {asset.versions && asset.versions.length > 0 ? (
              <select
                value={sourceVersionId}
                onChange={e => setSourceVersionId(e.target.value)}
                className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {asset.versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.versionLabel} — {v.status} {v.referencedByProjects ? `(${v.referencedByProjects} projects)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[11px] text-slate-500 bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2">
                V1.0 (current)
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">New Asset Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter new asset name"
            />
          </div>

          <div className="bg-[#071526] border border-[#1e3a55] rounded-md p-3">
            <div className="text-[10px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Copied from</span>
                <span className="text-slate-300">{asset.name} {asset.versions?.find(v => v.id === sourceVersionId)?.versionLabel ?? 'V1.0'}</span>
              </div>
              <div className="flex justify-between">
                <span>New version</span>
                <span className="text-blue-300 font-medium">V1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Initial status</span>
                <span className="text-amber-400">Draft</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!newName.trim()}
            className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-1.5"
          >
            <Copy size={11} /> Confirm Copy
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetCard({
  item, selected, selectMode, isChecked, onToggleSelect, onClick, onView, onCopy,
}: {
  item: AssetItem; selected: boolean; selectMode?: boolean; isChecked?: boolean; onToggleSelect?: () => void; onClick: () => void; onView: () => void; onCopy: () => void;
}) {
  const st = ASSET_STATUS_CONFIG[item.status] ?? ASSET_STATUS_CONFIG.active;
  const versionCount = item.versions?.length ?? 0;
  return (
    <div
      onClick={onClick}
      className={`bg-[#0b1d30] border rounded-lg overflow-hidden cursor-pointer transition-all group ${
        selected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-[#142235] hover:border-blue-500/40'
      } ${selectMode && isChecked ? 'ring-1 ring-blue-500/30' : ''}`}
    >
      <div className="h-32 relative overflow-hidden bg-[#071526]">
        <img
          src={item.thumbnail}
          alt={item.name}
          className="w-full h-full object-cover opacity-65 group-hover:opacity-85 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30]/60 to-transparent" />
        {/* Select mode checkbox */}
        {selectMode && (
          <div className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={!!isChecked}
              onChange={onToggleSelect}
              className="w-3.5 h-3.5 rounded border-slate-500 bg-[#071526]/80 accent-blue-500 cursor-pointer"
            />
          </div>
        )}
        {/* Version count badge (top-left, hidden in select mode) */}
        {!selectMode && versionCount > 0 && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/80 text-blue-100 font-medium">
              {versionCount}V
            </span>
          </div>
        )}
        {/* Status badge (top-right, always visible) */}
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${st.cls}`}>
            {st.label}
          </span>
        </div>
        {/* Type badge */}
        <div className="absolute bottom-2 left-2 bg-[#071526]/80 rounded px-1.5 py-0.5 text-[9px] text-slate-400">
          {item.type}
        </div>
        {/* Hover actions */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="bg-[#071526]/80 hover:bg-emerald-600/80 rounded p-1 transition-colors"
            title="Copy Asset"
          >
            <Copy size={10} className="text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="bg-blue-600/80 hover:bg-blue-600 rounded p-1 transition-colors"
            title="Open Editor"
          >
            <Eye size={10} className="text-white" />
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
  item, selected, selectMode, isChecked, onToggleSelect, onClick, onEdit, onView, onCopy,
}: {
  item: AssetItem; selected: boolean; selectMode?: boolean; isChecked?: boolean; onToggleSelect?: () => void; onClick: () => void; onEdit: () => void; onView: () => void; onCopy: () => void;
}) {
  const st = ASSET_STATUS_CONFIG[item.status] ?? ASSET_STATUS_CONFIG.active;
  const versionCount = item.versions?.length ?? 0;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${
        selected ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-[#0b1d30] border border-[#142235] hover:border-blue-500/30'
      }`}
    >
      {/* Checkbox (only in select mode) */}
      {selectMode && (
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!isChecked}
            onChange={onToggleSelect}
            className="w-3.5 h-3.5 rounded border-slate-500 bg-transparent accent-blue-500 cursor-pointer flex-shrink-0"
          />
        </div>
      )}
      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-[#071526]">
        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover opacity-70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-200 truncate">{item.name}</span>
          {versionCount > 0 && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-600/30 text-blue-300 font-medium flex-shrink-0">
              {versionCount}V
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">{item.manufacturer} {item.model}</div>
      </div>
      {/* Status column */}
      <div className="w-16 flex-shrink-0">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls} inline-block`}>
          {st.label}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 bg-[#071526] px-2 py-0.5 rounded">{item.type}</div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
          title="Copy Asset"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="text-slate-400 hover:text-blue-400 transition-colors p-1"
          title="Open Editor"
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

// ══════════════════════════════════════════════════════════════════════════════
// Dialog Components for Category/Subcategory CRUD
// ══════════════════════════════════════════════════════════════════════════════

function ConfirmDialog({
  title, message, onConfirm, onCancel, confirmLabel, confirmCls,
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; confirmCls?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[380px] shadow-2xl">
        <div className="px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">{title}</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-xs text-white rounded-md font-medium transition-colors ${confirmCls ?? 'bg-red-600 hover:bg-red-700'}`}
          >
            {confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryDialog({
  target, onSave, onCancel,
}: {
  target: AssetLibraryCategory | null;
  onSave: (name: string, desc: string) => void;
  onCancel: () => void;
}) {
  const isEdit = target !== null;
  const [name, setName] = useState(target?.name ?? '');
  const [desc, setDesc] = useState(target?.description ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), desc.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </span>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. SMT Asset Library"
                className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Category description..."
                rows={3}
                className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:text-slate-400 text-white rounded-md font-medium transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubCategoryDialog({
  catId, target, onSave, onCancel,
}: {
  catId: string;
  target: AssetSubCategory | undefined;
  onSave: (catId: string, name: string) => void;
  onCancel: () => void;
}) {
  const isEdit = target !== undefined;
  const [name, setName] = useState(target?.name ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(catId, name.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">
            {isEdit ? 'Edit Subcategory' : 'Add Subcategory'}
          </span>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4">
            <label className="block text-[11px] text-slate-400 mb-1.5">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. SMT Lines"
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:text-slate-400 text-white rounded-md font-medium transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Add Subcategory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Batch Operation Dialogs
// ══════════════════════════════════════════════════════════════════════════════

function BatchDeleteDialog({
  deleteIds, blockedIds, onConfirm, onCancel,
}: {
  deleteIds: string[];
  blockedIds: { id: string; reason: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[440px] shadow-2xl">
        <div className="px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">批量删除</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {deleteIds.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-2">
                <Check size={13} />
                <span>{deleteIds.length} 个资产可删除</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                确定要删除这 {deleteIds.length} 个资产吗？此操作不可撤销。
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Info size={13} />
              <span>没有符合条件的资产可删除</span>
            </div>
          )}
          {blockedIds.length > 0 && (
            <div className="bg-red-600/10 border border-red-500/30 rounded-md p-3 space-y-1.5">
              <div className="text-[11px] font-medium text-red-400">以下资产无法删除：</div>
              {blockedIds.map(b => (
                <div key={b.id} className="text-[10px] text-slate-400 flex items-start gap-1.5">
                  <X size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{b.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#142235]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
          >
            Cancel
          </button>
          {deleteIds.length > 0 && (
            <button
              onClick={onConfirm}
              className="px-5 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
            >
              删除 {deleteIds.length} 个资产
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchResultDialog({
  result, onClose,
}: {
  result: { type: 'download' | 'toggle' | 'delete'; success: number; fail: { id: string; name: string; reason: string }[] };
  onClose: () => void;
}) {
  const title = result.type === 'download' ? '批量下载'
    : result.type === 'toggle' ? '批量启用/禁用'
    : '批量删除';
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">{title}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-xs text-slate-200">{result.success} 个操作成功</span>
          </div>
          {result.fail.length > 0 && (
            <div className="bg-red-600/10 border border-red-500/30 rounded-md p-3 space-y-1.5">
              <div className="text-[11px] font-medium text-red-400">失败详情：</div>
              {result.fail.map(f => (
                <div key={f.id} className="text-[10px] text-slate-400">{f.name}: {f.reason}</div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end px-5 py-4 border-t border-[#142235]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
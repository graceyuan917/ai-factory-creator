import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronRight, ChevronDown, ChevronLeft, Plus, MoreHorizontal,
  Eye, Send, Layers3, Database, Cpu, Settings, X, Edit2, Check,
  Save, ShieldCheck, RefreshCw,
  Link2, Activity, BarChart3, Zap, FileText, Wrench, BookOpen,
  ClipboardList, Info, Wifi, WifiOff, Radio, ChevronUp, Menu,
  Search, Maximize2, RotateCcw, Move, MousePointer2, ZoomIn, ZoomOut, Grid3X3, Play, Pause,
  Navigation,
  GitBranch, Box, Building2, Cog, Copy, Trash2,
  Upload, HardDrive, FileBox, Unlink, LinkIcon, AlertCircle, FolderOpen,
} from 'lucide-react';
import {
  mockFactoryProjects,
  houstonFactoryTree,
  californiaFactoryTree,
  mockDataPoints,
  generateValidationItems,
  type FactoryNode,
  type ProjectStatus,
  type DataPoint,
} from '../data/mockData';
import { NewProjectModal } from '../components/editor/NewProjectModal';
import { ValidationModal } from '../components/editor/ValidationModal';
import { updateNodeStatusIfChanged, updateTreeStatuses } from '../utils/statusCalculator';

// ── Types ──────────────────────────────────────────────────────────────────
type RightTab = 'base' | 'iot' | 'events' | 'monitoring' | 'metrics';

type USDFileFormat = 'usd' | 'usda' | 'usdc' | 'usdz' | 'folder';
interface USDFile {
  id: string;
  name: string;
  size: number; // MB
  format: USDFileFormat;
  uploadedAt: string;
  status: 'uploaded' | 'linked';
  progress?: number; // 0-100, present while uploading
}

// ── Helpers ────────────────────────────────────────────────────────────────
function findNode(tree: FactoryNode, id: string): FactoryNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Returns the parent line node id for a given equipment node id, or null. */
function findParentLine(tree: FactoryNode, equipmentId: string): string | null {
  for (const child of tree.children ?? []) {
    if (child.type === 'line') {
      if ((child.children ?? []).some((eq) => eq.id === equipmentId)) return child.id;
    } else {
      const found = findParentLine(child, equipmentId);
      if (found) return found;
    }
  }
  return null;
}

/** Returns a new tree with the target node's status replaced (deep clone). */
function updateNodeStatus(tree: FactoryNode, nodeId: string, newStatus: FactoryNode['status']): FactoryNode {
  if (tree.id === nodeId) return { ...tree, status: newStatus };
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => updateNodeStatus(c, nodeId, newStatus)) };
}

/** Automatically calculate and update node status based on required field completion. */
function autoUpdateNodeStatus(tree: FactoryNode, nodeId: string): FactoryNode {
  return updateNodeStatusIfChanged(tree, nodeId);
}

/** Recalculate statuses for the entire tree. */
function recalculateTreeStatuses(tree: FactoryNode): FactoryNode {
  return updateTreeStatuses(tree);
}

/** Update node data and recalculate status. */
function updateNodeData(tree: FactoryNode, nodeId: string, updates: Partial<FactoryNode>): FactoryNode {
  // First update the node data
  const updatedTree = updateNode(tree, nodeId, (node) => ({ ...node, ...updates }));
  // Then recalculate its status
  return updateNodeStatusIfChanged(updatedTree, nodeId);
}

/** Helper to update a node with a transformation function. */
function updateNode(tree: FactoryNode, nodeId: string, updater: (node: FactoryNode) => FactoryNode): FactoryNode {
  if (tree.id === nodeId) return updater(tree);
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => updateNode(c, nodeId, updater)) };
}

const NODE_STATUS_TEXT: Record<string, string> = {
  configured: '已配置：节点所有必需属性已完整配置',
  partial: '部分配置：节点有部分属性未配置',
  empty: '未配置：节点尚未配置任何属性',
  error: '配置错误：节点配置存在错误或验证失败，需要修复',
};

const STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft',      cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  complete: { label: 'Completed',  cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  published:{ label: 'Published',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  archived: { label: 'Archived',   cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
};

// ── Binding types ──────────────────────────────────────────────────────────
// bindingMap keys use compound format: `${nodeId}_${bindingType}`
// e.g. 'smt01-line_BASIC_DATA', 'reflow-furnace-2_LEDGER'
type BindingType = 'BASIC_DATA' | 'LEDGER' | 'IOT' | 'EVENTS' | 'MONITOR' | 'METRICS';

type BindingRecord = {
  externalId: string;
  externalName: string;
  sourceSystem: string;
  lastSync: string;
  status: 'bound' | 'partial' | 'error';
  errorMessage?: string;
  // For partial state: which required fields are still missing
  missingFields?: string[];
};

type PlatformRecord = {
  id: string;
  code: string;
  name: string;
  entityType: 'line' | 'equipment';
  process?: string;
  parentLineId?: string; // for equipment records: which line they belong to
  fields: Record<string, { label: string; value: string }>;
};

type ConflictField = { field: string; label: string; localValue: string; platformValue: string };

type ConflictModalState = {
  nodeId: string;
  platformRecord: PlatformRecord;
  conflicts: ConflictField[];
};

const PLATFORM_RECORDS: PlatformRecord[] = [
  { id: 'plt-l-001', code: 'SMT-01-HOU', name: 'SMT贴片线01号', entityType: 'line', process: 'SMT制程',
    fields: { LINE_CODE: { label: '产线编码', value: 'SMT-01-HOU' }, LINE_NAME: { label: '产线名称', value: 'SMT贴片线01号' }, STANDARD_CT: { label: '标准节拍', value: '45s' }, MAX_UPH: { label: '最大UPH', value: '1350 pcs/h' }, LOT_SIZE: { label: '批量大小', value: '500 pcs' } } },
  { id: 'plt-l-002', code: 'SMT-02-HOU', name: 'SMT贴片线02号', entityType: 'line', process: 'SMT制程',
    fields: { LINE_CODE: { label: '产线编码', value: 'SMT-02-HOU' }, LINE_NAME: { label: '产线名称', value: 'SMT贴片线02号' }, STANDARD_CT: { label: '标准节拍', value: '45s' }, MAX_UPH: { label: '最大UPH', value: '1200 pcs/h' } } },
  { id: 'plt-l-003', code: 'ASSY-01-HOU', name: 'ASSY组装线01号', entityType: 'line', process: 'ASSY制程',
    fields: { LINE_CODE: { label: '产线编码', value: 'ASSY-01-HOU' }, LINE_NAME: { label: '产线名称', value: 'ASSY组装线01号' }, STANDARD_CT: { label: '标准节拍', value: '60s' }, MAX_UPH: { label: '最大UPH', value: '800 pcs/h' } } },
  { id: 'plt-e-001', code: 'DEK-NHZ-001', name: 'DEK全自动印刷机#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'DEK-NHZ-001' }, EQUIP_NAME: { label: '设备名称', value: 'DEK NeoHorizon Z 印刷机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.20' } } },
  { id: 'plt-e-002', code: 'JUKI-FX-001', name: 'JUKI高速贴片机#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'JUKI-FX-001' }, EQUIP_NAME: { label: '设备名称', value: 'JUKI KE-3020 高速贴片机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.15' } } },
  { id: 'plt-e-003', code: 'KE-RSF-001', name: 'Kurtz Ersa回流焊炉#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'KE-RSF-001' }, EQUIP_NAME: { label: '设备名称', value: 'Kurtz Ersa HOTFLOW 3/20' }, STATUS: { label: '设备状态', value: '维保中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.20' } } },
  { id: 'plt-e-004', code: 'DEK-NHZ-002', name: 'DEK全自动印刷机#2', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'DEK-NHZ-002' }, EQUIP_NAME: { label: '设备名称', value: 'DEK NeoHorizon Z 印刷机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.10' } } },
  { id: 'plt-e-005', code: 'DEK-NHZ-003', name: 'DEK全自动印刷机#3', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'DEK-NHZ-003' }, EQUIP_NAME: { label: '设备名称', value: 'DEK NeoHorizon Z 印刷机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.12' } } },
  { id: 'plt-e-006', code: 'JUKI-FX-002', name: 'JUKI高速贴片机#2', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'JUKI-FX-002' }, EQUIP_NAME: { label: '设备名称', value: 'JUKI KE-3020 高速贴片机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.10' } } },
  { id: 'plt-e-007', code: 'JUKI-FX-003', name: 'JUKI高速贴片机#3', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '设备编码', value: 'JUKI-FX-003' }, EQUIP_NAME: { label: '设备名称', value: 'JUKI KE-3020 高速贴片机' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.12' } } },
];

const INITIAL_BINDING_MAP: Record<string, BindingRecord> = {
  // 工厂节点 - 基础数据（已绑定）
  'houston-p9_BASIC_DATA': { externalId: 'plt-f-001', externalName: 'Houston P9 AI Factory', sourceSystem: 'ERP', lastSync: '2026-04-18 08:00', status: 'bound' },
  // 产线 - 基础数据
  'smt01-line_BASIC_DATA': { externalId: 'plt-l-001', externalName: 'SMT贴片线01号', sourceSystem: 'ERP', lastSync: '2026-04-17 09:15', status: 'bound' },
  'smt02-line_BASIC_DATA': { externalId: 'plt-l-002', externalName: 'SMT贴片线02号', sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  // 部分配置 demo: smt03-line 基础数据已填部分，外部ID填写但名称/编码未完成
  'smt03-line_BASIC_DATA': { externalId: 'plt-l-003', externalName: '', sourceSystem: 'ERP', lastSync: '', status: 'partial',
    missingFields: ['产线名称', '产线编码', '所属制程'] },
  // 设备 - 台账（LEDGER）
  'stencil-printer-2_LEDGER': { externalId: 'plt-e-001', externalName: 'DEK全自动印刷机#1',  sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  'reflow-furnace-2_LEDGER':  { externalId: 'plt-e-003', externalName: 'Kurtz Ersa回流焊炉#1', sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  // 绑定异常 demo: key identifier changed on the platform side
  'chip-mounter-2_LEDGER':    { externalId: 'plt-e-002', externalName: 'JUKI高速贴片机#1', sourceSystem: 'ERP', lastSync: '2026-04-15 08:00', status: 'error',
    errorMessage: '平台记录关键标识符已变更（JUKI-FX-001 → JUKI-FX-003），无法自动匹配，请重新绑定或更新设备编码' },
  'stencil-printer-1_LEDGER':  { externalId: 'plt-e-004', externalName: 'DEK全自动印刷机#2', sourceSystem: 'ERP', lastSync: '2026-04-16 09:20', status: 'bound' },
  'stencil-printer-11_LEDGER': { externalId: 'plt-e-005', externalName: 'DEK全自动印刷机#3', sourceSystem: 'ERP', lastSync: '2026-04-16 09:25', status: 'bound' },
  'chip-mounter-1_LEDGER':     { externalId: 'plt-e-006', externalName: 'JUKI高速贴片机#2', sourceSystem: 'ERP', lastSync: '2026-04-16 10:15', status: 'bound' },
  'chip-mounter-11_LEDGER':    { externalId: 'plt-e-007', externalName: 'JUKI高速贴片机#3', sourceSystem: 'ERP', lastSync: '2026-04-16 10:20', status: 'bound' },
  // 设备 IoT - 台账绑定后自动进入部分配置
  'reflow-furnace-2_IOT': { externalId: '', externalName: '', sourceSystem: 'IoT', lastSync: '', status: 'partial',
    missingFields: ['IoT IP', '端口', '站号', '采集周期'] },
};

function detectConflicts(record: PlatformRecord): ConflictField[] {
  if (record.id === 'plt-l-001') {
    return [{ field: 'MAX_UPH', label: '最大 UPH', localValue: '1200 pcs/h', platformValue: '1350 pcs/h' }];
  }
  if (record.id === 'plt-e-003') {
    return [{ field: 'EQUIP_NAME', label: '设备名称', localValue: 'Reflow Soldering Furnace', platformValue: 'Kurtz Ersa HOTFLOW 3/20' }];
  }
  return [];
}

// ══════════════════════════════════════════════════════════════════════════════
// Main FactoryEditorPage
// ══════════════════════════════════════════════════════════════════════════════
export function FactoryEditorPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const isNew = !projectId || projectId === 'new';

  // Find existing project or bootstrap a new one
  const existingProject = useMemo(
    () => mockFactoryProjects.find((p) => p.id === projectId),
    [projectId]
  );

  const [showNewProjectModal, setShowNewProjectModal] = useState(isNew);
  const [projectName, setProjectName] = useState(existingProject?.name ?? 'New Factory Project');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(existingProject?.status ?? 'draft');
  const [factoryTree, setFactoryTree] = useState<FactoryNode>(
    existingProject?.factory ? updateTreeStatuses(existingProject.factory) : updateTreeStatuses({ id: 'new-factory', name: 'New Factory', type: 'factory', children: [] })
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    existingProject?.factory?.id ?? 'new-factory'
  );
  const [rightTab, setRightTab] = useState<RightTab>('base');
const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['houston-p9', 'smt-process', 'smt01-line', 'smt02-line', 'smt03-line', 'assembly-process', 'pth-process', 'california', 'new-factory'])
  );
  const [showValidation, setShowValidation] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showUSDUpload, setShowUSDUpload] = useState(false);
  const [usdFiles, setUsdFiles] = useState<USDFile[]>([
    { id: 'f1', name: 'houston_factory_layout.usdc', size: 24.6, format: 'usdc', uploadedAt: '2025-01-10', status: 'linked' },
    { id: 'f2', name: 'smt_conveyor_belt.usd', size: 8.2, format: 'usd', uploadedAt: '2025-01-12', status: 'uploaded' },
    { id: 'f3', name: 'robot_arm_v2.usdz', size: 15.4, format: 'usdz', uploadedAt: '2025-01-14', status: 'linked' },
  ]);

  const selectedNode = useMemo(
    () => findNode(factoryTree, selectedNodeId),
    [factoryTree, selectedNodeId]
  );

  function toggleExpand(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  }

  function handlePublish() {
    if (projectStatus === 'complete') {
      setProjectStatus('published');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#07111e] text-slate-100 overflow-hidden">

      {/* ── Top Header Bar ── */}
      <header className="h-11 bg-[#050f1a] border-b border-[#142235] flex items-center px-4 flex-shrink-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <Layers3 size={11} />
          </div>
          <span className="text-xs font-semibold tracking-widest text-blue-300 uppercase">AI Factory Creator</span>
        </div>
        {/* Breadcrumb */}
        <div className="ml-4 flex items-center gap-1.5 text-[11px] text-slate-500 flex-1 min-w-0">
          <span className="hover:text-slate-300 cursor-pointer transition-colors flex-shrink-0" onClick={() => navigate('/')}>Home</span>
          <ChevronRight size={11} />
          <span className="hover:text-slate-300 cursor-pointer transition-colors flex-shrink-0" onClick={() => navigate('/factories')}>Factory Projects</span>
          <ChevronRight size={11} />
          <span className="text-blue-400 truncate">{projectName}</span>
          <div className={`text-[9px] px-2 py-0.5 rounded border font-medium flex-shrink-0 ml-1 ${STATUS_CONFIG[projectStatus].cls}`}>
            {STATUS_CONFIG[projectStatus].label}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {savedMessage && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse">
              <Check size={10} /> Saved
            </span>
          )}
          <button
            onClick={() => setShowUSDUpload(true)}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 border border-[#1e3a55] hover:border-blue-500/60 rounded px-2.5 py-1 transition-colors"
          >
            <Upload size={11} /> Upload USD
          </button>
          <button
            onClick={() => setShowValidation(true)}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 border border-[#1e3a55] rounded px-2.5 py-1 transition-colors"
          >
            <ShieldCheck size={11} /> Validate
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-[10px] text-white bg-blue-600 hover:bg-blue-700 rounded px-2.5 py-1 transition-colors"
          >
            <Save size={11} /> Save
          </button>
          <ActionBtn icon={<Eye size={11} />} label="Preview" color="blue" onClick={() => {}} />
          <ActionBtn icon={<Send size={11} />} label="Release" color="indigo"
            onClick={handlePublish}
            disabled={projectStatus !== 'complete'}
          />
        </div>
      </header>

      {/* ── Project Sub Navigation ── */}
      {!isNew && (
        <div className="h-8 bg-[#050f1a] border-b border-[#142235] flex items-end px-4 flex-shrink-0">
          {([
            { id: 'editor',  label: '3D Editor',    icon: <Layers3 size={10} />,   path: `/factory/${projectId}` },
            { id: 'binding', label: 'Data Binding',  icon: <Link2 size={10} />,     path: `/factory/${projectId}/data-binding` },
            { id: 'versions',label: 'Log',      icon: <ClipboardList size={10} />, path: `/factory/${projectId}/versions` },
          ] as { id: string; label: string; icon: React.ReactNode; path: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`h-full flex items-center gap-1.5 px-4 text-[11px] border-b-2 transition-colors ${
                tab.id === 'editor'
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel ── */}
        <div
          className={`flex flex-col bg-[#071526] border-r border-[#142235] transition-all duration-200 flex-shrink-0 ${
            leftCollapsed ? 'w-8' : 'w-60'
          }`}
        >
          {/* Collapse Toggle */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#142235] flex-shrink-0 min-h-[30px]">
            {!leftCollapsed && (
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={11} className="text-blue-400" /> Factory Modeling
              </span>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="text-slate-500 hover:text-slate-200 ml-auto p-0.5 transition-colors"
            >
              {leftCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>

          {!leftCollapsed && (
            <>
              {/* 3D Asset Library */}
              <AssetLibraryPanel />

              {/* Factory Tree */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#142235] flex-shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {projectName}
                </span>
                <div className="flex items-center gap-1">
                  <button className="text-slate-500 hover:text-blue-400 transition-colors p-0.5">
                    <Plus size={11} />
                  </button>
                  <button className="text-slate-500 hover:text-slate-200 transition-colors p-0.5">
                    <MoreHorizontal size={11} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                <TreeNode
                  node={factoryTree}
                  depth={0}
                  selectedId={selectedNodeId}
                  expandedIds={expandedNodes}
                  onSelect={(id) => setSelectedNodeId(id)}
                  onToggle={toggleExpand}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Center Viewport ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Viewport Area */}
          <div className="flex-1 relative overflow-hidden bg-[#07111e]">
            <Viewport3D selectedNode={selectedNode} />

            {/* Viewport Toolbar (left side) */}
            <ViewportToolbar />
          </div>
        </div>

        {/* ── Right Panel ── */}
        <RightPanel
          selectedNode={selectedNode}
          rightTab={rightTab}
          onTabChange={setRightTab}
          projectStatus={projectStatus}
          projectId={projectId}
          factoryTree={factoryTree}
          onTreeNodeStatusChange={(nodeId, newStatus) =>
            setFactoryTree((prev) => updateNodeStatus(prev, nodeId, newStatus))
          }
          onNodeUpdate={(nodeId, updates) => {
            const updatedTree = updateNodeData(factoryTree, nodeId, updates);
            setFactoryTree(updatedTree);
          }}
        />
      </div>

      {/* Modals */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => { setShowNewProjectModal(false); if (isNew) navigate('/'); }}
          onCreate={(id) => { setShowNewProjectModal(false); }}
        />
      )}
      {showValidation && (
        <ValidationModal
          status={projectStatus}
          onClose={() => setShowValidation(false)}
          onMarkComplete={() => setProjectStatus('complete')}
          factoryName="Houston P9 AI Factory"
        />
      )}
      {showUSDUpload && (
        <USDUploadModal
          projectName={projectName}
          files={usdFiles}
          onClose={() => setShowUSDUpload(false)}
          onLink={(id) => setUsdFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'linked' } : f))}
          onUnlink={(id) => setUsdFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'uploaded' } : f))}
          onRemove={(id) => setUsdFiles((prev) => prev.filter((f) => f.id !== id))}
          onAdd={(files) => setUsdFiles((prev) => [...prev, ...files])}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Viewport3D Component
// ══════════════════════════════════════════════════════════════════════════════
// ── Viewport Toolbar ──────────────────────────────────────────────────────────
const VIEWPORT_TOOLS = [
  { id: 'select',   icon: MousePointer2, label: 'Select (S)' },
  { id: 'move',     icon: Move,          label: 'Move (M)' },
  { id: 'zoomin',   icon: ZoomIn,        label: 'Zoom In (+)' },
  { id: 'zoomout',  icon: ZoomOut,       label: 'Zoom Out (−)' },
] as const;

function ViewportToolbar() {
  const [activeTool, setActiveTool] = useState<string>('select');
  const [playing, setPlaying] = useState(false);

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[#071526]/90 border border-[#142235] rounded-lg p-1.5 backdrop-blur-sm">
      {VIEWPORT_TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => setActiveTool(id)}
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
        title={playing ? 'Pause simulation' : 'Play simulation'}
        onClick={() => setPlaying((v) => !v)}
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

  const overlayDisabled = viewMode === '3d';

  return (
    <div className="absolute top-3 right-3 bg-[#071526]/95 border border-[#142235] rounded-lg w-44 backdrop-blur-sm text-[10px] overflow-hidden shadow-xl">

      {/* ── View mode toggle ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#142235]">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">View</span>
        <div className="flex bg-[#0b1d30] border border-[#1e3a55] rounded overflow-hidden">
          {(['2d', '3d'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-2.5 py-0.5 text-[10px] font-medium uppercase transition-colors ${
                viewMode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Floors ── */}
      <div className="border-b border-[#142235]">
        <button
          onClick={() => setFloorsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
        >
          Floors
          <ChevronDown size={10} className={`transition-transform ${floorsOpen ? '' : '-rotate-90'}`} />
        </button>
        {floorsOpen && (
          <div className="pb-2 px-2 space-y-0.5">
            {FLOORS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFloor(f.id)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors text-[10px] ${
                  activeFloor === f.id
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-[#0f2035]'
                }`}
              >
                <span>{f.label}</span>
                {activeFloor === f.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Overlays (2D only) ── */}
      <div>
        <button
          onClick={() => !overlayDisabled && setOverlaysOpen((v) => !v)}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            overlayDisabled
              ? 'text-slate-700 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            Overlays
            {overlayDisabled && <span className="text-[9px] normal-case tracking-normal text-slate-700">2D only</span>}
          </span>
          <ChevronDown size={10} className={`transition-transform ${overlaysOpen && !overlayDisabled ? '' : '-rotate-90'}`} />
        </button>
        {overlaysOpen && !overlayDisabled && (
          <div className="pb-2 px-2 space-y-0.5">
            {OVERLAYS.map(({ id, label, icon: Icon }) => {
              const on = activeOverlays.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleOverlay(id)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors text-[10px] ${
                    on ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  } hover:bg-[#0f2035]`}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon size={10} className={on ? 'text-blue-400' : 'text-slate-600'} />
                    {label}
                  </span>
                  {/* Toggle pill */}
                  <div className={`w-7 h-3.5 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-[#1e3a55]'}`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${on ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

function Viewport3D({ selectedNode }: { selectedNode: FactoryNode | null }) {
  const isEquipment = selectedNode?.type === 'equipment';
  const isFactory = selectedNode?.type === 'factory';

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-[#07111e]">
      {/* Grid floor */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30,58,95,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,58,95,0.35) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Factory model visual */}
      <div className="relative" style={{ transform: 'perspective(1200px) rotateX(25deg) scale(0.88)' }}>
        {isFactory ? (
          /* Full factory view */
          <div className="relative">
            <img
              src="/images/factory-full.png"
              alt="Factory 3D Model"
              className="w-[820px] h-[480px] object-cover rounded-sm"
              style={{ filter: 'grayscale(35%) contrast(1.1) brightness(0.85)' }}
            />
            {/* Selection dashed border for factory */}
            <div className="absolute inset-0 border-2 border-dashed border-blue-500/60 rounded-sm pointer-events-none" />
            {/* Blue selector icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-12 h-12 border-2 border-blue-400 rounded-lg flex items-center justify-center bg-blue-600/20 animate-pulse">
                <Box size={22} className="text-blue-400" />
              </div>
            </div>
          </div>
        ) : isEquipment ? (
          /* Equipment closeup view */
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1748349221526-33b51820b21e?w=820&q=80"
              alt="Equipment 3D Model"
              className="w-[820px] h-[420px] object-cover rounded-sm"
              style={{ filter: 'grayscale(25%) contrast(1.15) brightness(0.8)' }}
            />
            {/* Selected equipment highlight */}
            <div
              className="absolute border-2 border-dashed border-blue-400 rounded"
              style={{ top: '25%', left: '30%', width: '40%', height: '50%' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 border border-blue-400 rounded flex items-center justify-center bg-blue-500/30">
                  <ChevronUp size={12} className="text-blue-300" />
                </div>
              </div>
            </div>
            {/* Blue highlight overlay */}
            <div
              className="absolute rounded bg-blue-500/15 border border-blue-400/40"
              style={{ top: '25%', left: '30%', width: '40%', height: '50%', pointerEvents: 'none' }}
            />
          </div>
        ) : (
          /* Line / Process view */
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1669003152226-b37b58281b84?w=820&q=80"
              alt="Production Line 3D Model"
              className="w-[820px] h-[420px] object-cover rounded-sm"
              style={{ filter: 'grayscale(30%) contrast(1.1) brightness(0.82)' }}
            />
          </div>
        )}
      </div>

      {/* Floor / Overlay Nav Panel */}
      <FloorNavPanel />

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#050f1a]/90 border-t border-[#142235] flex items-center px-3 gap-4 text-[10px] text-slate-600">
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

// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// Right Panel
// ══════════════════════════════════════════════════════════════════════════════
function RightPanel({
  selectedNode, rightTab, onTabChange, projectStatus, projectId, factoryTree, onTreeNodeStatusChange, onNodeUpdate
}: {
  selectedNode: FactoryNode | null;
  rightTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  projectStatus: ProjectStatus;
  projectId?: string;
  factoryTree: FactoryNode;
  onTreeNodeStatusChange: (nodeId: string, newStatus: FactoryNode['status']) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<FactoryNode>) => void;
}) {
  const isFactory = selectedNode?.type === 'factory';
  const isProcess = selectedNode?.type === 'process';
  const isLine = selectedNode?.type === 'line';
  const isEquipment = selectedNode?.type === 'equipment';

  // Edit state — reset whenever selected node changes
  const [isEditing, setIsEditing] = useState(false);
  const prevNodeId = useRef<string | null>(null);
  if (selectedNode?.id !== prevNodeId.current) {
    prevNodeId.current = selectedNode?.id ?? null;
    if (isEditing) setIsEditing(false);
  }

  function startEdit() { setIsEditing(true); }
  function saveEdit() { setIsEditing(false); }
  function cancelEdit() { setIsEditing(false); }

  // ── Binding state ──────────────────────────────────────────────────────────
  // Keys use compound format: `${nodeId}_${BindingType}`, e.g. 'smt01-line_BASIC_DATA'
  const [bindingMap, setBindingMap] = useState<Record<string, BindingRecord>>(INITIAL_BINDING_MAP);
  const [bindModalNode, setBindModalNode] = useState<{ id: string; bindingType: BindingType; nodeType: 'factory' | 'line' | 'equipment' } | null>(null);

  // Sync initial binding map → tree node status dots on first render
  const BINDING_TYPES_LIST: BindingType[] = ['BASIC_DATA', 'LEDGER', 'IOT', 'EVENTS', 'MONITOR', 'METRICS'];
  useEffect(() => {
    const synced: Record<string, FactoryNode['status']> = {};
    Object.entries(INITIAL_BINDING_MAP).forEach(([key, record]) => {
      for (const type of BINDING_TYPES_LIST) {
        if (key.endsWith(`_${type}`)) {
          const nodeId = key.slice(0, -(type.length + 1));
          const existing = synced[nodeId];
          if (record.status === 'bound' && existing !== 'configured') {
            synced[nodeId] = 'configured';
          } else if ((record.status === 'partial' || record.status === 'error') && existing == null) {
            synced[nodeId] = 'partial';
          }
          break;
        }
      }
    });
    Object.entries(synced).forEach(([nodeId, status]) => {
      onTreeNodeStatusChange(nodeId, status);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [conflictModal, setConflictModal] = useState<ConflictModalState | null>(null);
  const [lineMismatchModal, setLineMismatchModal] = useState<{
    recordLineName: string; currentLineName: string;
  } | null>(null);

  const platformConnected = true;

  function bindKey(nodeId: string, type: BindingType) { return `${nodeId}_${type}`; }

  function handleStartBind(nodeId: string, bindingType: BindingType, nodeType: 'factory' | 'line' | 'equipment') {
    setBindModalNode({ id: nodeId, bindingType, nodeType });
  }

  function applyBind(nodeId: string, bindingType: BindingType, record: PlatformRecord) {
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    setBindingMap((m) => ({
      ...m,
      [bindKey(nodeId, bindingType)]: { externalId: record.id, externalName: record.name, sourceSystem: 'ERP', lastSync: now, status: 'bound' },
    }));
    onTreeNodeStatusChange(nodeId, 'configured');
  }

  function handlePickRecord(record: PlatformRecord) {
    if (!bindModalNode) return;

    // Situation C: equipment record belongs to a different line than the current node
    if (bindModalNode.nodeType === 'equipment' && record.parentLineId) {
      const actualParentLineId = findParentLine(factoryTree, bindModalNode.id);
      if (actualParentLineId && record.parentLineId !== actualParentLineId) {
        const recordLine = findNode(factoryTree, record.parentLineId);
        const currentLine = findNode(factoryTree, actualParentLineId);
        setLineMismatchModal({
          recordLineName: recordLine?.name ?? record.parentLineId,
          currentLineName: currentLine?.name ?? actualParentLineId,
        });
        setBindModalNode(null);
        return;
      }
    }

    const conflicts = detectConflicts(record);
    if (conflicts.length > 0) {
      setConflictModal({ nodeId: bindModalNode.id, platformRecord: record, conflicts });
      setBindModalNode(null);
    } else {
      applyBind(bindModalNode.id, bindModalNode.bindingType, record);
      setBindModalNode(null);
    }
  }

  function handleConfirmBind(record: PlatformRecord, nodeId: string, bindingType: BindingType) {
    applyBind(nodeId, bindingType, record);
    setConflictModal(null);
  }

  function handleUnbind(nodeId: string, bindingType: BindingType) {
    setBindingMap((m) => { const n = { ...m }; delete n[bindKey(nodeId, bindingType)]; return n; });
    onTreeNodeStatusChange(nodeId, 'partial');
  }

  // ── Helpers to get binding record & locked state ───────────────────────────
  function getBinding(nodeId: string, type: BindingType) { return bindingMap[bindKey(nodeId, type)]; }
  function isPrerequisiteBound(nodeId: string, nodeType: 'factory' | 'line' | 'equipment') {
    if (nodeType === 'equipment') return getBinding(nodeId, 'LEDGER')?.status === 'bound';
    return getBinding(nodeId, 'BASIC_DATA')?.status === 'bound';
  }

  // ── Tab status dot helper ─────────────────────────────────────────────────
  function tabDot(nodeId: string, type: BindingType) {
    const rec = getBinding(nodeId, type);
    if (!rec) return null;
    if (rec.status === 'bound') return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />;
    if (rec.status === 'partial') return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />;
    if (rec.status === 'error') return <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />;
    return null;
  }

  const panelTitle = isFactory
    ? 'Factory Configure'
    : isProcess
    ? 'Process Configure'
    : isLine
    ? 'Line Configure'
    : rightTab === 'base'
    ? 'Ledger Information'
    : rightTab === 'iot'
    ? 'IoT Information'
    : rightTab === 'events'
    ? 'Event Configuration'
    : rightTab === 'monitoring'
    ? 'Status Monitoring'
    : 'Metrics Configuration';

  return (
    <>
    <div className="w-72 bg-[#071526] border-l border-[#142235] flex flex-col overflow-hidden flex-shrink-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#142235] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cog size={12} className="text-blue-400" />
          <span className="text-[11px] font-semibold text-slate-200">{panelTitle}</span>
        </div>
        {selectedNode && (
          <div className="flex items-center gap-0.5">
            {isEditing ? (
              <>
                <button onClick={saveEdit} title="Save" className="w-6 h-6 flex items-center justify-center rounded text-green-400 hover:bg-green-500/15 transition-colors">
                  <Check size={12} />
                </button>
                <button onClick={cancelEdit} title="Cancel" className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-[#142235] transition-colors">
                  <X size={12} />
                </button>
              </>
            ) : (
              <button onClick={startEdit} title="Edit" className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 hover:bg-[#142235] transition-colors">
                <Edit2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Factory / Line tabs — Binding (required) + Metrics (optional config) */}
      {(isLine || isFactory) && selectedNode && (
        <div className="flex border-b border-[#142235] flex-shrink-0 overflow-x-auto">
          {([
            { id: 'base' as RightTab,    icon: <FileText size={9} />,  label: 'Binding', bindType: 'BASIC_DATA' as BindingType, optional: false },
            { id: 'events' as RightTab,     icon: <Zap size={9} />,      label: 'Events',   bindType: 'EVENTS' as BindingType,  optional: true },
            { id: 'monitoring' as RightTab, icon: <Activity size={9} />, label: 'Monitor',  bindType: 'MONITOR' as BindingType, optional: true },
            { id: 'metrics' as RightTab, icon: <BarChart3 size={9} />, label: 'Metrics', bindType: 'METRICS' as BindingType, optional: true },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] transition-colors border-b-2 ${
                rightTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#0f2035]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {tab.icon}
                <span className="absolute -top-0.5 -right-1.5">{tabDot(selectedNode.id, tab.bindType)}</span>
              </div>
              <span>{tab.label}</span>
              {tab.optional && <span className="text-[8px] text-slate-600 -mt-0.5">opt</span>}
            </button>
          ))}
        </div>
      )}

      {/* Equipment tabs — Ledger/IoT are bindings; Events/Monitor/Metrics are optional configs */}
      {isEquipment && selectedNode && (
        <div className="flex border-b border-[#142235] flex-shrink-0 overflow-x-auto">
          {([
            { id: 'base' as RightTab,       icon: <FileText size={9} />,  label: 'Ledger',   bindType: 'LEDGER' as BindingType,  optional: false },
            { id: 'iot' as RightTab,        icon: <Wifi size={9} />,      label: 'IoT',      bindType: 'IOT' as BindingType,     optional: false },
            { id: 'events' as RightTab,     icon: <Zap size={9} />,       label: 'Events',   bindType: 'EVENTS' as BindingType,  optional: true },
            { id: 'monitoring' as RightTab, icon: <Activity size={9} />,  label: 'Monitor',  bindType: 'MONITOR' as BindingType, optional: true },
            { id: 'metrics' as RightTab,    icon: <BarChart3 size={9} />, label: 'Metrics',  bindType: 'METRICS' as BindingType, optional: true },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] transition-colors border-b-2 ${
                rightTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#0f2035]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {tab.icon}
                <span className="absolute -top-0.5 -right-1.5">{tabDot(selectedNode.id, tab.bindType)}</span>
              </div>
              <span>{tab.label}</span>
              {tab.optional && <span className="text-[8px] text-slate-600 -mt-0.5">opt</span>}
            </button>
          ))}
        </div>
      )}

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedNode?.status === 'error' && (
          <div className="m-3 p-2.5 bg-red-900/20 border border-red-700/40 rounded-sm">
            <div className="flex items-start gap-1.5">
              <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="mb-1">
                  <div className="text-[10px] font-medium text-red-300">配置错误</div>
                </div>
                <div className="text-[9px] text-red-400/80">{selectedNode.errorMessage || '节点配置存在错误，需要修复后才能继续操作。'}</div>
              </div>
            </div>
          </div>
        )}

        {!selectedNode ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 p-6 text-center">
            <MousePointer2 size={28} strokeWidth={1} />
            <p className="text-[11px] mt-3">Click on a node in the tree or 3D viewport to view and edit its properties</p>
          </div>
        ) : isFactory ? (
          rightTab === 'metrics' ? (
            <MetricsPanel editing={isEditing} locked={!isPrerequisiteBound(selectedNode.id, 'factory')} />
          ) : (
            <FactoryConfigPanel
              editing={isEditing}
              nodeId={selectedNode.id}
              platformConnected={platformConnected}
              basicDataBinding={getBinding(selectedNode.id, 'BASIC_DATA')}
              onBindBasicData={() => handleStartBind(selectedNode.id, 'BASIC_DATA', 'factory')}
              onUnbindBasicData={() => handleUnbind(selectedNode.id, 'BASIC_DATA')}
            />
          )
        ) : isProcess ? (
          <ProcessConfigPanel node={selectedNode} editing={isEditing} />
        ) : isLine ? (
          rightTab === 'events' ? (
            <EventsPanel editing={isEditing} locked={!isPrerequisiteBound(selectedNode.id, 'line')} />
          ) : rightTab === 'monitoring' ? (
            <MonitoringPanel editing={isEditing} locked={!isPrerequisiteBound(selectedNode.id, 'line')} />
          ) : rightTab === 'metrics' ? (
            <MetricsPanel editing={isEditing} locked={!isPrerequisiteBound(selectedNode.id, 'line')} />
          ) : (
            <LineConfigPanel
              node={selectedNode}
              editing={isEditing}
              platformConnected={platformConnected}
              bindingRecord={getBinding(selectedNode.id, 'BASIC_DATA')}
              onBind={() => handleStartBind(selectedNode.id, 'BASIC_DATA', 'line')}
              onUnbind={() => handleUnbind(selectedNode.id, 'BASIC_DATA')}
            />
          )
        ) : (
          <>
            {rightTab === 'base' && (
              <LedgerPanel
                node={selectedNode}
                editing={isEditing}
                platformConnected={platformConnected}
                bindingRecord={getBinding(selectedNode.id, 'LEDGER')}
                onBind={() => handleStartBind(selectedNode.id, 'LEDGER', 'equipment')}
                onUnbind={() => handleUnbind(selectedNode.id, 'LEDGER')}
              />
            )}
            {rightTab === 'iot' && (
              <IoTPanel
                node={selectedNode}
                editing={isEditing}
                bindingRecord={getBinding(selectedNode.id, 'IOT')}
                locked={!isPrerequisiteBound(selectedNode.id, 'equipment')}
              />
            )}
            {rightTab === 'events' && (
              <EventsPanel
                editing={isEditing}
                locked={!isPrerequisiteBound(selectedNode.id, 'equipment')}
              />
            )}
            {rightTab === 'monitoring' && (
              <MonitoringPanel
                editing={isEditing}
                locked={!isPrerequisiteBound(selectedNode.id, 'equipment')}
              />
            )}
            {rightTab === 'metrics' && (
              <MetricsPanel
                editing={isEditing}
                locked={!isPrerequisiteBound(selectedNode.id, 'equipment')}
              />
            )}
          </>
        )}
      </div>
    </div>
    {bindModalNode && (
      <BindPickerModal
        nodeType={bindModalNode.nodeType === 'factory' ? 'line' : bindModalNode.nodeType}
        onSelect={handlePickRecord}
        onClose={() => setBindModalNode(null)}
      />
    )}
    {conflictModal && (
      <ConflictDiffModal
        conflictState={conflictModal}
        onConfirm={(rec) => handleConfirmBind(rec, conflictModal.nodeId, bindModalNode?.bindingType ?? 'LEDGER')}
        onCancel={() => setConflictModal(null)}
      />
    )}
    {lineMismatchModal && (
      <LineMismatchModal
        recordLineName={lineMismatchModal.recordLineName}
        currentLineName={lineMismatchModal.currentLineName}
        onClose={() => setLineMismatchModal(null)}
      />
    )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Panel Content Components
// ══════════════════════════════════════════════════════════════════════════════

function FactoryConfigPanel({
  editing, nodeId, platformConnected,
  basicDataBinding,
  onBindBasicData, onUnbindBasicData,
}: {
  editing: boolean;
  nodeId: string;
  platformConnected: boolean;
  basicDataBinding?: BindingRecord;
  onBindBasicData: () => void;
  onUnbindBasicData: () => void;
}) {
  return (
    <div className="p-3 space-y-4">
      {/* Business Data Binding (Required) */}
      <DataBindingSection
        nodeId={nodeId}
        nodeType="factory"
        label="Business Data Binding (Required)"
        platformConnected={platformConnected}
        bindingRecord={basicDataBinding}
        onBind={onBindBasicData}
        onUnbind={onUnbindBasicData}
      />

      <ConfigSection title="Basic Information">
        <ConfigRow label="Factory Name" value="Houston P9 AI Factory" editing={editing} />
        <ConfigRow label="Hierarchy" value="Factory" editing={editing} />
        <ConfigRow label="USD File" value="Houston P9 AI Factory.USD" editing={editing} dropdown />
        <ConfigRow label="Site Area" value="4000 m²" editing={editing} dropdown />
        <ConfigRow label="Address" value="8303 Fallbrook Dr., Houston" editing={editing} dropdown />
      </ConfigSection>

      <ConfigSection title="Capacity Information">
        <ConfigRow label="Annual Capacity" value="720万 pieces" editing={editing} />
      </ConfigSection>

      <ConfigSection title="Other Information">
        <div className="rounded overflow-hidden border border-[#1e3a55] mt-1">
          <img
            src="/images/factory-full.png"
            alt="Factory Thumbnail"
            className="w-full h-28 object-cover opacity-70"
          />
        </div>
      </ConfigSection>
    </div>
  );
}

function ProcessConfigPanel({ node, editing }: { node: FactoryNode; editing: boolean }) {
  return (
    <div className="p-3 space-y-4">
      <ConfigSection title="Basic Information">
        <ConfigRow label="Process Code" value={`PROC-${node.id.toUpperCase().slice(0, 6)}`} editing={editing} />
        <ConfigRow label="Process Name" value={node.name} editing={editing} />
        <ConfigRow label="Line Count" value={`${node.children?.length ?? 0} Lines`} />
        <ConfigRow label="Order in Production Flow" value="1" editing={editing} />
      </ConfigSection>
      <ConfigSection title="Production Information">
        <ConfigRow label="Capacity" value="3200 pieces/day" editing={editing} />
      </ConfigSection>
    </div>
  );
}

function LineConfigPanel({
  node, editing, platformConnected,
  bindingRecord, onBind, onUnbind,
}: {
  node: FactoryNode; editing: boolean;
  platformConnected: boolean;
  bindingRecord?: BindingRecord;
  onBind: () => void;
  onUnbind: () => void;
}) {
  return (
    <div className="p-3 space-y-4">
      {/* Business Data Binding (Required) */}
      <DataBindingSection
        nodeId={node.id}
        nodeType="line"
        label="Business Data Binding (Required)"
        platformConnected={platformConnected}
        bindingRecord={bindingRecord}
        onBind={onBind}
        onUnbind={onUnbind}
      />


      <ConfigSection title="Basic Information">
        <ConfigRow label="Line Name" value={node.name} editing={editing} />
        <ConfigRow label="Line Code" value="SMT-L-002" editing={editing} />
        <ConfigRow label="Belongs to Process" value="SMT Process" editing={editing} />
        <ConfigRow label="Remarks" value="" editing={editing} />
      </ConfigSection>

      <ConfigSection title="Leader Information">
        <ConfigRow label="Line Leader" value="Zhang Wei" editing={editing} />
        <ConfigRow label="Contact" value="+86 138 0000 1234" editing={editing} />
      </ConfigSection>
    </div>
  );
}

function LedgerPanel({ node, editing, platformConnected, bindingRecord, onBind, onUnbind }: {
  node: FactoryNode; editing: boolean;
  platformConnected: boolean;
  bindingRecord?: BindingRecord;
  onBind: () => void;
  onUnbind: () => void;
}) {
  return (
    <div className="p-3 space-y-3">
      <DataBindingSection
        nodeId={node.id}
        nodeType="equipment"
        platformConnected={platformConnected}
        bindingRecord={bindingRecord}
        onBind={onBind}
        onUnbind={onUnbind}
      />

      <ConfigSection title="Basic Information">
        <ConfigRow label="Equipment Code" value="UHP9SMT#01RSF#01" editing={editing} />
        <ConfigRow label="Equipment Name" value="Reflow Soldering Furnace" editing={editing} />
        <ConfigRow label="Equipment Type" value="Kurtz Ersa Reflow soldering Furnace" editing={editing} />
        <ConfigRow label="Equipment Group" value="SMT Equipment" editing={editing} />
        <ConfigRow label="Brand" value="Kurtz Ersa" editing={editing} />
        <ConfigRow label="Manufacturer" value="Kurtz Ersa GmbH" editing={editing} />
        <ConfigRow label="Model" value="HOTFLOW 2/14" editing={editing} />
        <ConfigRow label="Production Date" value="2025.10.15" editing={editing} />
        <ConfigRow label="Serial Number" value="SN-KE-2025-1001" editing={editing} />
        <ConfigRow label="Origin" value="Germany" editing={editing} />
        <ConfigRow label="Supplier" value="Kurtz Ersa China" editing={editing} />
        <ConfigRow label="Supplier Phone" value="+86 21 1234 5678" editing={editing} />
        <ConfigRow label="Purchase Date" value="2025.12.01" editing={editing} />
        <ConfigRow label="Service Life" value="10 Years" editing={editing} />
        <ConfigRow label="Equipment Unit" value="Pieces" editing={editing} />
        <ConfigRow label="Location" value="SMT Line #2, Position #3" editing={editing} />
        <ConfigRow label="Image Path" value="/images/equipment/reflow-furnace.jpg" editing={editing} />
        <ConfigRow label="Responsible Person" value="Li Ming" editing={editing} />
        <ConfigRow label="Asset Number" value="ASSET-2025-00123" editing={editing} />
      </ConfigSection>

      <CollapsibleSection title="Technical Specifications">
        <ConfigRow label="Main Technical Parameters" value="10 Heating Zones, Max 300°C" editing={editing} />
        <ConfigRow label="Power" value="45 kW" editing={editing} />
        <ConfigRow label="Dimensions (L×W×H)" value="4.5m × 1.2m × 2.1m" editing={editing} />
        <ConfigRow label="Weight" value="3200 kg" editing={editing} />
      </CollapsibleSection>

      <CollapsibleSection title="Process Parameters">
        <ConfigRow label="Standard Cycle Time" value="45 s" editing={editing} />
        <ConfigRow label="Standard Yield Rate" value="99.5%" editing={editing} />
        <ConfigRow label="Standard Operation Efficiency" value="95%" editing={editing} />
      </CollapsibleSection>

      <CollapsibleSection title="Fault Parameters">
        <ConfigRow label="MTBF" value="5000 hours" editing={editing} />
        <ConfigRow label="MTTR" value="2.5 hours" editing={editing} />
      </CollapsibleSection>

      <CollapsibleSection title="Spare Parts BOM">
        <div className="text-[10px] text-slate-500 py-1">Tree structure, each node displays node code/node name/quantity</div>
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
          <Plus size={10} /> Add Spare Part
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Equipment SOP">
        <div className="text-[10px] text-slate-500 py-1">Document ID: SOP-SMT-001, Title: Reflow Furnace Operation, Version: v2.1, Path: /docs/sop/reflow-v2.1.pdf</div>
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
          <Link2 size={10} /> Link Document
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Operation Records">
        <div className="text-[10px] text-slate-500 py-1">Record ID: REC-2025-1001, Record Type: Maintenance, Phase Status: Completed</div>
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
          <Plus size={10} /> View All Records
        </button>
      </CollapsibleSection>
    </div>
  );
}

function IoTPanel({ node, editing, bindingRecord, locked }: {
  node: FactoryNode; editing: boolean;
  bindingRecord?: BindingRecord;
  locked: boolean;
}) {
  const isConfigured = node.iotConfigured ?? (bindingRecord?.status === 'partial' || bindingRecord?.status === 'bound');
  return (
    <div className="p-3 space-y-3">
      {locked && (
        <div className="flex items-center gap-1.5 p-2 bg-[#040d18] border border-[#1e3a55] rounded text-[10px] text-slate-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Please complete ledger binding first
        </div>
      )}
      {/* IoT auto-import status from ledger */}
      {!locked && bindingRecord && (
        <DataBindingSection
          nodeId={node.id}
          nodeType="equipment"
          label="IoT Configuration (Auto-imported from Ledger)"
          platformConnected={true}
          bindingRecord={bindingRecord}
          onBind={() => {}}
          onUnbind={() => {}}
        />
      )}
      <ConfigSection title="Basic Information">
        <ConfigRow label="Factory Layer" value="SMT #2 Line" />
        <ConfigRow label="Equipment Name" value={node.name} />
        <ConfigRow label="Equipment ID" value="UHP9SMT#01RSF#01" />
        <div className="flex items-center justify-between py-1">
          <span className="text-[10px] text-slate-500">Sub Device</span>
          <select className="bg-[#071526] border border-[#1e3a55] rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-blue-500">
            <option>Furnace Cavity</option>
            <option>Transport System</option>
            <option>Control Unit</option>
          </select>
        </div>
      </ConfigSection>

      <ConfigSection title="IoT Configuration">
        <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
          <span className="text-[10px] text-slate-500">Protocol/Driver</span>
          {editing ? (
            <select className="bg-[#071526] border border-[#1e3a55] rounded text-[10px] text-slate-300 px-2 py-1 focus:outline-none focus:border-blue-500">
              <option>Modbus/TCP</option>
              <option>OPC-UA</option>
              <option>MQTT</option>
              <option>HTTP REST</option>
            </select>
          ) : (
            <span className="text-[10px] text-slate-200">Modbus/TCP</span>
          )}
        </div>
        <IoTField label="IoT IP" value={isConfigured ? '192.168.1.100' : ''} placeholder="e.g. 192.168.1.100" editing={editing} />
        <IoTField label="Port" value={isConfigured ? '502' : ''} placeholder="e.g. 502" editing={editing} />
        <IoTField label="Station No" value={isConfigured ? '5' : ''} placeholder="e.g. 5" editing={editing} />
        <IoTField label="Sampling Cycle (s)" value={isConfigured ? '0.5' : ''} placeholder="e.g. 0.5" editing={editing} />
        {!isConfigured && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 rounded p-2 mt-2">
            <WifiOff size={10} /> IoT connection not configured
          </div>
        )}
      </ConfigSection>

      {/* Data Points Table */}
      <ConfigSection title="Data Collection Point Location">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-slate-500">{mockDataPoints.length} points defined</span>
          <div className="flex items-center gap-1">
            {[
              { color: 'bg-blue-400', label: 'Add' },
              { color: 'bg-amber-400', label: 'Edit' },
              { color: 'bg-red-400', label: 'Del' },
              { color: 'bg-slate-400', label: 'Import' },
              { color: 'bg-emerald-400', label: 'Export' },
            ].map((btn) => (
              <button key={btn.label} className={`w-4 h-4 rounded ${btn.color}/20 flex items-center justify-center`} title={btn.label}>
                <span className={`w-1.5 h-1.5 rounded-full ${btn.color}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded border border-[#1e3a55]">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="bg-[#071526] border-b border-[#1e3a55]">
                {['Name', 'Variable Address', 'Type', 'Unit', 'Description'].map((h) => (
                  <th key={h} className="text-left px-1.5 py-1.5 text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockDataPoints.map((dp, i) => (
                <tr key={dp.id} className={`border-b border-[#142235] hover:bg-[#0f2035] cursor-pointer ${i % 2 === 0 ? '' : 'bg-[#071526]/50'}`}>
                  <td className="px-1.5 py-1 text-slate-300">{dp.name}</td>
                  <td className="px-1.5 py-1 text-blue-400/80 font-mono">{dp.address}</td>
                  <td className="px-1.5 py-1 text-slate-400">{dp.dataType}</td>
                  <td className="px-1.5 py-1 text-slate-500">{dp.unit}</td>
                  <td className="px-1.5 py-1 text-slate-600 max-w-[80px] truncate">{dp.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ConfigSection>
    </div>
  );
}

function EventsPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
  return (
    <div className="p-3 space-y-3">
      {locked && (
        <div className="flex items-center gap-1.5 p-2 bg-[#040d18] border border-[#1e3a55] rounded text-[10px] text-slate-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Please complete ledger binding first
        </div>
      )}
      <ConfigSection title="Event Configuration">
        <p className="text-[10px] text-slate-500">Configure event triggers based on data point conditions for this equipment.</p>
        <div className="mt-2 space-y-2">
          {[
            { name: 'High Temperature Alarm', condition: 'heat_zone_1 > 280°C', severity: 'Critical' },
            { name: 'N2 Flow Low', condition: 'n2_flow_avg < 50 L/min', severity: 'Warning' },
            { name: 'Production Complete', condition: 'rcount increments', severity: 'Info' },
          ].map((evt) => (
            <div key={evt.name} className="bg-[#071526] border border-[#1e3a55] rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-200 font-medium">{evt.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  evt.severity === 'Critical' ? 'bg-red-500/20 text-red-400'
                  : evt.severity === 'Warning' ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
                }`}>{evt.severity}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-mono">{evt.condition}</div>
            </div>
          ))}
          <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2">
            <Plus size={10} /> Add Event Rule
          </button>
        </div>
      </ConfigSection>
    </div>
  );
}

function MonitoringPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
  return (
    <div className="p-3 space-y-3">
      {locked && (
        <div className="flex items-center gap-1.5 p-2 bg-[#040d18] border border-[#1e3a55] rounded text-[10px] text-slate-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Please complete ledger binding first
        </div>
      )}
      <ConfigSection title="Status Monitoring Configuration">
        <p className="text-[10px] text-slate-500 mb-3">Set threshold ranges and visual monitoring indicators for this equipment.</p>
        {[
          { label: 'Furnace Temperature Zone 1', min: '200', max: '260', unit: '°C', point: 'heat_zone_1' },
          { label: 'N2 Flow Rate', min: '60', max: '120', unit: 'L/min', point: 'n2_flow_avg' },
          { label: 'Production Rate', min: '800', max: '1500', unit: 'pcs/h', point: 'heat_ct_nt' },
        ].map((item) => (
          <div key={item.label} className="bg-[#071526] border border-[#1e3a55] rounded p-2 mb-2">
            <div className="text-[10px] text-slate-300 font-medium mb-2">{item.label}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] text-slate-500">Min</label>
                <input
                  defaultValue={item.min}
                  className="w-full bg-[#07111e] border border-[#1e3a55] rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 mt-0.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-slate-500">Max</label>
                <input
                  defaultValue={item.max}
                  className="w-full bg-[#07111e] border border-[#1e3a55] rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 mt-0.5"
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-4">{item.unit}</div>
            </div>
            <div className="text-[9px] text-slate-600 mt-1 font-mono">Data Point: {item.point}</div>
          </div>
        ))}
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
          <Plus size={10} /> Add Monitoring Rule
        </button>
      </ConfigSection>
    </div>
  );
}

function MetricsPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
  return (
    <div className="p-3 space-y-3">
      {locked && (
        <div className="flex items-center gap-1.5 p-2 bg-[#040d18] border border-[#1e3a55] rounded text-[10px] text-slate-500">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Please complete ledger binding first
        </div>
      )}
      <ConfigSection title="Metrics & KPI Configuration">
        <p className="text-[10px] text-slate-500 mb-3">Configure KPI formulas and data analysis targets for this equipment.</p>
        {[
          { name: 'OEE', formula: 'Availability × Performance × Quality', value: '—' },
          { name: 'MTBF', formula: 'Total uptime / Number of failures', value: '—' },
          { name: 'Throughput', formula: 'rcount / Time interval', value: '—' },
          { name: 'Temp Stability', formula: 'StdDev(heat_zone_1)', value: '—' },
        ].map((m) => (
          <div key={m.name} className="bg-[#071526] border border-[#1e3a55] rounded p-2 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-200 font-medium">{m.name}</span>
              <button className="text-slate-500 hover:text-blue-400">
                <Edit2 size={10} />
              </button>
            </div>
            <div className="text-[9px] text-slate-500 font-mono">{m.formula}</div>
            <div className="text-[9px] text-blue-400 mt-1">Current: {m.value}</div>
          </div>
        ))}
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
          <Plus size={10} /> Add Metric
        </button>
      </ConfigSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Business Data Binding Components
// ══════════════════════════════════════════════════════════════════════════════

/**
 * RuleBindingEntry — compact row for rule-type optional bindings
 * (Events / Monitor / Metrics) shown in factory & line property panels.
 *
 * States:
 *   locked         → prerequisite not yet bound; shows lock icon + hint
 *   configuredCount=0 → "未配置" with link to config page
 *   configuredCount>0 → green badge + count + manage link
 */
function RuleBindingEntry({
  label, icon, locked, configuredCount, projectId,
}: {
  label: string;
  icon: React.ReactNode;
  locked: boolean;
  configuredCount: number;
  projectId?: string;
}) {
  const navigate = useNavigate();

  if (locked) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2 rounded border border-[#142235] bg-[#040d18]/50">
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="text-[9px]">{icon}</span>
          <span className="text-[10px]">{label}</span>
          <span className="text-[9px] text-slate-700">(Optional)</span>
        </div>
        <div className="flex items-center gap-1 text-slate-700">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-[9px]">Requires basic data binding</span>
        </div>
      </div>
    );
  }

  if (configuredCount === 0) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2 rounded border border-[#142235] bg-[#040d18]/50">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="text-[9px]">{icon}</span>
          <span className="text-[10px]">{label}</span>
          <span className="text-[9px] text-slate-600">(Optional)</span>
        </div>
        <button
          onClick={() => projectId && navigate(`/factory/${projectId}/data-binding`)}
          className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          Configure →
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded border border-emerald-500/20 bg-emerald-500/5">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-emerald-400">{icon}</span>
        <span className="text-[10px] text-slate-300">{label}</span>
        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/25 rounded text-emerald-400">
          Configured
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-500">{configuredCount} rules</span>
        <button
          onClick={() => projectId && navigate(`/factory/${projectId}/data-binding`)}
          className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          Manage →
        </button>
      </div>
    </div>
  );
}

function DataBindingSection({
  nodeId, nodeType, label, platformConnected, bindingRecord, onBind, onUnbind,
}: {
  nodeId: string;
  nodeType: 'factory' | 'line' | 'equipment';
  label?: string; // section title override, defaults to "Business Data Binding"
  platformConnected: boolean;
  bindingRecord?: BindingRecord;
  onBind: () => void;
  onUnbind: () => void;
}) {
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

  // Reset confirm state when node changes
  const prevId = useRef(nodeId);
  if (prevId.current !== nodeId) { prevId.current = nodeId; if (showUnbindConfirm) setShowUnbindConfirm(false); }

  const platformRecord = bindingRecord ? PLATFORM_RECORDS.find((r) => r.id === bindingRecord.externalId) : undefined;
  const sectionTitle = label ?? 'Business Data Binding';
  const nodeLabel = nodeType === 'factory' ? 'factory' : nodeType === 'line' ? 'line' : 'equipment';

  if (!platformConnected) {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-400 leading-relaxed">
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
          <span>Platform not connected. Please go to integration configuration to connect the data platform.</span>
        </div>
      </ConfigSection>
    );
  }

  // ── 未配置 state ────────────────────────────────────────────────────────────
  if (!bindingRecord) {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="text-[10px] text-slate-500 leading-relaxed mb-2">
          Current {nodeLabel} instance is not bound to business data. After binding, key attributes will be synchronized with the data platform.
        </div>
        <button
          onClick={onBind}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-blue-600/15 border border-blue-500/40 rounded text-[10px] text-blue-300 hover:bg-blue-600/25 hover:border-blue-400/60 transition-colors"
        >
          <LinkIcon size={11} />
          Bind Business Data
        </button>
      </ConfigSection>
    );
  }

  // ── Unbind confirmation (shared across states) ─────────────────────────────
  const unbindBtn = showUnbindConfirm ? (
    <div className="bg-red-900/20 border border-red-700/40 rounded p-2">
      <div className="text-[10px] text-red-300 mb-2">
        After unbinding, this instance will no longer sync with the data platform. Confirm?
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => { onUnbind(); setShowUnbindConfirm(false); }}
          className="flex-1 py-1 bg-red-600/30 border border-red-500/50 rounded text-[10px] text-red-300 hover:bg-red-600/50 transition-colors"
        >Confirm Unbind</button>
        <button
          onClick={() => setShowUnbindConfirm(false)}
          className="flex-1 py-1 bg-[#071526] border border-[#1e3a55] rounded text-[10px] text-slate-400 hover:bg-[#0e243a] transition-colors"
        >Cancel</button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setShowUnbindConfirm(true)}
      className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-red-400 transition-colors"
    >
      <Unlink size={9} /> Unbind
    </button>
  );

  // ── 部分配置 state ──────────────────────────────────────────────────────────
  if (bindingRecord.status === 'partial') {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="space-y-2">
          {/* Yellow partial badge */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-amber-500/10 border-amber-500/30 text-amber-400">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={10} />
              <span className="text-[10px] font-medium">Partially Configured</span>
            </div>
            <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
          </div>
          {/* Already-filled field preview */}
          {bindingRecord.externalId && (
            <div className="flex justify-between py-0.5">
              <span className="text-[10px] text-slate-500">External ID</span>
              <span className="text-[10px] text-slate-400">{bindingRecord.externalId}</span>
            </div>
          )}
          {/* Missing required fields alert */}
          {bindingRecord.missingFields && bindingRecord.missingFields.length > 0 && (
            <div className="bg-amber-900/15 border border-amber-700/30 rounded p-2">
              <div className="text-[9px] text-amber-400/80 mb-1">The following required fields are incomplete:</div>
              <div className="flex flex-wrap gap-1">
                {bindingRecord.missingFields.map((f) => (
                  <span key={f} className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300">{f}</span>
                ))}
              </div>
            </div>
          )}
          {/* Continue configuring button */}
          <button
            onClick={onBind}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-600/15 border border-amber-500/40 rounded text-[10px] text-amber-300 hover:bg-amber-600/25 transition-colors"
          >
            <Edit2 size={10} />
            Continue
          </button>
          {unbindBtn}
        </div>
      </ConfigSection>
    );
  }

  // ── 绑定异常 state ──────────────────────────────────────────────────────────
  if (bindingRecord.status === 'error') {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="space-y-2">
          {/* Red exception badge */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={10} />
              <span className="text-[10px] font-medium">Binding Error</span>
            </div>
            <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
          </div>
          {/* Prominent error reason */}
          {bindingRecord.errorMessage && (
            <div className="flex items-start gap-1.5 bg-red-900/15 border border-red-700/30 rounded p-2">
              <AlertCircle size={10} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-300/90 leading-relaxed">{bindingRecord.errorMessage}</p>
            </div>
          )}
          <div className="flex justify-between py-0.5">
            <span className="text-[10px] text-slate-500">Source Name</span>
            <span className="text-[10px] text-slate-400">{bindingRecord.externalName}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-[10px] text-slate-500">Last Sync</span>
            <span className="text-[10px] text-slate-500 italic">{bindingRecord.lastSync}</span>
          </div>
          {/* Re-sync button */}
          <button
            onClick={onBind}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-blue-600/15 border border-blue-500/40 rounded text-[10px] text-blue-300 hover:bg-blue-600/25 transition-colors"
          >
            <RefreshCw size={10} />
            Re-sync
          </button>
          {unbindBtn}
        </div>
      </ConfigSection>
    );
  }

  // ── 已绑定 state ────────────────────────────────────────────────────────────
  return (
    <ConfigSection title={sectionTitle}>
      <div className="space-y-2">
        {/* Green bound badge */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-1.5">
            <LinkIcon size={10} />
            <span className="text-[10px] font-medium">Bound</span>
          </div>
          <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
        </div>

        <div className="space-y-0.5">
          <ConfigRow label="External ID" value={bindingRecord.externalId} />
          <ConfigRow label="Source Name" value={bindingRecord.externalName} />
          <ConfigRow label="Last Sync" value={bindingRecord.lastSync} />
        </div>

        {/* Platform field preview — max 4 entries (PRD Step 1) */}
        {platformRecord && (
          <div className="bg-[#040d18] border border-[#1e3a55] rounded p-2 space-y-0.5">
            <div className="text-[9px] text-slate-500 mb-1">Platform Data Fields</div>
            {Object.entries(platformRecord.fields).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{v.label}</span>
                <span className="text-slate-300">{v.value}</span>
              </div>
            ))}
          </div>
        )}

        {unbindBtn}
      </div>
    </ConfigSection>
  );
}

function BindPickerModal({
  nodeType, onSelect, onClose,
}: {
  nodeType: 'line' | 'equipment';
  onSelect: (record: PlatformRecord) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const records = PLATFORM_RECORDS.filter(
    (r) => r.entityType === nodeType &&
      (search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())),
  );
  const entityLabel = nodeType === 'line' ? 'Line' : 'Equipment';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#07111e] border border-[#1e3a55] rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#142235]">
          <div>
            <div className="text-[12px] font-semibold text-slate-200">Select Business Data Record</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Select {entityLabel} record from data platform to bind</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#142235] rounded transition-colors">
            <X size={12} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-[#040d18] border border-[#1e3a55] rounded px-2.5 py-1.5">
            <Search size={11} className="text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${entityLabel} name or code…`}
              className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder-slate-600 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {records.map((rec) => (
            <button
              key={rec.id}
              onClick={() => onSelect(rec)}
              className="w-full text-left bg-[#040d18] border border-[#1e3a55] rounded-lg p-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-slate-200 group-hover:text-blue-300 transition-colors">{rec.name}</span>
                <span className="text-[9px] font-mono text-blue-400/70 bg-blue-500/10 px-1.5 py-0.5 rounded">{rec.code}</span>
              </div>
              {rec.process && (
                <div className="text-[9px] text-slate-500 mb-1">Process: {rec.process}</div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(rec.fields).slice(0, 3).map(([k, v]) => (
                  <span key={k} className="text-[9px] text-slate-600">{v.label}：<span className="text-slate-400">{v.value}</span></span>
                ))}
              </div>
            </button>
          ))}
          {records.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-[11px]">未找到匹配的{entityLabel}记录</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConflictDiffModal({
  conflictState, onConfirm, onCancel,
}: {
  conflictState: ConflictModalState;
  onConfirm: (record: PlatformRecord) => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#07111e] border border-[#1e3a55] rounded-xl shadow-2xl w-[420px] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#142235] flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[12px] font-semibold text-slate-200">发现字段冲突</div>
            <div className="text-[10px] text-slate-500 mt-0.5">以下字段与平台数据存在差异，确认绑定后将以平台数据覆盖</div>
          </div>
        </div>

        <div className="px-4 py-3 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-500 pb-1.5 border-b border-[#142235] mb-1">
            <span>字段</span><span>当前值</span><span>平台数据（将覆盖）</span>
          </div>
          {conflictState.conflicts.map((c) => (
            <div key={c.field} className="grid grid-cols-3 gap-2 text-[10px] py-1.5 border-b border-[#142235]/40">
              <span className="text-slate-400">{c.label}</span>
              <span className="text-slate-500 line-through">{c.localValue}</span>
              <span className="text-amber-300 font-medium">{c.platformValue}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-[#142235] flex gap-2">
          <button
            onClick={() => onConfirm(conflictState.platformRecord)}
            className="flex-1 py-1.5 bg-blue-600/25 border border-blue-500/50 rounded text-[11px] text-blue-300 hover:bg-blue-600/40 transition-colors"
          >确认绑定（使用平台数据）</button>
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 bg-[#071526] border border-[#1e3a55] rounded text-[11px] text-slate-400 hover:bg-[#0e243a] transition-colors"
          >取消</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Situation C: Line mismatch modal ─────────────────────────────────────────
function LineMismatchModal({
  recordLineName, currentLineName, onClose,
}: {
  recordLineName: string;
  currentLineName: string;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#07111e] border border-[#1e3a55] rounded-xl shadow-2xl w-[400px] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#142235] flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[12px] font-semibold text-slate-200">产线不一致</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Line Mismatch</div>
          </div>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-[11px] text-slate-300 leading-relaxed">
            所选设备数据记录属于产线
            <span className="mx-1 px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded text-amber-300 font-medium">{recordLineName}</span>，
            但当前设备所属产线为
            <span className="mx-1 px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded text-blue-300 font-medium">{currentLineName}</span>。
          </p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            请调整当前设备的所属产线，或选择
            <span className="text-slate-300 mx-0.5">{currentLineName}</span>
            下的设备数据记录进行绑定。
          </p>
        </div>
        <div className="px-4 py-3 border-t border-[#142235] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600/25 border border-blue-500/50 rounded text-[11px] text-blue-300 hover:bg-blue-600/40 transition-colors"
          >
            知道了 / Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Form Subcomponents for Data Config View ────────────────────────────────
function LeaderInfoForm() {
  return (
    <FormCard title="2.1 Leader Information">
      <FormField label="Line Leader Name" placeholder="e.g. Zhang Wei" />
      <FormField label="Employee ID" placeholder="e.g. EMP-2024-001" />
      <FormField label="Contact Number" placeholder="e.g. +86 138 0000 1234" />
      <FormField label="Email" placeholder="e.g. zhang.wei@company.com" />
      <FormField label="Shift Schedule" type="select" options={['3-Shift Rotation', '2-Shift', 'Day Only']} />
      <div className="mt-4 pt-4 border-t border-[#1e3a55]">
        <label className="block text-[11px] text-slate-400 mb-2">Team Members</label>
        {['Shift A', 'Shift B', 'Shift C'].map((shift) => (
          <div key={shift} className="mb-2">
            <label className="text-[10px] text-slate-500 mb-1 block">{shift} Leader</label>
            <input
              placeholder={`${shift} leader name`}
              className="w-full bg-[#07111e] border border-[#1e3a55] rounded px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </FormCard>
  );
}

function LotInfoForm() {
  return (
    <FormCard title="2.2 Lot Information">
      <FormField label="Lot Size (pcs)" placeholder="e.g. 500" type="number" />
      <FormField label="Lot ID Format" placeholder="e.g. LOT-YYYYMMDD-###" />
      <FormField label="WIP Limit (pcs)" placeholder="e.g. 200" type="number" />
      <FormField label="Traceability Level" type="select" options={['Unit Level', 'Lot Level', 'Batch Level']} />
      <FormField label="Barcode Format" type="select" options={['QR Code', 'DataMatrix', '1D Barcode']} />
    </FormCard>
  );
}

function ErrorCodeForm() {
  return (
    <FormCard title="2.3 Error Code & Alarm Configuration">
      <p className="text-[11px] text-slate-400 mb-4">Define error codes, alarm categories, and escalation rules for this production line.</p>
      <div className="space-y-2">
        {[
          { code: 'E001', name: 'Equipment Offline', level: 'Critical' },
          { code: 'E002', name: 'Temperature Out of Range', level: 'Warning' },
          { code: 'E003', name: 'Low Material Supply', level: 'Warning' },
          { code: 'E004', name: 'Production Target Miss', level: 'Info' },
        ].map((err) => (
          <div key={err.code} className="bg-[#07111e] border border-[#1e3a55] rounded p-3 flex items-center gap-3">
            <span className="text-[10px] font-mono text-blue-400 w-12">{err.code}</span>
            <span className="text-[11px] text-slate-300 flex-1">{err.name}</span>
            <span className={`text-[9px] px-2 py-0.5 rounded ${
              err.level === 'Critical' ? 'bg-red-500/20 text-red-400'
              : err.level === 'Warning' ? 'bg-amber-500/20 text-amber-400'
              : 'bg-blue-500/20 text-blue-400'
            }`}>{err.level}</span>
            <button className="text-slate-500 hover:text-blue-400"><Edit2 size={11} /></button>
          </div>
        ))}
        <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2">
          <Plus size={12} /> Add Error Code
        </button>
      </div>
    </FormCard>
  );
}

function StatusMonitoringForm() {
  return (
    <FormCard title="2.4 Status Monitoring">
      <p className="text-[11px] text-slate-400 mb-4">Set production line status definitions and monitoring ranges.</p>
      {[
        { status: 'Running', color: 'emerald', condition: 'rcount increasing AND no active alarms' },
        { status: 'Idle', color: 'blue', condition: 'No production, no alarm, power ON' },
        { status: 'Alarm', color: 'red', condition: 'Any E001 or E002 active' },
        { status: 'Maintenance', color: 'amber', condition: 'Manual maintenance mode active' },
        { status: 'Offline', color: 'slate', condition: 'Device unreachable' },
      ].map((s) => (
        <div key={s.status} className="bg-[#07111e] border border-[#1e3a55] rounded p-2.5 mb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full bg-${s.color}-400`} />
            <span className="text-[11px] text-slate-200 font-medium">{s.status}</span>
          </div>
          <div className="text-[10px] text-slate-500">{s.condition}</div>
        </div>
      ))}
    </FormCard>
  );
}

function AIModelForm() {
  return (
    <FormCard title="2.5 AI Model & Data Analysis">
      <p className="text-[11px] text-slate-400 mb-4">Configure AI analysis models and predictive analytics for this production line.</p>
      <div className="space-y-3">
        {[
          { name: 'Predictive Maintenance', status: 'Active', model: 'LSTM v2.1' },
          { name: 'Quality Anomaly Detection', status: 'Inactive', model: 'Isolation Forest' },
          { name: 'Throughput Forecasting', status: 'Active', model: 'Prophet + XGBoost' },
        ].map((ai) => (
          <div key={ai.name} className="bg-[#07111e] border border-[#1e3a55] rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-200 font-medium">{ai.name}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded ${
                ai.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
              }`}>{ai.status}</span>
            </div>
            <div className="text-[10px] text-slate-500">Model: {ai.model}</div>
          </div>
        ))}
      </div>
    </FormCard>
  );
}

function DataPlatformForm() {
  return (
    <FormCard title="System & Data Integration">
      <p className="text-[11px] text-slate-400 mb-4">Configure data platform integrations and system connections.</p>
      <div className="space-y-3">
        {[
          { name: 'MES Integration', icon: <Database size={14} />, status: 'Connected', endpoint: 'https://mes.factory.local/api' },
          { name: 'SCADA Connection', icon: <Activity size={14} />, status: 'Connected', endpoint: '192.168.0.10:4840' },
          { name: 'Data Lake Export', icon: <Radio size={14} />, status: 'Pending', endpoint: 's3://factory-datalake/houston-p9' },
          { name: 'MOM System Sync', icon: <Link2 size={14} />, status: 'Configured', endpoint: 'https://mom.system.com/sync' },
        ].map((sys) => (
          <div key={sys.name} className="bg-[#07111e] border border-[#1e3a55] rounded p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-blue-400">{sys.icon}</span>
              <span className="text-[11px] text-slate-200 font-medium flex-1">{sys.name}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded ${
                sys.status === 'Connected' ? 'bg-emerald-500/20 text-emerald-400'
                : sys.status === 'Configured' ? 'bg-blue-500/20 text-blue-400'
                : 'bg-amber-500/20 text-amber-400'
              }`}>{sys.status}</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono truncate">{sys.endpoint}</div>
          </div>
        ))}
      </div>
    </FormCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Asset Library Panel (Left sidebar library section)
// ══════════════════════════════════════════════════════════════════════════════
const ASSET_CATEGORIES = [
  {
    id: 'equipment', label: 'Production Equipment', icon: '⚙', color: 'text-blue-400',
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
    id: 'lines', label: 'Production Lines', icon: '▣', color: 'text-emerald-400',
    children: [
      { id: 'l-smt', label: 'SMT Line Template', children: [] },
      { id: 'l-pth', label: 'PTH Line Template', children: [] },
      { id: 'l-assy', label: 'ASSY Line Template', children: [] },
    ],
  },
  {
    id: 'fixtures', label: 'Fixtures & Jigs', icon: '◈', color: 'text-amber-400',
    children: [
      { id: 'f-jig1', label: 'Wave Solder Carrier Jig', children: [] },
      { id: 'f-jig2', label: 'Test Fixture', children: [] },
    ],
  },
  {
    id: 'facility', label: 'Facility Equipment', icon: '◉', color: 'text-violet-400',
    children: [
      { id: 'fac-hvac', label: 'HVAC Air Handling Unit', children: [] },
      { id: 'fac-ups',  label: 'UPS Power System', children: [] },
    ],
  },
  {
    id: 'storage', label: 'Storage & Logistics', icon: '▷', color: 'text-slate-400',
    children: [
      { id: 's-rack', label: 'Automated Storage Rack', children: [] },
      { id: 's-agv',  label: 'AGV Transport Vehicle', children: [] },
    ],
  },
];

type AssetNode = { id: string; label: string; children?: AssetNode[] };
type AssetCat  = { id: string; label: string; icon: string; color: string; children: AssetNode[] };

function AssetLibraryNode({ node, depth }: { node: AssetNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isLeaf = !hasChildren;

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        draggable={isLeaf}
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
        <AssetLibraryNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function AssetLibraryPanel() {
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
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#142235]">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Layers3 size={10} className="text-blue-400" /> Asset Library
        </span>
      </div>

      {/* Search */}
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

      {/* Tree */}
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
              <AssetLibraryNode key={node.id} node={node} depth={1} />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-[10px] text-slate-600 text-center py-4">No assets found</div>
        )}
      </div>

      {/* Drag hint */}
      <div className="px-2 py-1.5 border-t border-[#142235]">
        <div className="text-[9px] text-slate-700 text-center">Drag assets into the 3D viewport</div>
      </div>
    </div>
  );
}

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
          {/* Arrow pointing left */}
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
function TreeNode({
  node, depth, selectedId, expandedIds, onSelect, onToggle,
}: {
  node: FactoryNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;

  const icon = (() => {
    // 错误状态优先，显示红色图标
    if (node.status === 'error') {
      switch (node.type) {
        case 'factory':   return <Building2 size={11} className="text-red-400 flex-shrink-0" />;
        case 'process':   return <Layers3 size={11} className="text-red-400 flex-shrink-0" />;
        case 'line':      return <GitBranch size={10} className="text-red-400 flex-shrink-0" />;
        case 'equipment': return <Cog size={10} className="text-red-400 flex-shrink-0" />;
      }
    }
    // 正常状态按类型显示颜色
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
        {/* Expand arrow */}
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

        {/* Hover actions */}
        <div className="hidden group-hover:flex items-center gap-0.5 ml-1 flex-shrink-0">
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

      {/* Children */}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared UI helpers
// ══════════════════════════════════════════════════════════════════════════════
function ActionBtn({
  icon, label, color, onClick, disabled,
}: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-900/40 text-blue-400 border-blue-700/40 hover:bg-blue-800/50',
    indigo: 'bg-indigo-900/40 text-indigo-400 border-indigo-700/40 hover:bg-indigo-800/50',
    slate:  'bg-slate-800/60 text-slate-400 border-slate-700/40 hover:bg-slate-700/50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded border transition-colors ${
        colorMap[color] ?? colorMap.slate
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon} {label}
    </button>
  );
}


function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
        <div className="w-[2px] h-3 bg-blue-500 rounded-full" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1e3a55] rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-[#0f2035] transition-colors"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-3 pb-3 pt-1 border-t border-[#1e3a55] space-y-1">{children}</div>}
    </div>
  );
}

function ConfigRow({
  label, value, editing, dropdown,
  nodeId, fieldPath, onFieldChange,
}: {
  label: string; value: string; editing?: boolean; dropdown?: boolean;
  nodeId?: string;
  fieldPath?: string;
  onFieldChange?: (nodeId: string, fieldPath: string, newValue: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
  };

  const handleBlur = () => {
    if (nodeId && fieldPath && onFieldChange && localValue !== value) {
      onFieldChange(nodeId, fieldPath, localValue);
    }
  };

  return (
    <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
      <div className="flex items-center gap-1 flex-shrink-0 mr-2">
        {dropdown && <ChevronDown size={9} className="text-slate-600" />}
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
      {editing ? (
        <input
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="text-[10px] text-slate-200 bg-[#071526] text-right border border-[#1e3a55] focus:border-blue-500 focus:outline-none rounded px-1.5 py-0.5 max-w-[55%]"
        />
      ) : (
        <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{value || '—'}</span>
      )}
    </div>
  );
}

function IoTField({ label, value, placeholder, editing }: { label: string; value: string; placeholder: string; editing: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
      <span className="text-[10px] text-slate-500 flex-shrink-0 mr-2">{label}</span>
      {editing ? (
        <input
          defaultValue={value}
          placeholder={placeholder}
          className="text-[10px] text-slate-200 bg-[#071526] border border-[#1e3a55] rounded px-2 py-0.5 text-right focus:outline-none focus:border-blue-500 w-28"
        />
      ) : (
        <span className="text-[10px] text-slate-200">{value || <span className="text-slate-600 italic">Not set</span>}</span>
      )}
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#07111e] border border-[#1e3a55] rounded-lg p-4">
      <h4 className="text-xs font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <div className="w-[2px] h-4 bg-blue-500 rounded-full" />
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({
  label, placeholder, type = 'text', options,
}: {
  label: string; placeholder?: string; type?: string; options?: string[];
}) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
      {type === 'select' && options ? (
        <select className="w-full bg-[#0b1d30] border border-[#1e3a55] rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          className="w-full bg-[#0b1d30] border border-[#1e3a55] rounded px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USDUploadModal
// ══════════════════════════════════════════════════════════════════════════════
const FORMAT_COLOR: Record<USDFileFormat, string> = {
  usd:  'bg-blue-600/20 text-blue-400 border-blue-600/40',
  usda: 'bg-violet-600/20 text-violet-400 border-violet-600/40',
  usdc: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/40',
  usdz: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  folder: 'bg-amber-600/20 text-amber-400 border-amber-600/40',
};

function USDUploadModal({
  projectName,
  files,
  onClose,
  onLink,
  onUnlink,
  onRemove,
  onAdd,
}: {
  projectName: string;
  files: USDFile[];
  onClose: () => void;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (files: USDFile[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<USDFile | null>(null);
  const [manualPath, setManualPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handlePathSelect(pathOrFiles: string | FileList | null) {
    let path = '';

    if (typeof pathOrFiles === 'string') {
      path = pathOrFiles.trim();
    } else if (pathOrFiles && pathOrFiles.length > 0) {
      // FileList 情况，取第一个文件
      path = pathOrFiles[0].name;
    } else {
      return;
    }

    if (!path) return;

    // 检查是文件还是文件夹
    const isUSD = /\.(usd|usda|usdc|usdz)$/i.test(path);
    const isFolder = !isUSD; // 如果不是USD文件扩展名，则假定为文件夹

    const fileName = path.split('/').pop() || path.split('\\').pop() || path;

    const newFile: USDFile = {
      id: `selected-${Date.now()}`,
      name: fileName,
      size: isFolder ? 0 : 1.0, // 文件夹大小设为0，文件设为默认1MB
      format: isFolder ? 'folder' : (path.split('.').pop()!.toLowerCase() as USDFileFormat),
      uploadedAt: new Date().toISOString().slice(0, 10),
      status: 'uploaded',
    };
    setSelectedFile(newFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    // 处理拖放的文件
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handlePathSelect(file.name);
    } else if (e.dataTransfer.items) {
      // 尝试获取路径信息
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            handlePathSelect(file.name);
            break;
          }
        }
      }
    }
  }

  function handleFolderSelect(files: FileList | null) {
    if (!files || files.length === 0) return;

    // Get folder name from first file's relative path
    const firstFile = files[0];
    const folderPath = firstFile.webkitRelativePath.split('/')[0];

    const newFile: USDFile = {
      id: `folder-${Date.now()}`,
      name: folderPath,
      size: 0, // Folder size
      format: 'folder',
      uploadedAt: new Date().toISOString().slice(0, 10),
      status: 'uploaded',
    };
    setSelectedFile(newFile);
  }

  function handleLink() {
    if (selectedFile) {
      // Unlink any currently linked file first
      const currentlyLinked = files.find(f => f.status === 'linked');
      if (currentlyLinked) {
        onUnlink(currentlyLinked.id);
      }

      onAdd([selectedFile]);
      onLink(selectedFile.id);
      setSelectedFile(null);
    }
  }

  function handleRemove() {
    if (selectedFile) {
      onRemove(selectedFile.id);
      setSelectedFile(null);
    }
  }

  const linkedFile = files.find((f) => f.status === 'linked');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#071526] border border-[#1e3a55] rounded-xl w-[680px] max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
              <HardDrive size={15} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">USD Model File/Folder</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{projectName} · Select single USD file or folder</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-slate-500 flex items-center gap-2">
              <span className="text-slate-300 font-medium">{files.length}</span> files total
              {linkedFile && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-emerald-400 font-medium">1</span> linked
                </>
              )}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* File Selection Area */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg py-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragging
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-[#1e3a55] hover:border-blue-500/60 hover:bg-[#0b1d30]'
            }`}
          >
            {!selectedFile ? (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-3">
                  <FolderOpen size={18} className="text-blue-400" />
                </div>
                <p className="text-xs text-slate-300 font-medium">Drag & drop or browse USD file</p>
                <p className="text-[10px] text-slate-500 mt-1">Supports .usd · .usda · .usdc · .usdz</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".usd,.usda,.usdc,.usdz"
                  className="hidden"
                  onChange={(e) => handlePathSelect(e.target.files)}
                />
                <div className="mt-3 flex gap-2 justify-center">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="text-[11px] text-slate-300 bg-[#0b1d30] border border-[#142235] rounded px-3 py-1.5 hover:border-blue-500/60 hover:bg-[#0b1d30] transition-colors flex items-center gap-1.5"
                  >
                    <FolderOpen size={11} /> Select folder
                  </button>
                </div>
                <input
                  ref={folderInputRef}
                  type="file"
                  {...({ webkitdirectory: "true" } as any)}
                  className="hidden"
                  onChange={(e) => handleFolderSelect(e.target.files)}
                />
                <div className="mt-3 pt-3 border-t border-[#142235] w-full">
                  <p className="text-[11px] text-slate-500 mb-2 text-center">Or enter path manually</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualPath}
                      onChange={(e) => setManualPath(e.target.value)}
                      placeholder="e.g., /path/to/file.usd or /path/to/folder"
                      className="flex-1 text-[11px] bg-[#0b1d30] border border-[#142235] rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handlePathSelect(manualPath)}
                      className="text-[11px] text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 transition-colors flex-shrink-0"
                    >
                      Use
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full px-4">
                <div className="flex items-center gap-3 bg-[#0b1d30] border border-[#142235] rounded-lg px-3 py-2.5">
                  {/* Format badge */}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0 tracking-wider ${FORMAT_COLOR[selectedFile.format] ?? 'bg-slate-600/20 text-slate-400 border-slate-600/40'}`}>
                    {selectedFile.format}
                  </span>

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-200 truncate">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{selectedFile.size} MB</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>{selectedFile.uploadedAt}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleLink}
                      title="Link to scene"
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                    >
                      <Link2 size={11} />
                    </button>
                    <button
                      onClick={handleRemove}
                      title="Remove"
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-2 text-center">Click outside or drop another file to change selection</p>
              </div>
            )}
          </div>
        </div>

        {/* Currently Linked File/Folder */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[11px] font-medium text-slate-400 mb-3">
            <span>Currently linked file/folder</span>
          </div>

          {linkedFile ? (
            <div className="flex items-center gap-3 bg-[#0b1d30] border border-[#142235] rounded-lg px-3 py-2.5">
              {/* Format badge */}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0 tracking-wider ${FORMAT_COLOR[linkedFile.format] ?? 'bg-slate-600/20 text-slate-400 border-slate-600/40'}`}>
                {linkedFile.format}
              </span>

              {/* Name + info */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-200 truncate">{linkedFile.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{linkedFile.size} MB</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span>{linkedFile.uploadedAt}</span>
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <LinkIcon size={10} /> Linked
                </span>
                <button
                  onClick={() => onUnlink(linkedFile.id)}
                  title="Unlink"
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                  <Unlink size={11} />
                </button>
                <button
                  onClick={() => onRemove(linkedFile.id)}
                  title="Remove"
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-[11px] text-slate-600">
              <FileBox size={22} className="mx-auto mb-2 opacity-40" />
              No file currently linked
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#142235] flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <AlertCircle size={10} />
            USD files are versioned per factory project
          </p>
          <button
            onClick={onClose}
            className="text-[11px] text-white bg-blue-600 hover:bg-blue-700 rounded px-4 py-1.5 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

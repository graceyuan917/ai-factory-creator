import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronRight, ChevronLeft, Plus, MoreHorizontal,
  Eye, Send, Layers3, Check,
  Save, ShieldCheck,
  Link2, ClipboardList,
  Upload, Building2,
} from 'lucide-react';
import {
  mockFactoryProjects,
  generateValidationItems,
  type FactoryNode,
  type ProjectStatus,
} from '../data/mockData';
import { NewProjectModal } from '../components/editor/NewProjectModal';
import { ValidationModal } from '../components/editor/ValidationModal';
import { ActionBtn } from '../components/editor/UiComponents';
import { TreeNode } from '../components/editor/TreePanel';
import { AssetLibraryPanel } from '../components/editor/AssetLibraryPanel';
import { Viewport3D } from '../components/editor/Viewport3D';
import { RightPanel } from '../components/editor/RightPanel';
import { USDUploadModal } from '../components/editor/USDUploadModal';
import { updateTreeStatuses } from '../utils/statusCalculator';
import {
  findNode, getNodePath, updateNodeStatus, updateNodeData,
  type RightTab, type ViewMode, type USDFile,
  STATUS_CONFIG,
} from '../types/factoryEditor';

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
  const [viewMode, setViewMode] = useState<ViewMode>('floor');
  const [viewContextId, setViewContextId] = useState<string | null>(null);

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

  const viewContextNode = useMemo(
    () => (viewContextId ? findNode(factoryTree, viewContextId) : null),
    [factoryTree, viewContextId]
  );

  const breadcrumb = useMemo((): FactoryNode[] => {
    if (viewMode === 'floor') return [factoryTree];
    const contextId = viewContextId ?? selectedNodeId;
    return getNodePath(factoryTree, contextId);
  }, [viewMode, viewContextId, selectedNodeId, factoryTree]);

  function handleTreeNodeClick(nodeId: string) {
    const node = findNode(factoryTree, nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    setRightTab('base');
    // Auto-expand all ancestors in tree
    const path = getNodePath(factoryTree, nodeId);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      path.forEach((n) => next.add(n.id));
      return next;
    });
    // View navigation: single-click only goes back to floor view on factory/process
    // line/equipment nodes do NOT switch view on single click (PRD C1.2.2)
    if (node.type === 'factory' || node.type === 'process') {
      setViewMode('floor');
      setViewContextId(null);
    }
    // line/equipment: view switching (drill-in) happens on double-click or drill-in button
  }

  function handleDrillIn(nodeId: string) {
    console.log('handleDrillIn called with nodeId:', nodeId);
    const node = findNode(factoryTree, nodeId);
    if (!node) {
      console.log('Node not found:', nodeId);
      return;
    }
    console.log('Node found:', node.name, 'type:', node.type);
    setSelectedNodeId(nodeId);
    setRightTab('base');
    // Auto-expand all ancestors in tree
    const path = getNodePath(factoryTree, nodeId);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      path.forEach((n) => next.add(n.id));
      return next;
    });

    // Switch to appropriate view based on node type
    if (node.type === 'factory' || node.type === 'process') {
      console.log('Setting view to floor');
      setViewMode('floor');
      setViewContextId(null);
    } else if (node.type === 'line') {
      console.log('Setting view to line');
      setViewMode('line');
      setViewContextId(nodeId);
    } else if (node.type === 'equipment') {
      console.log('Setting view to equipment');
      setViewMode('equipment');
      setViewContextId(nodeId);
    }
  }

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
                  onSelect={handleTreeNodeClick}
                  onToggle={toggleExpand}
                  onDrillIn={handleDrillIn}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Center Viewport ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Viewport Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07111e]">
            <Viewport3D
              selectedNode={selectedNode}
              viewMode={viewMode}
              viewContextNode={viewContextNode}
              breadcrumb={breadcrumb}
              onBreadcrumbClick={handleDrillIn}
              onCanvasNodeClick={handleTreeNodeClick}
            />
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


import React, { useState, useRef } from 'react';
import {
  Cog, Check, X, Edit2, FileText, Zap, Activity, BarChart3, Wifi, AlertCircle, MousePointer2,
} from 'lucide-react';
import type { FactoryNode, ProjectStatus } from '../../data/mockData';
import {
  findNode, findParentLine, detectConflicts,
  type RightTab, type BindingType, type BindingRecord, type PlatformRecord, type ConflictModalState,
} from '../../types/factoryEditor';
import { FactoryConfigPanel, ProcessConfigPanel, LineConfigPanel, LedgerPanel, IoTPanel, EventsPanel, MonitoringPanel, MetricsPanel } from './ConfigPanels';
import { BindPickerModal, ConflictDiffModal, LineMismatchModal } from './BindingComponents';

export function RightPanel({
  selectedNode, rightTab, onTabChange, projectStatus, projectId, factoryTree, onTreeNodeStatusChange, onNodeUpdate,
  bindingMap, onSetBindingMap,
}: {
  selectedNode: FactoryNode | null;
  rightTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  projectStatus: ProjectStatus;
  projectId?: string;
  factoryTree: FactoryNode;
  onTreeNodeStatusChange: (nodeId: string, newStatus: FactoryNode['status']) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<FactoryNode>) => void;
  bindingMap: Record<string, BindingRecord>;
  onSetBindingMap: React.Dispatch<React.SetStateAction<Record<string, BindingRecord>>>;
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
  const [bindModalNode, setBindModalNode] = useState<{ id: string; bindingType: BindingType; nodeType: 'factory' | 'line' | 'equipment' } | null>(null);
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
    onSetBindingMap((m) => ({
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
    onSetBindingMap((m) => { const n = { ...m }; delete n[bindKey(nodeId, bindingType)]; return n; });
    onTreeNodeStatusChange(nodeId, 'empty');
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

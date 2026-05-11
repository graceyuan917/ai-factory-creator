import type { FactoryNode } from '../data/mockData';
import { updateNodeStatusIfChanged } from '../utils/statusCalculator';

// ── Types ──────────────────────────────────────────────────────────────────

export type RightTab = 'base' | 'iot' | 'events' | 'monitoring' | 'metrics';
export type ViewMode = 'floor' | 'line' | 'equipment';

export type USDFileFormat = 'usd' | 'usda' | 'usdc' | 'usdz' | 'folder';
export interface USDFile {
  id: string;
  name: string;
  size: number; // MB
  format: USDFileFormat;
  uploadedAt: string;
  status: 'uploaded' | 'linked';
  progress?: number; // 0-100, present while uploading
}

export type BindingType = 'BASIC_DATA' | 'LEDGER' | 'IOT' | 'EVENTS' | 'MONITOR' | 'METRICS';

export type BindingRecord = {
  externalId: string;
  externalName: string;
  sourceSystem: string;
  lastSync: string;
  status: 'bound' | 'partial' | 'error';
  errorMessage?: string;
  missingFields?: string[];
};

export type PlatformRecord = {
  id: string;
  code: string;
  name: string;
  entityType: 'line' | 'equipment';
  process?: string;
  parentLineId?: string;
  fields: Record<string, { label: string; value: string }>;
};

export type ConflictField = { field: string; label: string; localValue: string; platformValue: string };

export type ConflictModalState = {
  nodeId: string;
  platformRecord: PlatformRecord;
  conflicts: ConflictField[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function findNode(tree: FactoryNode, id: string): FactoryNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Returns path from root to targetId (inclusive). Empty array if not found. */
export function getNodePath(root: FactoryNode, targetId: string): FactoryNode[] {
  if (root.id === targetId) return [root];
  for (const child of root.children ?? []) {
    const path = getNodePath(child, targetId);
    if (path.length > 0) return [root, ...path];
  }
  return [];
}

/** Returns the parent line node id for a given equipment node id, or null. */
export function findParentLine(tree: FactoryNode, equipmentId: string): string | null {
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
export function updateNodeStatus(tree: FactoryNode, nodeId: string, newStatus: FactoryNode['status']): FactoryNode {
  if (tree.id === nodeId) return { ...tree, status: newStatus };
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => updateNodeStatus(c, nodeId, newStatus)) };
}

/** Update node data and recalculate status. */
export function updateNodeData(tree: FactoryNode, nodeId: string, updates: Partial<FactoryNode>): FactoryNode {
  const updatedTree = updateNode(tree, nodeId, (node) => ({ ...node, ...updates }));
  return updateNodeStatusIfChanged(updatedTree, nodeId);
}

/** Helper to update a node with a transformation function. */
export function updateNode(tree: FactoryNode, nodeId: string, updater: (node: FactoryNode) => FactoryNode): FactoryNode {
  if (tree.id === nodeId) return updater(tree);
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => updateNode(c, nodeId, updater)) };
}

// ── Tree Manipulation Utilities ───────────────────────────────────────────

/** Add a child node to the specified parent. Returns a new tree. */
export function addChildNode(tree: FactoryNode, parentId: string, child: FactoryNode): FactoryNode {
  if (tree.id === parentId) {
    return { ...tree, children: [...(tree.children ?? []), child] };
  }
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => addChildNode(c, parentId, child)) };
}

/** Remove a node from its parent. Returns the modified tree and the removed node. */
export function removeNode(tree: FactoryNode, nodeId: string): { tree: FactoryNode; removed: FactoryNode | null } {
  if (!tree.children) return { tree, removed: null };
  const childIndex = tree.children.findIndex((c) => c.id === nodeId);
  if (childIndex !== -1) {
    const removed = tree.children[childIndex];
    const newChildren = [...tree.children];
    newChildren.splice(childIndex, 1);
    return { tree: { ...tree, children: newChildren }, removed };
  }
  for (const child of tree.children) {
    const result = removeNode(child, nodeId);
    if (result.removed) {
      return {
        tree: { ...tree, children: tree.children.map((c) => (c.id === child.id ? result.tree : c)) },
        removed: result.removed,
      };
    }
  }
  return { tree, removed: null };
}

/** Move a node from its current parent to a new parent. Returns a new tree. */
export function moveNode(tree: FactoryNode, nodeId: string, newParentId: string): FactoryNode {
  const { tree: treeWithout, removed } = removeNode(tree, nodeId);
  if (!removed) return tree;
  return addChildNode(treeWithout, newParentId, removed);
}

/** Returns all descendant nodes of the given node that have bound ledger bindings. */
export function findBoundEquipmentDescendants(node: FactoryNode, bindingMap: Record<string, BindingRecord>): FactoryNode[] {
  const result: FactoryNode[] = [];
  function walk(n: FactoryNode) {
    if (n.type === 'equipment') {
      const ledgerKey = `${n.id}_LEDGER`;
      const binding = bindingMap[ledgerKey];
      if (binding && binding.status === 'bound') result.push(n);
    }
    for (const child of n.children ?? []) walk(child);
  }
  walk(node);
  return result;
}

/**
 * Validate whether a node can be reparented under a new parent.
 * Checks: type compatibility, circular reference, and business data binding constraints.
 */
export function validateReparent(
  tree: FactoryNode,
  nodeId: string,
  newParentId: string,
  bindingMap: Record<string, BindingRecord>,
): { valid: boolean; reason?: string } {
  const node = findNode(tree, nodeId);
  const newParent = findNode(tree, newParentId);
  if (!node || !newParent) return { valid: false, reason: 'Node not found' };

  if (node.type === 'factory') return { valid: false, reason: 'Cannot move the root Factory node' };
  if (nodeId === newParentId) return { valid: false, reason: 'Cannot move a node to itself' };
  if (findNode(node, newParentId)) return { valid: false, reason: 'Cannot move a node into its own child' };

  // Type compatibility
  if (node.type === 'process' && newParent.type !== 'factory') return { valid: false, reason: 'Process can only be placed under Factory' };
  if (node.type === 'line' && newParent.type !== 'process') return { valid: false, reason: 'Line can only be placed under Process' };
  if (node.type === 'equipment' && newParent.type !== 'line') return { valid: false, reason: 'Equipment can only be placed under Line' };

  // Binding compatibility for equipment
  if (node.type === 'equipment') {
    const ledgerKey = `${nodeId}_LEDGER`;
    const ledgerBinding = bindingMap[ledgerKey];
    if (ledgerBinding && ledgerBinding.status === 'bound' && ledgerBinding.externalId) {
      const record = PLATFORM_RECORDS.find((r) => r.id === ledgerBinding.externalId);
      if (record?.parentLineId && record.parentLineId !== newParentId) {
        const recordLine = findNode(tree, record.parentLineId);
        return { valid: false, reason: `Equipment ledger record belongs to "${recordLine?.name || record.parentLineId}", cannot move to different line` };
      }
    }
  }

  // Binding compatibility for line
  if (node.type === 'line') {
    const basicDataKey = `${nodeId}_BASIC_DATA`;
    const basicBinding = bindingMap[basicDataKey];
    if (basicBinding && basicBinding.status === 'bound' && basicBinding.externalId) {
      const record = PLATFORM_RECORDS.find((r) => r.id === basicBinding.externalId);
      if (record?.process && record.process !== newParent.name) {
        return { valid: false, reason: `Line is bound to process "${record.process}", cannot move to "${newParent.name}"` };
      }
    }
    // Check children equipment for bound ledger records
    const boundChildren = findBoundEquipmentDescendants(node, bindingMap);
    if (boundChildren.length > 0) {
      return { valid: false, reason: `${boundChildren.length} equipment(s) under this line have ledger bindings. Unbind them first.` };
    }
  }

  return { valid: true };
}

/**
 * Get a default 3D anchor position for a new child node based on the parent's type
 * and the number of existing siblings (for stagger offset).
 */
export function getDefaultChildPosition(parentNode: FactoryNode, existingSiblingCount: number): { x: number; y: number } {
  if (parentNode.type === 'line') {
    return { x: 80 + existingSiblingCount * 60, y: 160 };
  }
  if (parentNode.type === 'process') {
    return { x: 200, y: 60 + existingSiblingCount * 40 };
  }
  return { x: 290, y: 180 };
}

// ── Constants ──────────────────────────────────────────────────────────────

export const NODE_STATUS_TEXT: Record<string, string> = {
  configured: '已配置：节点所有必需属性已完整配置',
  partial: '部分配置：节点有部分属性未配置',
  empty: '未配置：节点尚未配置任何属性',
  error: '配置错误：节点配置存在错误或验证失败，需要修复',
};

export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Draft',      cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  complete: { label: 'Completed',  cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  published:{ label: 'Published',  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  archived: { label: 'Archived',   cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
};

export const PLATFORM_RECORDS: PlatformRecord[] = [
  { id: 'plt-l-001', code: 'SMT-01-HOU', name: 'SMT01号线', entityType: 'line', process: 'SMT制程',
    fields: {} },
  { id: 'plt-l-002', code: 'SMT-02-HOU', name: 'SMT02号线', entityType: 'line', process: 'SMT制程',
    fields: {} },
  { id: 'plt-l-003', code: 'ASSY-01-HOU', name: 'ASSY组装线01号', entityType: 'line', process: 'ASSY制程',
    fields: {} },
  { id: 'plt-e-001', code: 'DEK-NHZ-001', name: 'DEK全自动印刷机#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.20' } } },
  { id: 'plt-e-002', code: 'JUKI-FX-001', name: 'JUKI高速贴片机#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.15' } } },
  { id: 'plt-e-003', code: 'KE-RSF-001', name: 'Kurtz Ersa回流焊炉#1', entityType: 'equipment', parentLineId: 'smt02-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '维保中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.20' } } },
  { id: 'plt-e-004', code: 'DEK-NHZ-002', name: 'DEK全自动印刷机#2', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.10' } } },
  { id: 'plt-e-005', code: 'DEK-NHZ-003', name: 'DEK全自动印刷机#3', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.12.12' } } },
  { id: 'plt-e-006', code: 'JUKI-FX-002', name: 'JUKI高速贴片机#2', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.10' } } },
  { id: 'plt-e-007', code: 'JUKI-FX-003', name: 'JUKI高速贴片机#3', entityType: 'equipment', parentLineId: 'smt01-line',
    fields: { EQUIP_CODE: { label: '所属产线', value: 'SMT01号线' }, STATUS: { label: '设备状态', value: '运行中' }, INSTALL_DATE: { label: '安装日期', value: '2025.11.12' } } },
];

export const INITIAL_BINDING_MAP: Record<string, BindingRecord> = {
  'houston-p9_BASIC_DATA': { externalId: 'plt-f-001', externalName: 'Houston P9 AI Factory', sourceSystem: 'ERP', lastSync: '2026-04-18 08:00', status: 'bound' },
  'smt01-line_BASIC_DATA': { externalId: 'plt-l-001', externalName: 'SMT贴片线01号', sourceSystem: 'ERP', lastSync: '2026-04-17 09:15', status: 'bound' },
  'smt02-line_BASIC_DATA': { externalId: 'plt-l-002', externalName: 'SMT贴片线02号', sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  'smt03-line_BASIC_DATA': { externalId: 'plt-l-003', externalName: '', sourceSystem: 'ERP', lastSync: '', status: 'partial',
    missingFields: ['产线名称', '产线编码', '所属制程'] },
  'stencil-printer-2_LEDGER': { externalId: 'plt-e-001', externalName: 'DEK全自动印刷机#1',  sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  'reflow-furnace-2_LEDGER':  { externalId: 'plt-e-003', externalName: 'Kurtz Ersa回流焊炉#1', sourceSystem: 'ERP', lastSync: '2026-04-18 10:30', status: 'bound' },
  'chip-mounter-2_LEDGER':    { externalId: 'plt-e-002', externalName: 'JUKI高速贴片机#1', sourceSystem: 'ERP', lastSync: '2026-04-15 08:00', status: 'error',
    errorMessage: '平台记录关键标识符已变更（JUKI-FX-001 → JUKI-FX-003），无法自动匹配，请重新绑定或更新设备编码' },
  'stencil-printer-1_LEDGER':  { externalId: 'plt-e-004', externalName: 'DEK全自动印刷机#2', sourceSystem: 'ERP', lastSync: '2026-04-16 09:20', status: 'bound' },
  'stencil-printer-11_LEDGER': { externalId: 'plt-e-005', externalName: 'DEK全自动印刷机#3', sourceSystem: 'ERP', lastSync: '2026-04-16 09:25', status: 'bound' },
  'chip-mounter-1_LEDGER':     { externalId: 'plt-e-006', externalName: 'JUKI高速贴片机#2', sourceSystem: 'ERP', lastSync: '2026-04-16 10:15', status: 'bound' },
  'chip-mounter-11_LEDGER':    { externalId: 'plt-e-007', externalName: 'JUKI高速贴片机#3', sourceSystem: 'ERP', lastSync: '2026-04-16 10:20', status: 'bound' },
  'reflow-furnace-2_IOT': { externalId: '', externalName: '', sourceSystem: 'IoT', lastSync: '', status: 'partial',
    missingFields: ['IoT IP', '端口', '站号', '采集周期'] },
  'smt03-stencil-printer_LEDGER': { externalId: '', externalName: '', sourceSystem: 'ERP', lastSync: '', status: 'partial',
    missingFields: ['设备编码', '设备名称', '设备类型'] },
  'smt03-chip-mounter_LEDGER': { externalId: '', externalName: '', sourceSystem: 'ERP', lastSync: '', status: 'partial',
    missingFields: ['设备编码', '设备名称', '设备类型'] },
  'smt03-reflow-furnace_LEDGER': { externalId: '', externalName: '', sourceSystem: 'ERP', lastSync: '', status: 'partial',
    missingFields: ['设备编码', '设备名称', '设备类型'] },
};

export function detectConflicts(record: PlatformRecord): ConflictField[] {
  if (record.id === 'plt-l-001') {
    return [{ field: 'MAX_UPH', label: '最大 UPH', localValue: '1200 pcs/h', platformValue: '1350 pcs/h' }];
  }
  if (record.id === 'plt-e-003') {
    return [{ field: 'EQUIP_NAME', label: '设备名称', localValue: 'Reflow Soldering Furnace', platformValue: 'Kurtz Ersa HOTFLOW 3/20' }];
  }
  return [];
}

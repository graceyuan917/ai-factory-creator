import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import {
  AlertCircle, LinkIcon, Unlink, Edit2, RefreshCw, Search, X, Plus,
} from 'lucide-react';
import type { BindingRecord, PlatformRecord, ConflictModalState } from '../../types/factoryEditor';
import { PLATFORM_RECORDS } from '../../types/factoryEditor';
import { ConfigSection } from './UiComponents';

// ── RuleBindingEntry ───────────────────────────────────────────────────────

export function RuleBindingEntry({
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

// ── DataBindingSection ─────────────────────────────────────────────────────

export function DataBindingSection({
  nodeId, nodeType, label, platformConnected, bindingRecord, onBind, onUnbind,
}: {
  nodeId: string;
  nodeType: 'factory' | 'line' | 'equipment';
  label?: string;
  platformConnected: boolean;
  bindingRecord?: BindingRecord;
  onBind: () => void;
  onUnbind: () => void;
}) {
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);

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

  if (bindingRecord.status === 'partial') {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <div className="flex items-center gap-1.5">
              <LinkIcon size={10} />
              <span className="text-[10px] font-medium">Bound</span>
            </div>
            <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
              <span className="text-[10px] text-slate-500">External ID</span>
              <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{bindingRecord.externalId}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
              <span className="text-[10px] text-slate-500">Source Name</span>
              <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{bindingRecord.externalName}</span>
            </div>
            {bindingRecord.lastSync && (
              <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
                <span className="text-[10px] text-slate-500">Last Sync</span>
                <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{bindingRecord.lastSync}</span>
              </div>
            )}
          </div>
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
          {unbindBtn}
        </div>
      </ConfigSection>
    );
  }

  if (bindingRecord.status === 'error') {
    return (
      <ConfigSection title={sectionTitle}>
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-red-500/10 border-red-500/30 text-red-400">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={10} />
              <span className="text-[10px] font-medium">Binding Error</span>
            </div>
            <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
          </div>
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

  return (
    <ConfigSection title={sectionTitle}>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 py-1.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-1.5">
            <LinkIcon size={10} />
            <span className="text-[10px] font-medium">Bound</span>
          </div>
          <span className="text-[9px] opacity-70">{bindingRecord.sourceSystem}</span>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
            <span className="text-[10px] text-slate-500">External ID</span>
            <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{bindingRecord.externalId}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#142235]/60">
            <span className="text-[10px] text-slate-500">Last Sync</span>
            <span className="text-[10px] text-slate-200 text-right max-w-[55%] truncate">{bindingRecord.lastSync}</span>
          </div>
        </div>
        {unbindBtn}
      </div>
    </ConfigSection>
  );
}

// ── BindPickerModal ────────────────────────────────────────────────────────

export function BindPickerModal({
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

// ── ConflictDiffModal ──────────────────────────────────────────────────────

export function ConflictDiffModal({
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

// ── LineMismatchModal ──────────────────────────────────────────────────────

export function LineMismatchModal({
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

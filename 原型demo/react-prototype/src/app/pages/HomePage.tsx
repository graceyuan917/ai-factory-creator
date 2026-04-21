import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, ChevronRight, Clock, LayoutDashboard, Package, Cpu,
  Send, CheckCircle2, FileEdit, Layers3, GitBranch, Link2,
  Settings, TrendingUp, AlertTriangle, Activity, Database,
  Users, Box, ArrowUpRight, RefreshCw, FolderArchive,
} from 'lucide-react';
import {
  mockFactoryProjects,
  assetLibraryCategories,
  recentFacilities,
  mockDataSources,
  type ProjectStatus,
  type SourceStatus,
} from '../data/mockData';
import { NewProjectModal } from '../components/editor/NewProjectModal';
import { NavSidebar } from '../components/NavSidebar';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:    { label: 'Draft',     cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40',  icon: <FileEdit size={10} /> },
  complete: { label: 'Completed', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: <CheckCircle2 size={10} /> },
  published:{ label: 'Published', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40',    icon: <Send size={10} /> },
  archived: { label: 'Archived',  cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40', icon: <FolderArchive size={10} /> },
};

const SOURCE_STATUS: Record<SourceStatus, { dot: string; label: string }> = {
  connected:    { dot: 'bg-emerald-400', label: 'Connected',    cls: 'text-emerald-400' },
  disconnected: { dot: 'bg-slate-500',   label: 'Disconnected', cls: 'text-slate-500'   },
  error:        { dot: 'bg-red-400',     label: 'Error',        cls: 'text-red-400'     },
  syncing:      { dot: 'bg-blue-400',    label: 'Syncing',      cls: 'text-blue-400'    },
};

const STATS = [
  { label: 'Factory Projects', value: '2', sub: '1 published', icon: <GitBranch size={16} />, color: 'text-blue-400', bg: 'bg-blue-600/10' },
  { label: 'Asset Models', value: '85', sub: '4 categories', icon: <Box size={16} />, color: 'text-violet-400', bg: 'bg-violet-600/10' },
  { label: 'Data Sources', value: '4', sub: '1 error', icon: <Database size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
  { label: 'Active Users', value: '6', sub: 'this month', icon: <Users size={16} />, color: 'text-amber-400', bg: 'bg-amber-600/10' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex h-screen bg-[#07111e] text-slate-100 overflow-hidden select-none">
      <NavSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-11 bg-[#07111e] border-b border-[#142235] flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Layers3 size={13} />
            </div>
            <span className="text-sm font-semibold tracking-[0.15em] text-blue-300 uppercase">
              AI Factory Creator
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
            <span>v2.3.0</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>Houston P9 Workspace</span>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-[#0b1d30] border border-[#142235] rounded-lg p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-100">{s.value}</div>
                  <div className="text-[11px] text-slate-500">{s.label}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick Actions ── */}
          <section>
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { icon: <Plus size={14} />, label: '新建工厂项目', sub: 'New Factory Project', color: 'bg-blue-600 hover:bg-blue-700', onClick: () => setShowModal(true) },
                { icon: <Package size={14} />, label: '浏览资产库', sub: 'Browse Asset Library', color: 'bg-[#0b1d30] hover:bg-[#0e243a] border border-[#1e3a55]', onClick: () => navigate('/asset-library') },
                { icon: <Link2 size={14} />, label: '数据集成配置', sub: 'Integration Config', color: 'bg-[#0b1d30] hover:bg-[#0e243a] border border-[#1e3a55]', onClick: () => navigate('/integration') },
                { icon: <Settings size={14} />, label: '系统管理', sub: 'System Admin', color: 'bg-[#0b1d30] hover:bg-[#0e243a] border border-[#1e3a55]', onClick: () => navigate('/admin') },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={`${a.color} rounded-lg px-4 py-3 text-left transition-all group`}
                >
                  <div className="flex items-center gap-2 mb-1 text-slate-100">{a.icon}<span className="text-xs font-medium">{a.label}</span></div>
                  <div className="text-[10px] text-slate-400">{a.sub}</div>
                </button>
              ))}
            </div>
          </section>

          {/* ── 3D Asset Library + Integration status (2 cols) ── */}
          <div className="grid grid-cols-2 gap-6">
            {/* 3D Asset Management */}
            <section>
              <SectionHeader title="3D Digital Asset Management" onViewAll={() => navigate('/asset-library')} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                {assetLibraryCategories.slice(0, 4).map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/asset-library/${cat.id}`)}
                    className="bg-[#0b1d30] border border-[#142235] rounded-lg overflow-hidden cursor-pointer hover:border-blue-500/50 hover:bg-[#0e243a] transition-all group"
                  >
                    <div className="h-24 relative overflow-hidden">
                      <img src={cat.thumbnail} alt={cat.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30] via-transparent to-transparent" />
                      <div className="absolute top-2 right-2 bg-blue-700/80 rounded px-1.5 py-0.5 text-[9px] text-white font-medium">{cat.count}</div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[11px] font-medium text-slate-100 truncate">{cat.name}</div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-400 group-hover:text-blue-300">
                        Browse <ChevronRight size={9} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Integration Status */}
            <section>
              <SectionHeader title="Integration Status" onViewAll={() => navigate('/integration')} />
              <div className="space-y-2.5 mt-3">
                {mockDataSources.map((source) => {
                  const st = SOURCE_STATUS[source.status];
                  const TYPE_LABEL: Record<string, string> = { platform: '平台', erp: 'ERP', mes: 'MES', wms: 'WMS', custom: '自定义' };
                  return (
                    <div
                      key={source.id}
                      onClick={() => navigate('/integration')}
                      className="bg-[#0b1d30] border border-[#142235] rounded-lg px-4 py-3 cursor-pointer hover:border-blue-500/40 transition-all group flex items-center gap-3"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-200 truncate">{source.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#1e3a55] text-slate-500 uppercase tracking-wider flex-shrink-0">
                            {TYPE_LABEL[source.type] ?? source.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                          {source.lastSync ? `最后同步: ${source.lastSync.split(' ')[1] ?? source.lastSync}` : '未同步'}
                        </div>
                      </div>
                      <span className={`text-[10px] flex-shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
                <button
                  onClick={() => navigate('/integration')}
                  className="w-full text-[10px] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 py-1.5 transition-colors"
                >
                  <RefreshCw size={10} /> Manage All Integrations
                </button>
              </div>
            </section>
          </div>

          {/* ── Recent Factory Projects ── */}
          <section>
            <SectionHeader title="Recent Factory Projects" onViewAll={() => navigate('/factories')} />
            <div className="grid grid-cols-3 gap-4 mt-3">
              {/* New Project Card */}
              <div
                onClick={() => setShowModal(true)}
                className="bg-[#0b1d30] border border-dashed border-[#1e3a55] rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/60 hover:bg-[#0e243a] transition-all group"
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-[#2a4a6a] group-hover:border-blue-500 flex items-center justify-center mb-3 transition-colors">
                  <Plus size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors">新建工厂项目</span>
                <span className="text-xs text-slate-600 mt-1 group-hover:text-slate-400 transition-colors">Create New Factory Project</span>
              </div>

              {mockFactoryProjects.filter((p) => p.status !== 'archived').slice(0, 2).map((proj) => {
                const sc = STATUS_CONFIG[proj.status];
                return (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/factory/${proj.id}`)}
                    className="bg-[#0b1d30] border border-[#142235] rounded-lg overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all group relative"
                  >
                    <div className="h-32 relative overflow-hidden">
                      {proj.thumbnail ? (
                        <img src={proj.thumbnail} alt={proj.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500" />
                      ) : (
                        <div className="w-full h-full bg-[#040d18] flex items-center justify-center">
                          <Layers3 size={32} className="text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30] via-[#0b1d30]/30 to-transparent" />
                      <div className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 font-medium ${sc.cls}`}>
                        {sc.icon} {sc.label}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-slate-100">{proj.name}</div>
                      {proj.description && <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{proj.description}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={9} /> {proj.updatedAt}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/factory/${proj.id}/versions`); }}
                            className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors"
                          >
                            Log
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/factory/${proj.id}/data-binding`); }}
                            className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors"
                          >
                            Data Binding
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Recent Facilities Model ── */}
          <section>
            <SectionHeader title="Recent Facilities Model" />
            <p className="text-[11px] text-slate-500 mt-1 mb-3">Recently edited 3D model templates — production lines and equipment assets</p>
            <div className="grid grid-cols-4 gap-4">
              {recentFacilities.map((f) => (
                <div key={f.id} className="bg-[#0b1d30] border border-[#142235] rounded-lg overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all group">
                  <div className="h-24 overflow-hidden relative">
                    <img src={f.thumbnail} alt={f.name} className="w-full h-full object-cover opacity-55 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30]/70 to-transparent" />
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-slate-200">{f.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>{f.type}</span>
                      <span className="flex items-center gap-1"><Clock size={8} /> {f.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={(id) => { setShowModal(false); navigate(`/factory/${id}`); }}
        />
      )}
    </div>
  );
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2.5">
        <div className="w-[3px] h-4 bg-blue-500 rounded-full" />
        {title}
      </h2>
      {onViewAll && (
        <button onClick={onViewAll} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition-colors">
          View All <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}

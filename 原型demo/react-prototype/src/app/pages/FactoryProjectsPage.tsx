import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Grid3X3, List, Search, MoreHorizontal, Edit2, Copy,
  Trash2, CheckCircle2, FileEdit, Send, Layers3, Clock,
  FolderArchive, Lock, X, Check, AlertTriangle,
} from 'lucide-react';
import { mockFactoryProjects, type FactoryProject, type ProjectStatus } from '../data/mockData';
import { NavSidebar, PageHeader } from '../components/NavSidebar';
import { NewProjectModal } from '../components/editor/NewProjectModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project extends FactoryProject {
  status: ProjectStatus;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:    { label: 'Draft',     cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40',     icon: <FileEdit size={10} /> },
  complete: { label: 'Complete',  cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: <CheckCircle2 size={10} /> },
  published:{ label: 'Published', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40',         icon: <Send size={10} /> },
  archived: { label: 'Archived',  cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40',      icon: <FolderArchive size={10} /> },
};

const STATUS_FILTERS: { key: 'all' | ProjectStatus; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'complete',  label: 'Complete' },
  { key: 'published', label: 'Published' },
  { key: 'archived',  label: 'Archived' },
];

// Seed data — starts from mockData, adds a couple extra for demo
const SEED_PROJECTS: Project[] = mockFactoryProjects.map((p) => ({ ...p }));

// ── Rename Modal ──────────────────────────────────────────────────────────────
function RenameModal({
  initialName,
  onConfirm,
  onClose,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[400px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <span className="text-sm font-semibold text-slate-100">Rename Factory Project</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-[11px] text-slate-400 mb-1.5">Project Name</label>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(value.trim()); if (e.key === 'Escape') onClose(); }}
            className="w-full bg-[#071526] border border-[#1e3a55] rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded hover:border-[#2a4a6a] transition-colors">Cancel</button>
          <button
            onClick={() => onConfirm(value.trim())}
            disabled={!value.trim()}
            className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[400px] shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#142235]">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-100">Delete Factory Project</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12px] text-slate-400">
            Are you sure you want to delete <span className="text-slate-100 font-medium">"{name}"</span>?
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">This action cannot be undone. The project and all its version data will be permanently deleted.</p>
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 border border-[#1e3a55] rounded hover:border-[#2a4a6a] transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function ContextMenu({
  project,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
  anchorRef,
}: {
  project: Project;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isArchived = project.status === 'archived';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-44 bg-[#0b1d30] border border-[#1e3a55] rounded-lg shadow-xl z-30 py-1 overflow-hidden"
    >
      {!isArchived && (
        <MenuItem icon={<Edit2 size={11} />} label="Rename" onClick={() => { onRename(); onClose(); }} />
      )}
      <MenuItem icon={<Copy size={11} />} label="Duplicate" onClick={() => { onDuplicate(); onClose(); }} />
      {!isArchived ? (
        <MenuItem icon={<FolderArchive size={11} />} label="Archive" onClick={() => { onArchive(); onClose(); }} />
      ) : (
        <MenuItem icon={<FolderArchive size={11} />} label="Unarchive" onClick={() => { onArchive(); onClose(); }} />
      )}
      <div className="my-1 border-t border-[#142235]" />
      <MenuItem icon={<Trash2 size={11} />} label="Delete" onClick={() => { onDelete(); onClose(); }} danger />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-[#0e243a]'
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ── Card View ─────────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  onOpen,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sc = STATUS_CONFIG[project.status];
  const isArchived = project.status === 'archived';

  return (
    <div className={`bg-[#0b1d30] border rounded-lg overflow-hidden relative transition-all group ${
      isArchived ? 'border-[#142235] opacity-60' : 'border-[#142235] hover:border-blue-500/50 cursor-pointer'
    }`}>
      {/* Thumbnail */}
      <div
        className="h-36 relative overflow-hidden"
        onClick={!isArchived ? onOpen : undefined}
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isArchived ? 'opacity-30' : 'opacity-60 group-hover:opacity-85 group-hover:scale-105'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-[#040d18] flex items-center justify-center">
            <Layers3 size={32} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d30] via-[#0b1d30]/20 to-transparent" />

        {/* Status badge */}
        <div className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 font-medium ${sc.cls}`}>
          {sc.icon} {sc.label}
        </div>

        {/* Archived lock overlay */}
        {isArchived && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock size={24} className="text-slate-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3" onClick={!isArchived ? onOpen : undefined}>
        <div className="flex items-baseline gap-1.5">
          <div className="text-sm font-medium text-slate-100 truncate">{project.name}</div>
          <span className="text-[10px] text-blue-400 font-mono flex-shrink-0">{project.projectVersion}</span>
        </div>
        {project.description && (
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{project.description}</div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[10px] text-slate-600 flex items-center gap-1">
            <Clock size={9} /> {project.updatedAt}
          </div>
          <div className="text-[10px] text-slate-600">Created {project.createdAt}</div>
        </div>
      </div>

      {/* More actions button */}
      <div className="absolute top-2 right-2">
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="w-6 h-6 rounded bg-[#0b1d30]/80 border border-[#1e3a55] flex items-center justify-center text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreHorizontal size={12} />
        </button>
        {menuOpen && (
          <ContextMenu
            project={project}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
            onClose={() => setMenuOpen(false)}
            anchorRef={btnRef}
          />
        )}
      </div>
    </div>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────
function ProjectRow({
  project,
  onOpen,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sc = STATUS_CONFIG[project.status];
  const isArchived = project.status === 'archived';

  return (
    <tr
      className={`border-b border-[#142235] transition-colors group ${
        isArchived ? 'opacity-60' : 'hover:bg-[#0b1d30] cursor-pointer'
      }`}
      onClick={!isArchived ? onOpen : undefined}
    >
      <td className="py-3 pl-5 pr-3">
        <div className="w-10 h-8 rounded overflow-hidden flex-shrink-0 bg-[#040d18] flex items-center justify-center">
          {project.thumbnail ? (
            <img src={project.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
          ) : (
            <Layers3 size={14} className="text-slate-700" />
          )}
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="text-[12px] font-medium text-slate-100 flex items-center gap-2">
          {project.name}
          <span className="text-[10px] text-blue-400 font-mono">{project.projectVersion}</span>
          {isArchived && <Lock size={10} className="text-slate-600" />}
        </div>
        {project.description && (
          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">{project.description}</div>
        )}
      </td>
      <td className="py-3 pr-4">
        <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 w-fit ${sc.cls}`}>
          {sc.icon} {sc.label}
        </span>
      </td>
      <td className="py-3 pr-4 text-[11px] text-slate-500">{project.createdAt}</td>
      <td className="py-3 pr-4 text-[11px] text-slate-500">{project.updatedAt}</td>
      <td className="py-3 pr-5">
        <div className="relative flex items-center justify-end">
          <button
            ref={btnRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:text-slate-200 hover:bg-[#142235] opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <ContextMenu
              project={project}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
              onClose={() => setMenuOpen(false)}
              anchorRef={btnRef}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FactoryProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [search, setSearch] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function handleDuplicate(project: Project) {
    const copy: Project = {
      ...project,
      id: `${project.id}-copy-${Date.now()}`,
      name: `${project.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setProjects((prev) => [copy, ...prev]);
  }

  function handleArchiveToggle(id: string) {
    setProjects((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: p.status === 'archived' ? 'draft' : 'archived' } : p)
    );
  }

  function handleRename(id: string, newName: string) {
    if (!newName) return;
    setProjects((prev) =>
      prev.map((p) => p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString().slice(0, 10) } : p)
    );
    setRenameId(null);
  }

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
  }

  const renameTarget = renameId ? projects.find((p) => p.id === renameId) : null;
  const deleteTarget = deleteId ? projects.find((p) => p.id === deleteId) : null;

  return (
    <div className="flex h-screen bg-[#07111e] text-slate-100 overflow-hidden select-none">
      <NavSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          crumbs={[{ label: 'Home', path: '/' }, { label: 'Factory Projects' }]}
          actions={
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              <Plus size={12} /> New Factory
            </button>
          }
        />

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[#142235] flex-shrink-0 bg-[#07111e]">
          {/* Status filters */}
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => {
              const count = f.key === 'all' ? projects.length : (counts[f.key] ?? 0);
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1 text-[11px] rounded-full border transition-colors ${
                    statusFilter === f.key
                      ? 'border-blue-500/60 bg-blue-600/15 text-blue-400'
                      : 'border-[#1e3a55] text-slate-500 hover:border-[#2a4a6a] hover:text-slate-300'
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-52 bg-[#0b1d30] border border-[#1e3a55] rounded pl-7 pr-3 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                <X size={10} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex bg-[#0b1d30] border border-[#1e3a55] rounded overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === 'card' ? 'bg-blue-600/30 text-blue-400' : 'text-slate-500 hover:text-slate-200'}`}
              title="Card view"
            >
              <Grid3X3 size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600/30 text-blue-400' : 'text-slate-500 hover:text-slate-200'}`}
              title="List view"
            >
              <List size={13} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Layers3 size={32} className="text-slate-700 mb-3" />
              <div className="text-[13px] text-slate-500">
                {search ? `No projects matching "${search}"` : 'No factory projects yet'}
              </div>
              {!search && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                >
                  <Plus size={12} /> New Factory
                </button>
              )}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-4 gap-4">
              {/* New project card */}
              <div
                onClick={() => setShowNewModal(true)}
                className="bg-[#0b1d30] border border-dashed border-[#1e3a55] rounded-lg h-[220px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/60 hover:bg-[#0e243a] transition-all group"
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-[#2a4a6a] group-hover:border-blue-500 flex items-center justify-center mb-3 transition-colors">
                  <Plus size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors">New Factory</span>
                <span className="text-xs text-slate-600 mt-1 group-hover:text-slate-400 transition-colors">Create New Factory Project</span>
              </div>

              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => navigate(`/factory/${project.id}`)}
                  onRename={() => setRenameId(project.id)}
                  onDuplicate={() => handleDuplicate(project)}
                  onArchive={() => handleArchiveToggle(project.id)}
                  onDelete={() => setDeleteId(project.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#0b1d30] border border-[#142235] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#142235] bg-[#071526]">
                    <th className="w-14 py-3 pl-5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider"></th>
                    <th className="py-3 pr-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 pr-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 pr-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="py-3 pr-4 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Last Modified</th>
                    <th className="py-3 pr-5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      onOpen={() => navigate(`/factory/${project.id}`)}
                      onRename={() => setRenameId(project.id)}
                      onDuplicate={() => handleDuplicate(project)}
                      onArchive={() => handleArchiveToggle(project.id)}
                      onDelete={() => setDeleteId(project.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={(id) => { setShowNewModal(false); navigate(`/factory/${id}`); }}
          existingProjects={projects}
        />
      )}

      {renameTarget && (
        <RenameModal
          initialName={renameTarget.name}
          onConfirm={(name) => handleRename(renameTarget.id, name)}
          onClose={() => setRenameId(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

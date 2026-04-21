import React, { useState, useEffect } from 'react';
import { X, Layers3 } from 'lucide-react';
import { factoryInfos, type FactoryProject } from '../../data/mockData';

interface Props {
  onClose: () => void;
  onCreate: (projectId: string) => void;
  existingProjects?: FactoryProject[];
}

function computeNextVersion(selectedFactoryId: string, existingProjects: FactoryProject[]): string {
  if (!selectedFactoryId) return '_V1';
  const count = existingProjects.filter(
    (p) => p.id === selectedFactoryId || p.id.startsWith(selectedFactoryId + '-') || p.id.startsWith(selectedFactoryId + '_')
  ).length;
  return `_V${count + 1}`;
}

export function NewProjectModal({ onClose, onCreate, existingProjects = [] }: Props) {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [name, setName] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [address, setAddress] = useState('');
  const [siteLength, setSiteLength] = useState('');
  const [siteWidth, setSiteWidth] = useState('');
  const [description, setDescription] = useState('');

  const generatedVersion = computeNextVersion(selectedFactoryId, existingProjects);

  // Auto-fill form fields when a factory is selected from dropdown
  useEffect(() => {
    if (selectedFactoryId) {
      const selectedFactory = factoryInfos.find(factory => factory.id === selectedFactoryId);
      if (selectedFactory) {
        setName(selectedFactory.name || '');
        setFactoryId(selectedFactory.factoryId || '');
        setAddress(selectedFactory.address || '');
        setDescription(selectedFactory.description || '');
        setSiteLength(selectedFactory.siteLength?.toString() || '');
        setSiteWidth(selectedFactory.siteWidth?.toString() || '');
      }
    } else {
      // Clear fields when "Create New Factory" is selected
      setName('');
      setFactoryId('');
      setAddress('');
      setDescription('');
      setSiteLength('');
      setSiteWidth('');
    }
  }, [selectedFactoryId, factoryInfos]);

  function handleCreate() {
    if (!name.trim()) return;
    const id = `factory-${Date.now()}`;
    onCreate(id);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0b1d30] border border-[#1e3a55] rounded-xl w-[520px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142235]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Layers3 size={13} />
            </div>
            <span className="text-sm font-semibold text-slate-100">Create New Factory Project</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <Field label="Select Existing Factory (Optional)">
            <select
              value={selectedFactoryId}
              onChange={(e) => setSelectedFactoryId(e.target.value)}
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {factoryInfos.map(factory => (
                <option key={factory.id} value={factory.id}>
                  {factory.id === '' ? '-- Create New Factory --' : factory.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="text-[10px] text-slate-500 mb-2">
            {selectedFactoryId ?
              `Selected: ${factoryInfos.find(f => f.id === selectedFactoryId)?.name || ''}. Fields will be auto-filled.` :
              'Choose a factory to auto-fill fields, or leave as "Create New Factory" to enter manually.'
            }
          </div>

          <Field label="Factory Name *" required>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // When user manually types, reset dropdown selection
                if (e.target.value !== factoryInfos.find(f => f.id === selectedFactoryId)?.name) {
                  setSelectedFactoryId('');
                }
              }}
              placeholder="e.g. Houston P9 AI Factory"
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </Field>

          <Field label="Factory ID">
            <input
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              placeholder="e.g. USAHSTP9AIFactory001"
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </Field>

          <Field label="Project Version">
            <div className="w-full bg-[#040d18] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-blue-400 font-mono flex items-center gap-2 select-none">
              <span className="text-slate-600 text-[10px]">AUTO</span>
              <span>{generatedVersion}</span>
              <span className="ml-auto text-[10px] text-slate-600">
                {selectedFactoryId ? 'incremented from existing projects' : 'new factory starts at V1'}
              </span>
            </div>
          </Field>

          <Field label="Factory Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 8303 Fallbrook Dr., Houston"
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Site Length (Metre)">
              <input
                type="number"
                value={siteLength}
                onChange={(e) => setSiteLength(e.target.value)}
                placeholder="2000"
                className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </Field>
            <Field label="Site Width (Metre)">
              <input
                type="number"
                value={siteWidth}
                onChange={(e) => setSiteWidth(e.target.value)}
                placeholder="2000"
                className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this factory..."
              rows={2}
              className="w-full bg-[#071526] border border-[#1e3a55] rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </Field>

          <div className="bg-[#071526] border border-[#142235] rounded-md p-3 text-[11px] text-slate-400">
            <span className="text-blue-400 font-medium">Tip:</span> After creating the project, you can drag & drop assets from the 3D Library into the viewport to build your factory layout, then bind business data to each asset.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-[#1e3a55] rounded-md hover:border-[#2a4a6a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

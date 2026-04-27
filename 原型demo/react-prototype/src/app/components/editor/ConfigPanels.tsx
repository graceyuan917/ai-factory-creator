import React from 'react';
import { Plus, Edit2, WifiOff, Link2 } from 'lucide-react';
import type { FactoryNode } from '../../data/mockData';
import type { BindingRecord } from '../../types/factoryEditor';
import { mockDataPoints } from '../../data/mockData';
import { ConfigSection, ConfigRow, IoTField, CollapsibleSection } from './UiComponents';
import { DataBindingSection } from './BindingComponents';

export function FactoryConfigPanel({
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
        <ConfigRow label="USD File" value="Houston P9 AI Factory.USD" editing={editing} />
        <ConfigRow label="Site Area" value="4000 m²" editing={editing} />
        <ConfigRow label="Address" value="8303 Fallbrook Dr., Houston" editing={editing} />
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

export function ProcessConfigPanel({ node, editing }: { node: FactoryNode; editing: boolean }) {
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

export function LineConfigPanel({
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

export function LedgerPanel({ node, editing, platformConnected, bindingRecord, onBind, onUnbind }: {
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

export function IoTPanel({ node, editing, bindingRecord, locked }: {
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

export function EventsPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
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

export function MonitoringPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
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

export function MetricsPanel({ editing, locked }: { editing: boolean; locked: boolean }) {
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

import React, { useState, useRef } from 'react';
import {
  HardDrive, FolderOpen, Link2, X, LinkIcon, Unlink, FileBox, AlertCircle,
} from 'lucide-react';
import type { USDFile, USDFileFormat } from '../../types/factoryEditor';

const FORMAT_COLOR: Record<USDFileFormat, string> = {
  usd:  'bg-blue-600/20 text-blue-400 border-blue-600/40',
  usda: 'bg-violet-600/20 text-violet-400 border-violet-600/40',
  usdc: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/40',
  usdz: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  folder: 'bg-amber-600/20 text-amber-400 border-amber-600/40',
};

export function USDUploadModal({
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
                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
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

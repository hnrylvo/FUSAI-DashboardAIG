import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { UploadFileResult } from '../../types/api';
import { cLabel } from '../../lib/formatters';

export const UploadModal: React.FC = () => {
  const { isUploadModalOpen, setUploadModalOpen, setMeta, setCierre } = useDashboardStore();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [results, setResults] = useState<UploadFileResult[] | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error('Selecciona al menos un archivo Excel.');
      return api.upload.uploadFiles(files, overrides);
    },
    onSuccess: async (data) => {
      setResults(data.results);
      // If at least one succeeded, refresh metadata
      const anyOk = data.results.some((r) => r.ok);
      if (anyOk) {
        const meta = await api.portfolio.getMeta();
        setMeta(meta);
        // Switch to the latest closure from the uploaded ones if available
        const latestSuccess = data.results.filter((r) => r.ok && r.cierre).pop();
        if (latestSuccess?.cierre) {
          setCierre(latestSuccess.cierre);
        }
        queryClient.invalidateQueries();
      }
    },
    onError: (err: Error) => {
      setGeneralError(err.message || 'Error al procesar archivos.');
    },
  });

  if (!isUploadModalOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResults(null);
      setGeneralError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
      setResults(null);
      setGeneralError(null);
    }
  };

  const handleClose = () => {
    setUploadModalOpen(false);
    setFiles([]);
    setOverrides({});
    setResults(null);
    setGeneralError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F48437]/10 text-[#F48437] rounded-lg">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Actualizar cierre de cartera</h3>
              <p className="text-[11px] text-slate-500">
                Carga reportes en formato Excel (.xls o .xlsx)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-[#014F84] rounded-xl p-6 text-center bg-slate-50/50 hover:bg-[#014F84]/5 transition-colors cursor-pointer group"
            onClick={() => document.getElementById('modal-file-input')?.click()}
          >
            <input
              id="modal-file-input"
              type="file"
              accept=".xls,.xlsx,.xlsm"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <FileSpreadsheet
              size={36}
              className="mx-auto text-slate-400 group-hover:text-[#014F84] transition-colors mb-2"
            />
            <p className="text-xs font-semibold text-slate-700">
              Arrastra tus archivos aquí o{' '}
              <span className="text-[#014F84] underline">selecciona desde tu equipo</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Soporta múltiples archivos simultáneos (.xls, .xlsx)
            </p>
          </div>

          {/* Selected files list */}
          {files.length > 0 && !results && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Archivos seleccionados ({files.length})
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileSpreadsheet size={15} className="text-[#014F84] shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.name}</span>
                        <span className="text-slate-400 text-[10px]">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(files.filter((f) => f.name !== file.name));
                        }}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Date override helper if filename doesn't have DD-MM-YYYY */}
                    {!file.name.match(/\d{2}-\d{2}-\d{4}/) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-md">
                        <Calendar size={13} className="text-[#F48437]" />
                        <span>Fecha de cierre:</span>
                        <input
                          type="date"
                          value={overrides[file.name] || ''}
                          onChange={(e) =>
                            setOverrides({ ...overrides, [file.name]: e.target.value })
                          }
                          className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error notice */}
          {generalError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Results notice after upload */}
          {results && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Resultado del procesamiento</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {results.map((res, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      res.ok ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'
                    }`}
                  >
                    {res.ok ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{res.file}</div>
                      {res.ok ? (
                        <div className="text-emerald-700 text-[11px] mt-0.5">
                          ✓ Cierre {cLabel(res.cierre || '')} ({res.cierre}) procesado con éxito ·{' '}
                          {res.rows} registros.
                          {res.replaced && (
                            <span className="font-semibold text-amber-700 ml-1">
                              (Cierre existente actualizado)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-red-700 text-[11px] mt-0.5">
                          ✗ {res.message || 'Error al procesar el archivo.'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          {results ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-[#014F84] hover:bg-[#023e68] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={files.length === 0 || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F48437] hover:bg-[#e0722a] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Cargar {files.length > 0 ? `(${files.length})` : ''}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

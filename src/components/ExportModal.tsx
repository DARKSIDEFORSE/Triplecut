import React, { useState } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  StopCircle,
  HardDriveDownload,
  Film,
  Cpu,
} from 'lucide-react';
import { AspectRatio, ResolutionPreset, ExportProgress, getExportDimensions } from '../export/videoExporter';
import { TimelineModel } from '../timeline/types';
import { formatTime } from '../timeline/timeline';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineModel;
  aspectRatio: AspectRatio;
  onStartExport: (resolution: ResolutionPreset, fps: 30 | 60) => void;
  onCancelExport: () => void;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportedBlob: Blob | null;
  onSaveFile: (blob: Blob) => void;
  errorMessage: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  timeline,
  aspectRatio,
  onStartExport,
  onCancelExport,
  isExporting,
  exportProgress,
  exportedBlob,
  onSaveFile,
  errorMessage,
}) => {
  const [resolution, setResolution] = useState<ResolutionPreset>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);

  if (!isOpen) return null;

  const { width, height } = getExportDimensions(aspectRatio, resolution);
  const totalFrames = Math.max(1, Math.ceil(timeline.totalDuration * fps));
  const hasWebCodecs = typeof window.VideoEncoder !== 'undefined';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--c-black)]/75 backdrop-blur-xl animate-fade-in select-none">
      {/* Liquid Glass Modal Card (Monochrome Graphite & Steel) */}
      <div className="liquid-glass w-full max-w-lg p-6 flex flex-col gap-5 border border-[var(--c-steel)]/40 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-steel)]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--c-graphite)]/60 border border-[var(--c-steel)] flex items-center justify-center text-[var(--c-silver)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#F2F2F4]">Экспорт готового видео</h2>
              <p className="text-xs text-[var(--c-silver)]">
                WebCodecs H.264 + AAC MP4 Muxer
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно экспорта"
              className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Monochrome Error Alert (distinguished by icon, bold text, pulsing white outline) */}
        {errorMessage && (
          <div className="rounded-xl p-3 bg-[var(--c-graphite)]/30 mono-alert flex items-start gap-2.5 text-xs text-[#F2F2F4]">
            <AlertCircle className="w-4 h-4 text-[var(--c-silver)] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold tracking-tight">Ошибка экспорта</p>
              <p className="text-[11px] text-[var(--c-silver)] mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Hardware Status badge in neutral steel */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--c-black)]/60 border border-[var(--c-steel)]/30 text-xs">
          <span className="text-[var(--c-silver)] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[var(--c-steel)]" />
            Аппаратное ускорение:
          </span>
          <span className="font-medium text-[#F2F2F4] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--c-silver)] shadow-sm" />
            {hasWebCodecs ? 'WebCodecs VideoEncoder (MP4)' : 'MediaRecorder Fallback'}
          </span>
        </div>

        {/* Options (Disabled while exporting or after complete) */}
        {!isExporting && !exportedBlob && (
          <div className="flex flex-col gap-4">
            {/* Resolution Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--c-silver)]">
                Разрешение кадра
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('1080p')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    resolution === '1080p'
                      ? 'bg-[var(--c-steel)]/30 border-[var(--c-silver)] text-[#F2F2F4] shadow-md'
                      : 'bg-[var(--c-graphite)]/20 border-[var(--c-steel)]/30 text-[var(--c-silver)] hover:bg-[var(--c-graphite)]/40'
                  }`}
                >
                  <span className="font-semibold text-xs text-[#F2F2F4]">1080p Full HD</span>
                  <span className="text-[10px] text-[var(--c-steel)] font-mono">
                    {aspectRatio === '9:16' ? '1080 × 1920' : aspectRatio === '16:9' ? '1920 × 1080' : '1080 × 1080'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution('720p')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    resolution === '720p'
                      ? 'bg-[var(--c-steel)]/30 border-[var(--c-silver)] text-[#F2F2F4] shadow-md'
                      : 'bg-[var(--c-graphite)]/20 border-[var(--c-steel)]/30 text-[var(--c-silver)] hover:bg-[var(--c-graphite)]/40'
                  }`}
                >
                  <span className="font-semibold text-xs text-[#F2F2F4]">720p HD (Быстрый рендер)</span>
                  <span className="text-[10px] text-[var(--c-steel)] font-mono">
                    {aspectRatio === '9:16' ? '720 × 1280' : aspectRatio === '16:9' ? '1280 × 720' : '720 × 720'}
                  </span>
                </button>
              </div>
            </div>

            {/* Framerate FPS Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--c-silver)]">
                Частота кадров (FPS)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFps(30)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    fps === 30
                      ? 'bg-[var(--c-steel)]/30 border-[var(--c-silver)] text-[#F2F2F4] shadow-md font-semibold text-xs'
                      : 'bg-[var(--c-graphite)]/20 border-[var(--c-steel)]/30 text-[var(--c-silver)] text-xs hover:bg-[var(--c-graphite)]/40'
                  }`}
                >
                  30 FPS (Стандарт)
                </button>

                <button
                  type="button"
                  onClick={() => setFps(60)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    fps === 60
                      ? 'bg-[var(--c-steel)]/30 border-[var(--c-silver)] text-[#F2F2F4] shadow-md font-semibold text-xs'
                      : 'bg-[var(--c-graphite)]/20 border-[var(--c-steel)]/30 text-[var(--c-silver)] text-xs hover:bg-[var(--c-graphite)]/40'
                  }`}
                >
                  60 FPS (Плавное видео)
                </button>
              </div>
            </div>

            {/* Summary details */}
            <div className="rounded-xl p-3 bg-[var(--c-black)]/40 border border-[var(--c-steel)]/30 flex flex-col gap-1.5 text-xs text-[var(--c-silver)]">
              <div className="flex justify-between">
                <span>Итоговая длительность:</span>
                <span className="font-mono text-[#F2F2F4] font-medium">
                  {formatTime(timeline.totalDuration, true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Всего кадров для рендера:</span>
                <span className="font-mono text-[#F2F2F4] font-medium">{totalFrames}</span>
              </div>
              <div className="flex justify-between">
                <span>Формат кадра:</span>
                <span className="text-[#F2F2F4] font-medium">{aspectRatio} ({width} × {height})</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar Display while Exporting (Track --c-graphite, Fill --c-silver) */}
        {isExporting && exportProgress && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#F2F2F4]">{exportProgress.phase}</span>
              <span className="font-mono text-[var(--c-silver)] font-bold text-sm">
                {exportProgress.percent}%
              </span>
            </div>

            {/* Progress Bar Track: --c-graphite, Filled: --c-silver */}
            <div className="relative w-full h-3 rounded-full bg-[var(--c-graphite)] overflow-hidden border border-[var(--c-steel)]/40 p-[1px]">
              <div
                className="h-full rounded-full bg-[var(--c-silver)] transition-all duration-200 relative overflow-hidden"
                style={{ width: `${exportProgress.percent}%` }}
              >
                <div className="absolute inset-0 bg-[#F2F2F4]/30 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--c-silver)] font-mono">
              <span>
                Кадр {exportProgress.currentFrame} из {exportProgress.totalFrames}
              </span>
              <span>
                Осталось: ~{exportProgress.etaSeconds} сек
              </span>
            </div>
          </div>
        )}

        {/* Success State */}
        {exportedBlob && !isExporting && (
          <div className="rounded-2xl p-4 bg-[var(--c-slate)]/40 border border-[var(--c-steel)] flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--c-steel)]/30 text-[var(--c-silver)] flex items-center justify-center border border-[var(--c-steel)]/50">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F2F2F4] text-base">Видео успешно смонтировано!</h3>
              <p className="text-xs text-[var(--c-silver)] mt-0.5">
                Размер файла: {(exportedBlob.size / (1024 * 1024)).toFixed(1)} МБ • Формат MP4
              </p>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--c-steel)]/25">
          {isExporting ? (
            <button
              type="button"
              onClick={onCancelExport}
              className="btn-glass px-4 py-2 text-xs font-semibold text-[#F2F2F4] border-[var(--c-steel)] flex items-center gap-1.5 cursor-pointer hover:border-[#F2F2F4]"
            >
              <StopCircle className="w-4 h-4" />
              <span>Остановить экспорт</span>
            </button>
          ) : exportedBlob ? (
            <div className="flex items-center gap-2.5 w-full justify-between">
              <button
                type="button"
                onClick={onClose}
                className="btn-glass px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => onSaveFile(exportedBlob)}
                className="btn-accent px-5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Сохранить на диск (MP4)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="btn-glass px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => onStartExport(resolution, fps)}
                className="btn-accent px-6 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Начать экспорт MP4</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

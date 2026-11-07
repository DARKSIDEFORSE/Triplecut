import React from 'react';
import { VideoSlot } from './VideoSlot';
import { Sliders, Clock, Timer, Maximize2, SplitSquareVertical } from 'lucide-react';

interface SidebarProps {
  // Main
  mainFile: File | null;
  mainUrl: string | null;
  mainDuration: number;
  mainVolume: number;
  onMainFileSelect: (f: File) => void;
  onMainClear: () => void;
  onMainVolumeChange: (v: number) => void;

  // Filler
  fillerFile: File | null;
  fillerUrl: string | null;
  fillerDuration: number;
  fillerVolume: number;
  onFillerFileSelect: (f: File) => void;
  onFillerClear: () => void;
  onFillerVolumeChange: (v: number) => void;

  // Popup
  popupFile: File | null;
  popupUrl: string | null;
  popupDuration: number;
  popupVolume: number;
  onPopupFileSelect: (f: File) => void;
  onPopupClear: () => void;
  onPopupVolumeChange: (v: number) => void;

  // Settings
  popupInterval: number;
  onPopupIntervalChange: (val: number) => void;
  firstDelay: number;
  onFirstDelayChange: (val: number) => void;
  popupScalePercent: number;
  onPopupScalePercentChange: (val: number) => void;
  splitRatioPercent: number; // e.g. 50 = 50% Main / 50% Filler
  onSplitRatioPercentChange: (val: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mainFile,
  mainUrl,
  mainDuration,
  mainVolume,
  onMainFileSelect,
  onMainClear,
  onMainVolumeChange,

  fillerFile,
  fillerUrl,
  fillerDuration,
  fillerVolume,
  onFillerFileSelect,
  onFillerClear,
  onFillerVolumeChange,

  popupFile,
  popupUrl,
  popupDuration,
  popupVolume,
  onPopupFileSelect,
  onPopupClear,
  onPopupVolumeChange,

  popupInterval,
  onPopupIntervalChange,
  firstDelay,
  onFirstDelayChange,
  popupScalePercent,
  onPopupScalePercentChange,
  splitRatioPercent,
  onSplitRatioPercentChange,
}) => {
  return (
    <aside className="w-[360px] flex flex-col gap-4 overflow-y-auto pr-1 select-none">
      {/* Three Video Slots inside Slate-Tinted Glass */}
      <div className="flex flex-col gap-3">
        <VideoSlot
          role="main"
          title="1. Main (Основное)"
          badge="Хронометраж"
          description="Определяет длительность ролика. Размещается сверху."
          file={mainFile}
          videoUrl={mainUrl}
          duration={mainDuration}
          volume={mainVolume}
          onFileSelect={onMainFileSelect}
          onClear={onMainClear}
          onVolumeChange={onMainVolumeChange}
        />

        <VideoSlot
          role="filler"
          title="2. Filler (Динамичный фон)"
          badge="Бесшовный луп"
          description="Фоновое видео снизу. Зацикливается без шва (громкость 0% по умолчанию)."
          file={fillerFile}
          videoUrl={fillerUrl}
          duration={fillerDuration}
          volume={fillerVolume}
          onFileSelect={onFillerFileSelect}
          onClear={onFillerClear}
          onVolumeChange={onFillerVolumeChange}
        />

        <VideoSlot
          role="popup"
          title="3. Popup (Всплывающее)"
          badge="Пауза контента"
          description="Появляется по центру. На время показа Main и Filler замирают."
          file={popupFile}
          videoUrl={popupUrl}
          duration={popupDuration}
          volume={popupVolume}
          onFileSelect={onPopupFileSelect}
          onClear={onPopupClear}
          onVolumeChange={onPopupVolumeChange}
        />
      </div>

      {/* Settings Panel with --c-slate glass tint */}
      <div className="liquid-glass-slate p-4 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 border-b border-[var(--c-steel)]/30 pb-2">
          <Sliders className="w-4 h-4 text-[var(--c-silver)]" />
          <h2 className="font-semibold text-xs tracking-tight uppercase text-[#F2F2F4]">
            Параметры монтажа
          </h2>
        </div>

        {/* 1. Popup Interval */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <Clock className="w-3.5 h-3.5 text-[var(--c-steel)]" />
              Интервал Popup
            </span>
            <span className="font-mono font-medium text-[#F2F2F4]">
              каждые {popupInterval} сек
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="25"
            step="1"
            value={popupInterval}
            onChange={(e) => onPopupIntervalChange(parseInt(e.target.value, 10))}
            aria-label="Интервал появления Popup в секундах"
          />
          <p className="text-[10px] text-[var(--c-steel)]">
            Считается в активном времени Main. Следующий отсчет — после окончания Popup.
          </p>
        </div>

        {/* 2. First Popup Delay */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <Timer className="w-3.5 h-3.5 text-[var(--c-steel)]" />
              Задержка до 1-го Popup
            </span>
            <span className="font-mono font-medium text-[#F2F2F4]">
              через {firstDelay} сек
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={firstDelay}
            onChange={(e) => onFirstDelayChange(parseInt(e.target.value, 10))}
            aria-label="Задержка до первого Popup в секундах"
          />
        </div>

        {/* 3. Popup Scale */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <Maximize2 className="w-3.5 h-3.5 text-[var(--c-steel)]" />
              Размер Popup окна
            </span>
            <span className="font-mono font-medium text-[#F2F2F4]">
              {popupScalePercent}% ширины
            </span>
          </div>
          <input
            type="range"
            min="35"
            max="90"
            step="5"
            value={popupScalePercent}
            onChange={(e) => onPopupScalePercentChange(parseInt(e.target.value, 10))}
            aria-label="Размер Popup в процентах от ширины кадра"
          />
        </div>

        {/* 4. Split Ratio */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <SplitSquareVertical className="w-3.5 h-3.5 text-[var(--c-steel)]" />
              Разделение высоты (Main / Filler)
            </span>
            <span className="font-mono font-medium text-[#F2F2F4]">
              {splitRatioPercent} / {100 - splitRatioPercent}
            </span>
          </div>
          <input
            type="range"
            min="25"
            max="75"
            step="5"
            value={splitRatioPercent}
            onChange={(e) => onSplitRatioPercentChange(parseInt(e.target.value, 10))}
            aria-label="Соотношение высоты Main и Filler"
          />
          <div className="flex justify-between text-[10px] text-[var(--c-steel)] px-0.5">
            <span>Main сверху: {splitRatioPercent}%</span>
            <span>Filler снизу: {100 - splitRatioPercent}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

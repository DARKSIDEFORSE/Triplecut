import React from 'react';
import { AspectRatio } from '../export/videoExporter';
import { Clapperboard, Sparkles, Sun, Moon, Laptop, Download } from 'lucide-react';

interface HeaderProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspect: AspectRatio) => void;
  theme: 'system' | 'dark' | 'light';
  onThemeChange: (theme: 'system' | 'dark' | 'light') => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
  onOpenExport: () => void;
  hasMainVideo: boolean;
  totalDuration: number;
}

export const Header: React.FC<HeaderProps> = ({
  aspectRatio,
  onAspectRatioChange,
  theme,
  onThemeChange,
  onLoadDemo,
  isDemoLoading,
  onOpenExport,
  hasMainVideo,
}) => {
  return (
    <header className="liquid-glass px-5 py-3 flex items-center justify-between gap-4 select-none">
      {/* Brand & Title (Monochrome Graphite & Steel) */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--c-graphite)] p-[1px] border border-[var(--c-steel)] shadow-lg shadow-black/40">
          <div className="w-full h-full bg-[var(--c-black)] rounded-[14px] flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-[var(--c-silver)]" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base tracking-tight text-[#F2F2F4]">TripleCut</h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--c-graphite)]/50 text-[var(--c-silver)] border border-[var(--c-steel)]">
              Studio
            </span>
          </div>
          <p className="text-xs text-[var(--c-silver)] -mt-0.5">
            Монтаж 3-х видео в MP4 • Монохромная студия
          </p>
        </div>
      </div>

      {/* Aspect Ratio Segmented Control: Drop of --c-silver with dark text */}
      <div className="flex items-center bg-[var(--c-black)]/60 p-1 rounded-2xl border border-[var(--c-steel)]/40 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onAspectRatioChange('9:16')}
          aria-label="Формат 9:16"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
            aspectRatio === '9:16'
              ? 'bg-[var(--c-silver)] text-[var(--c-black)] font-semibold shadow-md'
              : 'text-[var(--c-silver)] hover:text-[#F2F2F4]'
          }`}
        >
          <div className="w-2.5 h-4 border border-current rounded-[2px]" />
          <span>9:16 Shorts/Reels</span>
        </button>

        <button
          type="button"
          onClick={() => onAspectRatioChange('16:9')}
          aria-label="Формат 16:9"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
            aspectRatio === '16:9'
              ? 'bg-[var(--c-silver)] text-[var(--c-black)] font-semibold shadow-md'
              : 'text-[var(--c-silver)] hover:text-[#F2F2F4]'
          }`}
        >
          <div className="w-4 h-2.5 border border-current rounded-[2px]" />
          <span>16:9 Горизонтальный</span>
        </button>

        <button
          type="button"
          onClick={() => onAspectRatioChange('1:1')}
          aria-label="Формат 1:1"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
            aspectRatio === '1:1'
              ? 'bg-[var(--c-silver)] text-[var(--c-black)] font-semibold shadow-md'
              : 'text-[var(--c-silver)] hover:text-[#F2F2F4]'
          }`}
        >
          <div className="w-3 h-3 border border-current rounded-[2px]" />
          <span>1:1 Квадрат</span>
        </button>
      </div>

      {/* Action Buttons: Demo, Theme, Export */}
      <div className="flex items-center gap-2.5">
        {/* Load Demo Clips */}
        <button
          type="button"
          onClick={onLoadDemo}
          disabled={isDemoLoading}
          aria-label="Загрузить демо-материалы"
          className="btn-glass px-3.5 py-2 text-xs font-medium flex items-center gap-2 group cursor-pointer"
          title="Сгенерировать тестовые видео Main, Filler и Popup для проверки"
        >
          <Sparkles className={`w-3.5 h-3.5 text-[var(--c-silver)] ${isDemoLoading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
          <span>{isDemoLoading ? 'Создание демо...' : 'Загрузить демо'}</span>
        </button>

        {/* Theme Switcher */}
        <div className="flex items-center bg-[var(--c-black)]/60 p-1 rounded-full border border-[var(--c-steel)]/40">
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            aria-label="Тёмная тема"
            className={`p-1.5 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-[var(--c-silver)] text-[var(--c-black)]' : 'text-[var(--c-steel)] hover:text-[#F2F2F4]'
            }`}
            title="Тёмная тема"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            aria-label="Светлая тема"
            className={`p-1.5 rounded-full transition-colors ${
              theme === 'light' ? 'bg-[var(--c-silver)] text-[var(--c-black)]' : 'text-[var(--c-steel)] hover:text-[#F2F2F4]'
            }`}
            title="Светлая тема"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('system')}
            aria-label="Системная тема"
            className={`p-1.5 rounded-full transition-colors ${
              theme === 'system' ? 'bg-[var(--c-silver)] text-[var(--c-black)]' : 'text-[var(--c-steel)] hover:text-[#F2F2F4]'
            }`}
            title="Системная тема"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Export CTA Button: --c-silver fill with --c-black text */}
        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasMainVideo}
          aria-label="Открыть окно экспорта"
          className={`btn-accent px-5 py-2 text-xs font-semibold flex items-center gap-2 ${
            !hasMainVideo ? 'opacity-35 cursor-not-allowed filter-none' : ''
          }`}
          title={hasMainVideo ? 'Экспортировать в MP4' : 'Сначала добавьте Main видео'}
        >
          <Download className="w-4 h-4" />
          <span>Экспорт MP4</span>
        </button>
      </div>
    </header>
  );
};

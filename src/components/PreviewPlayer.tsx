import React, { useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, StepBack, StepForward, Layers } from 'lucide-react';
import { AspectRatio } from '../export/videoExporter';
import { TimelineModel, PlayheadState } from '../timeline/types';
import { formatTime } from '../timeline/timeline';

interface PreviewPlayerProps {
  aspectRatio: AspectRatio;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  playheadState: PlayheadState;
  timeline: TimelineModel;
  isMuted: boolean;
  onToggleMute: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  hasMainVideo: boolean;
  onLoadDemo: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  aspectRatio,
  canvasRef,
  isPlaying,
  onTogglePlay,
  currentTime,
  totalDuration,
  onSeek,
  playheadState,
  isMuted,
  onToggleMute,
  isLooping,
  onToggleLoop,
  hasMainVideo,
  onLoadDemo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Aspect ratio styling
  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[calc(100vh-250px)]'
      : aspectRatio === '16:9'
      ? 'aspect-[16/9] max-w-full max-h-[calc(100vh-250px)]'
      : 'aspect-square max-h-[calc(100vh-250px)]';

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-center relative min-h-0 min-w-0"
    >
      {/* Video Viewport Container */}
      <div className="relative flex items-center justify-center w-full h-full p-2">
        <div
          className={`relative rounded-3xl overflow-hidden shadow-2xl border border-[var(--c-steel)]/40 bg-[var(--c-black)] flex items-center justify-center ${aspectClass} transition-all duration-300 ${
            playheadState.isPopupActive ? 'mono-alert' : ''
          }`}
          style={{
            boxShadow: playheadState.isPopupActive
              ? '0 0 35px rgba(152, 151, 156, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.8)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Real-time Render Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
          />

          {/* Empty State Overlay if no main video */}
          {!hasMainVideo && (
            <div className="absolute inset-0 bg-[var(--c-black)]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-[var(--c-graphite)]/50 border border-[var(--c-steel)]/60 flex items-center justify-center text-[var(--c-silver)]">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#F2F2F4]">Готов к монтажу</h3>
                <p className="text-xs text-[var(--c-silver)] max-w-xs mt-1">
                  Загрузите Main видео слева или нажмите «Загрузить демо» для быстрой проверки.
                </p>
              </div>
              <button
                type="button"
                onClick={onLoadDemo}
                className="btn-accent px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Загрузить демо-материалы
              </button>
            </div>
          )}

          {/* Active Status Badge in Top-Left (Monochrome Steel / Slate) */}
          {hasMainVideo && (
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border transition-all duration-300 flex items-center gap-1.5 ${
                  playheadState.isPopupActive
                    ? 'bg-[var(--c-steel)]/80 border-[#F2F2F4] text-[#F2F2F4] shadow-lg shadow-black/60 mono-alert'
                    : 'bg-[var(--c-black)]/70 border-[var(--c-steel)]/40 text-[var(--c-silver)]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    playheadState.isPopupActive ? 'bg-[#F2F2F4] animate-ping' : 'bg-[var(--c-silver)]'
                  }`}
                />
                {playheadState.isPopupActive ? 'Пауза: POPUP активен' : 'Воспроизведение: MAIN + FILLER'}
              </span>
            </div>
          )}

          {/* Quick Playback Center Click Indicator */}
          {!isPlaying && hasMainVideo && (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label="Запустить воспроизведение"
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[var(--c-graphite)]/70 hover:bg-[var(--c-steel)]/70 backdrop-blur-xl border border-[var(--c-silver)]/40 text-[#F2F2F4] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl cursor-pointer"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Glass Player HUD Bar: Monochromatic Liquid Glass */}
      <div className="liquid-glass px-5 py-2.5 mt-2 flex items-center justify-between gap-6 max-w-2xl w-full">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            aria-label="Назад на 1 секунду"
            className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            title="Назад на 1 сек (←)"
          >
            <StepBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            className="w-9 h-9 rounded-full bg-[var(--c-silver)] text-[var(--c-black)] flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-[#F2F2F4]/50 shadow-md hover:brightness-110"
            title={isPlaying ? 'Пауза (Пробел)' : 'Воспроизведение (Пробел)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(totalDuration, currentTime + 1))}
            aria-label="Вперед на 1 секунду"
            className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            title="Вперед на 1 сек (→)"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSeek(0)}
            aria-label="В начало"
            className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            title="В начало"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timecode */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-semibold text-[#F2F2F4]">{formatTime(currentTime, true)}</span>
          <span className="text-[var(--c-steel)]">/</span>
          <span className="text-[var(--c-silver)]">{formatTime(totalDuration, true)}</span>
        </div>

        {/* Extra toggles: Loop, Mute, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleLoop}
            aria-label={isLooping ? 'Выключить повтор' : 'Включить повтор'}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
              isLooping
                ? 'bg-[var(--c-silver)] text-[var(--c-black)] border-[#F2F2F4]/60'
                : 'border-[var(--c-steel)]/40 text-[var(--c-silver)] hover:text-[#F2F2F4]'
            }`}
            title="Зацикливание предпросмотра"
          >
            Loop
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Включить звук превью' : 'Заглушить превью'}
            className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            title={isMuted ? 'Включить звук' : 'Заглушить'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[var(--c-steel)]" /> : <Volume2 className="w-4 h-4 text-[var(--c-silver)]" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Полноэкранный режим"
            className="p-1.5 rounded-full hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors cursor-pointer"
            title="Полноэкранный режим"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

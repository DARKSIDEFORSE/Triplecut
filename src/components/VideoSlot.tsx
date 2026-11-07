import React, { useRef, useState } from 'react';
import { Upload, Trash2, Volume2, VolumeX, RefreshCw, Play, Pause } from 'lucide-react';
import { formatTime } from '../timeline/timeline';

export type SlotRole = 'main' | 'filler' | 'popup';

interface VideoSlotProps {
  role: SlotRole;
  title: string;
  badge: string;
  description: string;
  file: File | null;
  videoUrl: string | null;
  duration: number;
  volume: number; // 0 to 1
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onVolumeChange: (vol: number) => void;
}

export const VideoSlot: React.FC<VideoSlotProps> = ({
  role,
  title,
  badge,
  description,
  file,
  videoUrl,
  duration,
  volume,
  onFileSelect,
  onClear,
  onVolumeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSlotPlaying, setIsSlotPlaying] = useState(false);
  const slotVideoRef = useRef<HTMLVideoElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const toggleSlotPlayback = () => {
    if (!slotVideoRef.current) return;
    if (slotVideoRef.current.paused) {
      slotVideoRef.current.play();
      setIsSlotPlaying(true);
    } else {
      slotVideoRef.current.pause();
      setIsSlotPlaying(false);
    }
  };

  // Monochromatic role indicator badges
  const roleBadgeStyle =
    role === 'main'
      ? 'bg-[var(--c-silver)] text-[var(--c-black)] font-semibold border border-[#F2F2F4]/40'
      : role === 'filler'
      ? 'bg-[var(--c-slate)] text-[#F2F2F4] border border-[var(--c-steel)]'
      : 'bg-[var(--c-steel)] text-[#F2F2F4] border border-[var(--c-silver)]/50';

  const roleDotStyle =
    role === 'main'
      ? 'bg-[var(--c-silver)]'
      : role === 'filler'
      ? 'bg-[var(--c-slate)] border border-[var(--c-steel)]'
      : 'bg-[var(--c-steel)]';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`liquid-glass-card p-3.5 flex flex-col gap-2.5 transition-all duration-300 relative ${
        isDragging
          ? 'border-dashed border-2 border-[var(--c-silver)] ring-2 ring-[var(--c-silver)]/30'
          : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${roleDotStyle}`} />
          <span className="font-semibold text-xs tracking-tight uppercase text-[#F2F2F4]">{title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadgeStyle}`}>
            {badge}
          </span>
        </div>

        {file && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={`Заменить видео ${title}`}
              className="p-1 rounded-lg hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors"
              title="Заменить файл"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClear}
              aria-label={`Удалить видео ${title}`}
              className="p-1 rounded-lg hover:bg-[var(--c-graphite)] text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors"
              title="Удалить файл"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--c-silver)] leading-tight">{description}</p>

      {/* Content Area: Thumbnail or Empty Dropzone */}
      {videoUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-[var(--c-black)] border border-[var(--c-steel)]/40 aspect-video flex items-center justify-center group">
          <video
            ref={slotVideoRef}
            src={videoUrl}
            playsInline
            muted
            onEnded={() => setIsSlotPlaying(false)}
            className="w-full h-full object-cover"
          />

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-black)]/90 via-transparent to-[var(--c-black)]/30 opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
            <div className="flex justify-end">
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--c-black)]/80 text-[#F2F2F4] backdrop-blur-sm border border-[var(--c-steel)]/40">
                {formatTime(duration, true)}
              </span>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={toggleSlotPlayback}
                aria-label={isSlotPlaying ? 'Пауза превью слота' : 'Воспроизвести превью слота'}
                className="w-8 h-8 rounded-full bg-[var(--c-graphite)]/80 hover:bg-[var(--c-steel)] text-[#F2F2F4] backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 border border-[var(--c-steel)]/50"
              >
                {isSlotPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            </div>

            <div className="truncate text-[10px] text-[var(--c-silver)] font-mono">
              {file?.name || 'video_clip.mp4'}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={`Загрузить видео для ${title}`}
          className="rounded-xl border border-dashed border-[var(--c-steel)] hover:border-[var(--c-silver)] p-4 flex flex-col items-center justify-center gap-1.5 bg-[var(--c-black)]/40 hover:bg-[var(--c-graphite)]/30 transition-all cursor-pointer group text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--c-graphite)]/60 group-hover:bg-[var(--c-steel)]/60 flex items-center justify-center text-[var(--c-silver)] group-hover:text-[#F2F2F4] transition-colors">
            <Upload className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-[#F2F2F4]">Выбрать видео</span>
          <span className="text-[10px] text-[var(--c-steel)]">или перетащите файл сюда</span>
        </button>
      )}

      {/* Volume Slider: track --c-graphite, thumb --c-silver */}
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--c-steel)]/20">
        <button
          type="button"
          onClick={() => onVolumeChange(volume === 0 ? (role === 'filler' ? 0.3 : 1) : 0)}
          aria-label={volume === 0 ? `Включить звук ${title}` : `Заглушить звук ${title}`}
          className="text-[var(--c-silver)] hover:text-[#F2F2F4] transition-colors"
          title={volume === 0 ? 'Включить звук' : 'Заглушить звук'}
        >
          {volume === 0 ? (
            <VolumeX className="w-3.5 h-3.5 text-[var(--c-steel)]" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[var(--c-silver)]" />
          )}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label={`Громкость ${title}`}
          />
        </div>
        <span className="text-[11px] font-mono text-[var(--c-silver)] w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};

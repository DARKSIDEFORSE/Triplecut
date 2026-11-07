import React, { useRef, useState } from 'react';
import { TimelineModel } from '../timeline/types';
import { formatTime } from '../timeline/timeline';
import { Layers, PauseCircle } from 'lucide-react';

interface TimelineViewProps {
  timeline: TimelineModel;
  currentTime: number;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  currentTime,
  onSeek,
  onScrubStart,
  onScrubEnd,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const totalDuration = timeline.totalDuration || 1;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    setIsScrubbing(true);
    onScrubStart?.();

    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * totalDuration);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    setHoverX(e.clientX - rect.left);
    setHoverTime(pos * totalDuration);

    if (isScrubbing) {
      onSeek(pos * totalDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      onScrubEnd?.();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture already released
      }
    }
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverTime(null);
    }
  };

  const currentPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
  const totalPauseDuration = timeline.popupCount * timeline.popupDuration;

  return (
    <div className="liquid-glass-slate p-3.5 flex flex-col gap-2.5 select-none w-full">
      {/* Top Header & Detailed Legend */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-semibold tracking-tight text-[#F2F2F4]">
            <Layers className="w-3.5 h-3.5 text-[var(--c-silver)]" />
            <span>Модель таймлайна</span>
          </div>

          {/* Monochrome Legend: Pattern + Shade labels */}
          <div className="flex items-center gap-3.5 text-[11px]">
            {/* Main Legend: Solid Silver */}
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <span className="w-3.5 h-3 rounded-[3px] bg-[var(--seg-main)] border border-[#F2F2F4]/40" />
              <span>Main (Светлый блок)</span>
            </span>

            {/* Filler Legend: Slate with fine diagonal hatching */}
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <span className="w-3.5 h-3 rounded-[3px] bg-[var(--c-slate)] diagonal-hatch border border-[var(--c-steel)]/50" />
              <span>Filler (Штриховка)</span>
            </span>

            {/* Popup Legend: Steel with white capsule marker */}
            <span className="flex items-center gap-1.5 text-[var(--c-silver)]">
              <span className="w-3.5 h-3 rounded-[3px] bg-[var(--c-steel)] relative border border-[var(--c-silver)]/40 flex items-start justify-center">
                <span className="w-2 h-0.5 bg-[#F2F2F4] rounded-full mt-[1px]" />
              </span>
              <span>Popup (Пауза + капсула)</span>
            </span>
          </div>
        </div>

        {/* Duration Breakdown Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-[var(--c-black)]/70 px-3 py-1 rounded-full border border-[var(--c-steel)]/40 text-[11px] flex items-center gap-2.5">
            <span className="text-[var(--c-silver)]">
              Main: <strong className="text-[#F2F2F4] font-mono">{formatTime(timeline.mainDuration)}</strong>
            </span>
            <span className="text-[var(--c-steel)]">+</span>
            <span className="text-[var(--c-silver)]">
              Паузы ({timeline.popupCount}): <strong className="text-[#F2F2F4] font-mono">{formatTime(totalPauseDuration)}</strong>
            </span>
            <span className="text-[var(--c-steel)]">=</span>
            <span className="text-[var(--c-silver)]">
              Итого: <strong className="text-[#F2F2F4] font-mono font-bold">{formatTime(timeline.totalDuration, true)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Timeline Track: Background --c-black */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative h-15 bg-[var(--c-black)] rounded-2xl border border-[var(--c-steel)]/40 overflow-hidden cursor-pointer group flex flex-col justify-end p-1.5 shadow-inner"
      >
        {/* Segments Container */}
        <div className="relative w-full h-9 flex rounded-xl overflow-hidden bg-[var(--c-black)] border border-[var(--c-steel)]/30">
          {timeline.segments.map((seg, idx) => {
            const widthPct = (seg.duration / totalDuration) * 100;
            const isPopup = seg.type === 'popup';

            if (isPopup) {
              return (
                <div
                  key={seg.id || idx}
                  style={{ width: `${widthPct}%` }}
                  className="h-full relative flex flex-col items-center justify-between border-r border-[var(--c-black)]/80 bg-[var(--c-steel)] px-1 py-0.5 overflow-hidden group/seg"
                  title={`Пауза контента: Popup #${Math.ceil(idx / 2)} (${seg.duration.toFixed(1)} сек)`}
                >
                  {/* Top White Capsule Marker specified by user */}
                  <div className="w-full flex justify-center">
                    <div className="h-1 px-1.5 bg-[#F2F2F4] rounded-full shadow-sm flex items-center justify-center min-w-[12px] max-w-[80%]" />
                  </div>

                  {/* Segment Label */}
                  <span className="text-[10px] font-mono text-[var(--c-black)] font-bold truncate flex items-center gap-0.5 drop-shadow-sm">
                    <PauseCircle className="w-2.5 h-2.5 inline shrink-0" />
                    <span>{seg.duration.toFixed(1)}с</span>
                  </span>

                  {/* Subtle bottom border accent */}
                  <div className="w-full h-0.5 bg-[var(--c-black)]/40 rounded-full" />
                </div>
              );
            }

            // Main Play Segment: --c-silver with dark text
            return (
              <div
                key={seg.id || idx}
                style={{ width: `${widthPct}%` }}
                className="h-full relative flex items-center justify-center border-r border-[var(--c-black)]/80 bg-[var(--seg-main)] text-[var(--seg-main-text)] px-1 overflow-hidden group/seg font-semibold"
                title={`Воспроизведение: Main + Filler (${seg.duration.toFixed(1)} сек)`}
              >
                <span className="text-[10px] font-mono truncate">
                  {seg.duration.toFixed(1)}с
                </span>
              </div>
            );
          })}
        </div>

        {/* Filler Loops Sub-track below: --c-slate with diagonal hatching */}
        <div className="relative w-full h-2 mt-1 rounded-full overflow-hidden bg-[var(--c-slate)] diagonal-hatch border border-[var(--c-steel)]/40">
          <div className="absolute inset-0 opacity-40 bg-[var(--c-black)]/20" />
        </div>

        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute top-1 pointer-events-none transform -translate-x-1/2 z-20"
            style={{ left: `${hoverX}px` }}
          >
            <span className="bg-[var(--c-black)] text-[#F2F2F4] font-mono text-[10px] px-2 py-0.5 rounded-md border border-[var(--c-steel)] shadow-xl backdrop-blur-md">
              {formatTime(hoverTime, true)}
            </span>
          </div>
        )}

        {/* Playhead Needle Cursor: White thin line with round glass handle */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-30 transition-transform duration-75"
          style={{
            left: `${currentPercent}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* White Thin Vertical Line */}
          <div className="w-[1.5px] h-full bg-[#F2F2F4] shadow-[0_0_6px_rgba(255,255,255,0.7)]" />

          {/* Round Glass Handle */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#F2F2F4] border-2 border-[var(--c-black)] shadow-md shadow-black/80" />
        </div>
      </div>
    </div>
  );
};

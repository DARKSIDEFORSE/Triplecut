/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PreviewPlayer } from './components/PreviewPlayer';
import { TimelineView } from './components/TimelineView';
import { ExportModal } from './components/ExportModal';
import { buildTimeline, getTimelineStateAt } from './timeline/timeline';
import { renderFrame, RenderOptions } from './render/frameRenderer';
import {
  AspectRatio,
  ResolutionPreset,
  ExportProgress,
  exportTimelineVideo,
  saveVideoBlob,
  getExportDimensions,
} from './export/videoExporter';
import { createDemoVideo } from './utils/demoVideos';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('dark');

  // Video aspect ratio
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');

  // Video assets state
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [mainUrl, setMainUrl] = useState<string | null>(null);
  const [mainDuration, setMainDuration] = useState<number>(0);
  const [mainVolume, setMainVolume] = useState<number>(1.0);

  const [fillerFile, setFillerFile] = useState<File | null>(null);
  const [fillerUrl, setFillerUrl] = useState<string | null>(null);
  const [fillerDuration, setFillerDuration] = useState<number>(0);
  const [fillerVolume, setFillerVolume] = useState<number>(0.0); // 0% default as required

  const [popupFile, setPopupFile] = useState<File | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [popupDuration, setPopupDuration] = useState<number>(0);
  const [popupVolume, setPopupVolume] = useState<number>(1.0);

  // Settings
  const [popupInterval, setPopupInterval] = useState<number>(5); // every 5s of Main
  const [firstDelay, setFirstDelay] = useState<number>(3); // 3s before 1st popup
  const [popupScalePercent, setPopupScalePercent] = useState<number>(60); // 60% of width
  const [splitRatioPercent, setSplitRatioPercent] = useState<number>(50); // 50/50 split

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  // DOM refs for Hidden Videos and Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const fillerVideoRef = useRef<HTMLVideoElement | null>(null);
  const popupVideoRef = useRef<HTMLVideoElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // 1. Unified Timeline Model
  const timeline = useMemo(() => {
    return buildTimeline({
      mainDuration,
      fillerDuration,
      popupDuration,
      popupInterval,
      firstDelay,
    });
  }, [mainDuration, fillerDuration, popupDuration, popupInterval, firstDelay]);

  // Current playhead state
  const playheadState = useMemo(() => {
    return getTimelineStateAt(timeline, currentTime);
  }, [timeline, currentTime]);

  // Handle system or selected theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'dark') {
      root.classList.remove('light');
    } else {
      const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (isSystemLight) {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
    }
  }, [theme]);

  // Helper to load duration from video file
  const loadVideoMetadata = (file: File): Promise<{ url: string; duration: number }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        const dur = isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 10;
        resolve({ url, duration: dur });
      };
      tempVideo.onerror = () => {
        resolve({ url, duration: 10 });
      };
      tempVideo.src = url;
    });
  };

  // Video Slot Handlers
  const handleMainFileSelect = async (file: File) => {
    if (mainUrl) URL.revokeObjectURL(mainUrl);
    const meta = await loadVideoMetadata(file);
    setMainFile(file);
    setMainUrl(meta.url);
    setMainDuration(meta.duration);
    setCurrentTime(0);
  };

  const handleMainClear = () => {
    if (mainUrl) URL.revokeObjectURL(mainUrl);
    setMainFile(null);
    setMainUrl(null);
    setMainDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleFillerFileSelect = async (file: File) => {
    if (fillerUrl) URL.revokeObjectURL(fillerUrl);
    const meta = await loadVideoMetadata(file);
    setFillerFile(file);
    setFillerUrl(meta.url);
    setFillerDuration(meta.duration);
  };

  const handleFillerClear = () => {
    if (fillerUrl) URL.revokeObjectURL(fillerUrl);
    setFillerFile(null);
    setFillerUrl(null);
    setFillerDuration(0);
  };

  const handlePopupFileSelect = async (file: File) => {
    if (popupUrl) URL.revokeObjectURL(popupUrl);
    const meta = await loadVideoMetadata(file);
    setPopupFile(file);
    setPopupUrl(meta.url);
    setPopupDuration(meta.duration);
  };

  const handlePopupClear = () => {
    if (popupUrl) URL.revokeObjectURL(popupUrl);
    setPopupFile(null);
    setPopupUrl(null);
    setPopupDuration(0);
  };

  // 1-Click Demo loader
  const handleLoadDemo = async () => {
    try {
      setIsDemoLoading(true);
      const [mainDemo, fillerDemo, popupDemo] = await Promise.all([
        createDemoVideo('main', 8),
        createDemoVideo('filler', 4),
        createDemoVideo('popup', 2),
      ]);

      setMainFile(mainDemo.file);
      setMainUrl(mainDemo.url);
      setMainDuration(mainDemo.duration);

      setFillerFile(fillerDemo.file);
      setFillerUrl(fillerDemo.url);
      setFillerDuration(fillerDemo.duration);

      setPopupFile(popupDemo.file);
      setPopupUrl(popupDemo.url);
      setPopupDuration(popupDemo.duration);

      setCurrentTime(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error generating demo videos:', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Sync hidden video playback & seek
  const syncVideosToTime = useCallback(
    (time: number) => {
      const state = getTimelineStateAt(timeline, time);

      // Main video
      if (mainVideoRef.current && mainDuration > 0) {
        if (Math.abs(mainVideoRef.current.currentTime - state.mainTime) > 0.1) {
          mainVideoRef.current.currentTime = state.mainTime;
        }
        mainVideoRef.current.volume = isMuted || state.isPopupActive ? 0 : mainVolume;
      }

      // Filler video
      if (fillerVideoRef.current && fillerDuration > 0) {
        if (Math.abs(fillerVideoRef.current.currentTime - state.fillerTime) > 0.1) {
          fillerVideoRef.current.currentTime = state.fillerTime;
        }
        fillerVideoRef.current.volume = isMuted || state.isPopupActive ? 0 : fillerVolume;
      }

      // Popup video
      if (popupVideoRef.current && popupDuration > 0) {
        if (state.isPopupActive) {
          if (Math.abs(popupVideoRef.current.currentTime - state.popupTime) > 0.1) {
            popupVideoRef.current.currentTime = state.popupTime;
          }
          popupVideoRef.current.volume = isMuted ? 0 : popupVolume;
        } else {
          popupVideoRef.current.currentTime = 0;
          popupVideoRef.current.volume = 0;
        }
      }
    },
    [timeline, mainDuration, fillerDuration, popupDuration, isMuted, mainVolume, fillerVolume, popupVolume]
  );

  // Render loop for Canvas Preview
  const drawPreview = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getExportDimensions(aspectRatio, '720p');
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const renderOpts: RenderOptions = {
      canvasWidth: width,
      canvasHeight: height,
      splitRatio: splitRatioPercent / 100,
      popupWidthRatio: popupScalePercent / 100,
    };

    renderFrame(
      ctx,
      renderOpts,
      playheadState,
      mainVideoRef.current,
      fillerVideoRef.current,
      popupVideoRef.current
    );
  }, [aspectRatio, splitRatioPercent, popupScalePercent, playheadState]);

  // Playback animation tick
  useEffect(() => {
    if (!isPlaying) {
      drawPreview();
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= timeline.totalDuration) {
          if (isLooping && timeline.totalDuration > 0) {
            syncVideosToTime(0);
            return 0;
          } else {
            setIsPlaying(false);
            return timeline.totalDuration;
          }
        }
        syncVideosToTime(next);
        return next;
      });

      drawPreview();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, timeline.totalDuration, isLooping, syncVideosToTime, drawPreview]);

  // Redraw when scrubbing or parameters change
  useEffect(() => {
    if (!isPlaying) {
      syncVideosToTime(currentTime);
      drawPreview();
    }
  }, [currentTime, isPlaying, syncVideosToTime, drawPreview]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(timeline.totalDuration, t + 1));
      } else if (e.code === 'Escape') {
        if (isExportModalOpen && !isExporting) {
          setIsExportModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline.totalDuration, isExportModalOpen, isExporting]);

  // Export handlers
  const handleStartExport = async (res: ResolutionPreset, fps: 30 | 60) => {
    setIsExporting(true);
    setExportError(null);
    setExportedBlob(null);
    setExportProgress({
      percent: 0,
      currentFrame: 0,
      totalFrames: Math.ceil(timeline.totalDuration * fps),
      phase: 'Подготовка к монтажу...',
      etaSeconds: 0,
    });

    const abortCtrl = new AbortController();
    exportAbortControllerRef.current = abortCtrl;

    // Pause live player while exporting
    setIsPlaying(false);

    try {
      const blob = await exportTimelineVideo({
        timeline,
        aspectRatio,
        resolution: res,
        fps,
        splitRatio: splitRatioPercent / 100,
        popupWidthRatio: popupScalePercent / 100,
        mainVideoSrc: mainUrl || undefined,
        fillerVideoSrc: fillerUrl || undefined,
        popupVideoSrc: popupUrl || undefined,
        mainBlob: mainFile,
        fillerBlob: fillerFile,
        popupBlob: popupFile,
        mainVolume,
        fillerVolume,
        popupVolume,
        onProgress: setExportProgress,
        signal: abortCtrl.signal,
      });

      setExportedBlob(blob);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        setExportError('Экспорт отменен.');
      } else {
        console.error('Export failed:', err);
        setExportError((err as Error)?.message || 'Не удалось завершить экспорт видео.');
      }
    } finally {
      setIsExporting(false);
      exportAbortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
  };

  const handleSaveFile = (blob: Blob) => {
    saveVideoBlob(blob, `TripleCut_${aspectRatio.replace(':', 'x')}_${Date.now()}.mp4`);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col p-4 gap-3 overflow-hidden text-[var(--text-primary)]">
      {/* Background Breathing Mesh Gradient */}
      <div className="mesh-bg" />

      {/* Hidden Synchronized HTML5 Videos for Canvas Ingestion */}
      <div className="hidden">
        {mainUrl && (
          <video
            ref={mainVideoRef}
            src={mainUrl}
            playsInline
            muted={isMuted}
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
        {fillerUrl && (
          <video
            ref={fillerVideoRef}
            src={fillerUrl}
            playsInline
            muted={isMuted || fillerVolume === 0}
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
        {popupUrl && (
          <video
            ref={popupVideoRef}
            src={popupUrl}
            playsInline
            muted={isMuted}
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
      </div>

      {/* Top Header */}
      <Header
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        theme={theme}
        onThemeChange={setTheme}
        onLoadDemo={handleLoadDemo}
        isDemoLoading={isDemoLoading}
        onOpenExport={() => setIsExportModalOpen(true)}
        hasMainVideo={!!mainFile}
        totalDuration={timeline.totalDuration}
      />

      {/* Main Workspace Body: Left Sidebar + Center Preview */}
      <main className="flex-1 flex gap-4 min-h-0 min-w-0">
        {/* Left Sidebar */}
        <Sidebar
          mainFile={mainFile}
          mainUrl={mainUrl}
          mainDuration={mainDuration}
          mainVolume={mainVolume}
          onMainFileSelect={handleMainFileSelect}
          onMainClear={handleMainClear}
          onMainVolumeChange={setMainVolume}
          fillerFile={fillerFile}
          fillerUrl={fillerUrl}
          fillerDuration={fillerDuration}
          fillerVolume={fillerVolume}
          onFillerFileSelect={handleFillerFileSelect}
          onFillerClear={handleFillerClear}
          onFillerVolumeChange={setFillerVolume}
          popupFile={popupFile}
          popupUrl={popupUrl}
          popupDuration={popupDuration}
          popupVolume={popupVolume}
          onPopupFileSelect={handlePopupFileSelect}
          onPopupClear={handlePopupClear}
          onPopupVolumeChange={setPopupVolume}
          popupInterval={popupInterval}
          onPopupIntervalChange={setPopupInterval}
          firstDelay={firstDelay}
          onFirstDelayChange={setFirstDelay}
          popupScalePercent={popupScalePercent}
          onPopupScalePercentChange={setPopupScalePercent}
          splitRatioPercent={splitRatioPercent}
          onSplitRatioPercentChange={setSplitRatioPercent}
        />

        {/* Center Canvas Preview & HUD */}
        <PreviewPlayer
          aspectRatio={aspectRatio}
          canvasRef={canvasRef}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          currentTime={currentTime}
          totalDuration={timeline.totalDuration}
          onSeek={setCurrentTime}
          playheadState={playheadState}
          timeline={timeline}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping((l) => !l)}
          hasMainVideo={!!mainFile}
          onLoadDemo={handleLoadDemo}
        />
      </main>

      {/* Full-width Bottom Timeline */}
      <TimelineView
        timeline={timeline}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        onScrubStart={() => setIsPlaying(false)}
      />

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        timeline={timeline}
        aspectRatio={aspectRatio}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportedBlob={exportedBlob}
        onSaveFile={handleSaveFile}
        errorMessage={exportError}
      />
    </div>
  );
}

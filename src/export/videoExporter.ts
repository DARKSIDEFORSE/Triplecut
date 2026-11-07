import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { TimelineModel } from '../timeline/types';
import { getTimelineStateAt } from '../timeline/timeline';
import { renderFrame, RenderOptions } from '../render/frameRenderer';
import { mixTimelineAudio } from '../audio/audioMixer';

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type ResolutionPreset = '720p' | '1080p';

export interface ExportProgress {
  percent: number;
  currentFrame: number;
  totalFrames: number;
  phase: string;
  etaSeconds: number;
}

export interface ExportConfig {
  timeline: TimelineModel;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  fps: 30 | 60;
  splitRatio: number;
  popupWidthRatio: number;

  mainVideoSrc?: string;
  fillerVideoSrc?: string;
  popupVideoSrc?: string;

  mainBlob?: Blob | null;
  fillerBlob?: Blob | null;
  popupBlob?: Blob | null;

  mainVolume: number;
  fillerVolume: number;
  popupVolume: number;

  onProgress: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}

/**
 * Calculates canvas pixel dimensions based on resolution and aspect ratio.
 */
export function getExportDimensions(aspect: AspectRatio, res: ResolutionPreset): { width: number; height: number } {
  const is1080p = res === '1080p';

  if (aspect === '9:16') {
    return is1080p ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
  } else if (aspect === '16:9') {
    return is1080p ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
  } else {
    // 1:1 square
    return is1080p ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
  }
}

/**
 * Accurately seeks a video element to a specific timestamp and waits for frame render.
 */
function seekVideoElement(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.005) {
      resolve();
      return;
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = Math.max(0, Math.min(time, video.duration || 9999));
  });
}

/**
 * Prepares an offscreen video element for frame extraction.
 */
function createOffscreenVideo(src?: string): Promise<HTMLVideoElement | null> {
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    // Only set crossOrigin for remote http/https URLs; blob: URLs fail if crossOrigin is set
    if (src.startsWith('http:') || src.startsWith('https:')) {
      video.crossOrigin = 'anonymous';
    }
    video.playsInline = true;
    video.muted = true;
    video.preload = 'auto';

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(video);
      }
    };

    video.onloadeddata = finish;
    video.oncanplay = finish;
    video.onloadedmetadata = finish;

    video.onerror = (e) => {
      console.warn('Offscreen video load warning for:', src, e);
      if (!resolved) {
        resolved = true;
        resolve(video); // Still return video element to attempt rendering
      }
    };

    video.src = src;
    video.load();

    if (video.readyState >= 2) {
      finish();
    }
  });
}

/**
 * Exports MP4 using WebCodecs + mp4-muxer.
 * Falls back to MediaRecorder if WebCodecs is not supported.
 */
export async function exportTimelineVideo(config: ExportConfig): Promise<Blob> {
  const {
    timeline,
    aspectRatio,
    resolution,
    fps,
    splitRatio,
    popupWidthRatio,
    mainVideoSrc,
    fillerVideoSrc,
    popupVideoSrc,
    mainBlob,
    fillerBlob,
    popupBlob,
    mainVolume,
    fillerVolume,
    popupVolume,
    onProgress,
    signal,
  } = config;

  if (timeline.totalDuration <= 0) {
    throw new Error('Длительность таймлайна равна нулю. Загрузите Main видео.');
  }

  const { width, height } = getExportDimensions(aspectRatio, resolution);
  const totalFrames = Math.max(1, Math.ceil(timeline.totalDuration * fps));

  // Check WebCodecs support
  const hasWebCodecs = typeof window.VideoEncoder !== 'undefined' && typeof window.VideoFrame !== 'undefined';

  if (!hasWebCodecs) {
    console.warn('WebCodecs is not supported in this browser. Falling back to MediaRecorder.');
    return exportWithMediaRecorder(config, width, height);
  }

  // 1. Prepare video sources
  onProgress({
    percent: 2,
    currentFrame: 0,
    totalFrames,
    phase: 'Инициализация видеопотоков...',
    etaSeconds: 0,
  });

  const [mainVideo, fillerVideo, popupVideo] = await Promise.all([
    createOffscreenVideo(mainVideoSrc),
    createOffscreenVideo(fillerVideoSrc),
    createOffscreenVideo(popupVideoSrc),
  ]);

  if (signal?.aborted) throw new DOMException('Экспорт отменен пользователем', 'AbortError');

  // 2. Mix offline audio
  onProgress({
    percent: 6,
    currentFrame: 0,
    totalFrames,
    phase: 'Сведение аудиодорожек и пауз...',
    etaSeconds: 0,
  });

  let audioBuffer: AudioBuffer | null = null;
  try {
    audioBuffer = await mixTimelineAudio(timeline, {
      mainBlob,
      fillerBlob,
      popupBlob,
      mainVolume,
      fillerVolume,
      popupVolume,
    });
  } catch (err) {
    console.warn('Audio mixing skipped or failed:', err);
  }

  if (signal?.aborted) throw new DOMException('Экспорт отменен пользователем', 'AbortError');

  // 3. Initialize MP4 Muxer
  // Check if AudioEncoder supports AAC
  let canEncodeAudio = false;
  if (audioBuffer && typeof window.AudioEncoder !== 'undefined') {
    try {
      const audioConfig = {
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: audioBuffer.sampleRate,
        bitrate: 192_000,
      };
      if ('isConfigSupported' in window.AudioEncoder) {
        const support = await window.AudioEncoder.isConfigSupported(audioConfig);
        canEncodeAudio = !!support.supported;
      } else {
        canEncodeAudio = true;
      }
    } catch {
      canEncodeAudio = false;
    }
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width,
      height,
    },
    audio:
      canEncodeAudio && audioBuffer
        ? {
            codec: 'aac',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: 2,
          }
        : undefined,
    fastStart: 'in-memory',
  });

  // 4. Initialize VideoEncoder
  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e instanceof Error ? e : new Error(String(e));
      console.error('VideoEncoder error:', e);
    },
  });

  const bitrate = resolution === '1080p' ? 8_000_000 : 4_500_000;

  try {
    videoEncoder.configure({
      codec: 'avc1.420028', // H.264 Baseline Profile
      width,
      height,
      bitrate,
      framerate: fps,
    });
  } catch (e) {
    console.warn('Failed to configure avc1.420028, trying fallback codec config:', e);
    videoEncoder.configure({
      codec: 'avc1.4d002a', // Main Profile
      width,
      height,
      bitrate,
      framerate: fps,
    });
  }

  // 5. Initialize AudioEncoder if supported and audio exists
  let audioEncoder: AudioEncoder | null = null;
  if (canEncodeAudio && audioBuffer && typeof window.AudioEncoder !== 'undefined') {
    try {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.warn('AudioEncoder error:', e),
      });

      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: audioBuffer.sampleRate,
        bitrate: 192_000,
      });

      // Encode audio chunks
      const sampleRate = audioBuffer.sampleRate;
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

      // Feed audio in ~1024-sample frames
      const CHUNK_SIZE = 1024;
      for (let offset = 0; offset < audioBuffer.length; offset += CHUNK_SIZE) {
        if (signal?.aborted) throw new DOMException('Экспорт отменен пользователем', 'AbortError');

        const framesInChunk = Math.min(CHUNK_SIZE, audioBuffer.length - offset);
        const planarBuffer = new Float32Array(framesInChunk * 2);
        planarBuffer.set(leftChannel.subarray(offset, offset + framesInChunk), 0);
        planarBuffer.set(rightChannel.subarray(offset, offset + framesInChunk), framesInChunk);

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: framesInChunk,
          numberOfChannels: 2,
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: planarBuffer,
        });

        audioEncoder.encode(audioData);
        audioData.close();
      }

      await audioEncoder.flush();
    } catch (err) {
      console.warn('Audio encoding skipped or failed in WebCodecs:', err);
      audioEncoder = null;
    }
  }

  // 6. Setup Canvas and Offscreen Render
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const renderOpts: RenderOptions = {
    canvasWidth: width,
    canvasHeight: height,
    splitRatio,
    popupWidthRatio,
  };

  const startTime = performance.now();
  let lastMainSeek = -1;
  let lastFillerSeek = -1;
  let lastPopupSeek = -1;

  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) {
      videoEncoder.close();
      if (audioEncoder) audioEncoder.close();
      throw new DOMException('Экспорт отменен пользователем', 'AbortError');
    }

    if (encoderError) {
      throw encoderError;
    }

    const t = f / fps;
    const state = getTimelineStateAt(timeline, t);

    // Seek videos as needed according to timeline state
    const seekPromises: Promise<void>[] = [];

    if (mainVideo) {
      if (Math.abs(lastMainSeek - state.mainTime) > 0.005) {
        seekPromises.push(seekVideoElement(mainVideo, state.mainTime));
        lastMainSeek = state.mainTime;
      }
    }

    if (fillerVideo) {
      if (Math.abs(lastFillerSeek - state.fillerTime) > 0.005) {
        seekPromises.push(seekVideoElement(fillerVideo, state.fillerTime));
        lastFillerSeek = state.fillerTime;
      }
    }

    if (popupVideo && state.isPopupActive) {
      if (Math.abs(lastPopupSeek - state.popupTime) > 0.005) {
        seekPromises.push(seekVideoElement(popupVideo, state.popupTime));
        lastPopupSeek = state.popupTime;
      }
    }

    if (seekPromises.length > 0) {
      await Promise.all(seekPromises);
    }

    // Render frame to canvas
    renderFrame(ctx, renderOpts, state, mainVideo, fillerVideo, popupVideo);

    // Create VideoFrame and encode
    const frameTimestamp = Math.round(t * 1_000_000);
    const frameDuration = Math.round((1 / fps) * 1_000_000);

    const videoFrame = new VideoFrame(canvas, {
      timestamp: frameTimestamp,
      duration: frameDuration,
    });

    const isKeyFrame = f % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Progress and ETA calculation
    if (f % 5 === 0 || f === totalFrames - 1) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const progressFraction = (f + 1) / totalFrames;
      const totalEstimatedSec = elapsedSec / progressFraction;
      const etaSeconds = Math.max(0, Math.round(totalEstimatedSec - elapsedSec));

      const percent = Math.min(98, 10 + Math.round(progressFraction * 88));
      onProgress({
        percent,
        currentFrame: f + 1,
        totalFrames,
        phase: `Рендер кадра ${f + 1} из ${totalFrames}...`,
        etaSeconds,
      });

      // Allow event loop to process
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // 7. Finalize
  onProgress({
    percent: 99,
    currentFrame: totalFrames,
    totalFrames,
    phase: 'Финализация MP4 контейнера...',
    etaSeconds: 0,
  });

  await videoEncoder.flush();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: 'video/mp4' });
}

/**
 * Fallback export using MediaRecorder when WebCodecs is not supported.
 */
async function exportWithMediaRecorder(
  config: ExportConfig,
  width: number,
  height: number
): Promise<Blob> {
  const {
    timeline,
    fps,
    splitRatio,
    popupWidthRatio,
    mainVideoSrc,
    fillerVideoSrc,
    popupVideoSrc,
    onProgress,
    signal,
  } = config;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const [mainVideo, fillerVideo, popupVideo] = await Promise.all([
    createOffscreenVideo(mainVideoSrc),
    createOffscreenVideo(fillerVideoSrc),
    createOffscreenVideo(popupVideoSrc),
  ]);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm',
    videoBitsPerSecond: 6_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });

  recorder.start();

  const totalFrames = Math.ceil(timeline.totalDuration * fps);
  const renderOpts: RenderOptions = {
    canvasWidth: width,
    canvasHeight: height,
    splitRatio,
    popupWidthRatio,
  };

  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) {
      recorder.stop();
      throw new DOMException('Экспорт отменен пользователем', 'AbortError');
    }

    const t = f / fps;
    const state = getTimelineStateAt(timeline, t);

    if (mainVideo) await seekVideoElement(mainVideo, state.mainTime);
    if (fillerVideo) await seekVideoElement(fillerVideo, state.fillerTime);
    if (popupVideo && state.isPopupActive) await seekVideoElement(popupVideo, state.popupTime);

    renderFrame(ctx, renderOpts, state, mainVideo, fillerVideo, popupVideo);

    if (f % 5 === 0) {
      onProgress({
        percent: Math.round((f / totalFrames) * 98),
        currentFrame: f,
        totalFrames,
        phase: `MediaRecorder: рендер кадра ${f}/${totalFrames}...`,
        etaSeconds: 0,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  recorder.stop();
  return recordingPromise;
}

/**
 * Triggers file download or native File System Access API save picker.
 */
export async function saveVideoBlob(blob: Blob, suggestedName = 'triplecut_export.mp4') {
  // Try File System Access API first if available (common in Chromium/Electron)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return; // User cancelled save dialog
      }
      console.warn('File System Access API failed or cancelled, falling back to download link:', err);
    }
  }

  // Standard browser anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

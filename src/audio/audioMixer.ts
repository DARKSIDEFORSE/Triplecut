import { TimelineModel } from '../timeline/types';

export interface AudioMixerOptions {
  mainBlob?: Blob | null;
  fillerBlob?: Blob | null;
  popupBlob?: Blob | null;
  mainVolume: number; // 0 to 1
  fillerVolume: number; // 0 to 1
  popupVolume: number; // 0 to 1
}

/**
 * Extracts and decodes audio from a video blob into an AudioBuffer.
 * Returns null if the video has no audio track or fails decoding.
 */
export async function decodeAudioFromBlob(blob: Blob, sampleRate = 44100): Promise<AudioBuffer | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const offlineCtx = new OfflineAudioContext(1, 1, sampleRate);
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('Audio track absent or could not be decoded:', err);
    return null;
  }
}

/**
 * Mixes audio according to the exact timeline model:
 * - During 'play': Main and Filler play with their respective volumes and looping.
 * - During 'popup': Main and Filler are COMPLETELY MUTED / PAUSED. Popup plays with its volume.
 */
export async function mixTimelineAudio(
  timeline: TimelineModel,
  options: AudioMixerOptions,
  sampleRate = 44100
): Promise<AudioBuffer | null> {
  const { mainBlob, fillerBlob, popupBlob, mainVolume, fillerVolume, popupVolume } = options;

  if (timeline.totalDuration <= 0) return null;

  // 1. Decode available audio buffers in parallel
  const [mainBuffer, fillerBuffer, popupBuffer] = await Promise.all([
    mainBlob && mainVolume > 0 ? decodeAudioFromBlob(mainBlob, sampleRate) : null,
    fillerBlob && fillerVolume > 0 ? decodeAudioFromBlob(fillerBlob, sampleRate) : null,
    popupBlob && popupVolume > 0 ? decodeAudioFromBlob(popupBlob, sampleRate) : null,
  ]);

  const hasAnyAudio = (mainBuffer && mainVolume > 0) ||
                      (fillerBuffer && fillerVolume > 0) ||
                      (popupBuffer && popupVolume > 0);

  if (!hasAnyAudio) {
    return null;
  }

  const totalFrames = Math.ceil(timeline.totalDuration * sampleRate);
  const offlineCtx = new OfflineAudioContext(2, Math.max(1, totalFrames), sampleRate);

  // Helper to schedule a buffer slice into the offline context
  const scheduleBufferSlice = (
    srcBuffer: AudioBuffer,
    sourceOffset: number,
    duration: number,
    targetStartTime: number,
    volume: number
  ) => {
    if (duration <= 0.0001 || volume <= 0) return;

    const source = offlineCtx.createBufferSource();
    source.buffer = srcBuffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.setValueAtTime(volume, targetStartTime);

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    // Clamp sourceOffset and duration
    const clampedOffset = Math.max(0, Math.min(sourceOffset, srcBuffer.duration - 0.001));
    const playableDuration = Math.min(duration, Math.max(0, srcBuffer.duration - clampedOffset));

    if (playableDuration > 0.0001) {
      source.start(targetStartTime, clampedOffset, playableDuration);
    }
  };

  // 2. Iterate over segments
  for (const seg of timeline.segments) {
    if (seg.type === 'play') {
      // Main audio slice
      if (mainBuffer && mainVolume > 0) {
        scheduleBufferSlice(mainBuffer, seg.mainOffset, seg.duration, seg.outStart, mainVolume);
      }

      // Filler audio with looping
      if (fillerBuffer && fillerVolume > 0 && fillerBuffer.duration > 0) {
        let segPlayed = 0;
        let currentFillerOffset = seg.fillerOffset % fillerBuffer.duration;

        while (segPlayed < seg.duration) {
          const sliceRemainingInFiller = fillerBuffer.duration - currentFillerOffset;
          const sliceDuration = Math.min(seg.duration - segPlayed, sliceRemainingInFiller);

          scheduleBufferSlice(
            fillerBuffer,
            currentFillerOffset,
            sliceDuration,
            seg.outStart + segPlayed,
            fillerVolume
          );

          segPlayed += sliceDuration;
          currentFillerOffset = 0; // loops back to beginning of filler
        }
      }
    } else if (seg.type === 'popup') {
      // Popup audio plays
      if (popupBuffer && popupVolume > 0) {
        scheduleBufferSlice(popupBuffer, 0, seg.duration, seg.outStart, popupVolume);
      }
      // Note: Main & Filler are explicitly NOT scheduled here, preserving true audio silence/pause!
    }
  }

  // 3. Render the composite audio mix
  try {
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
  } catch (err) {
    console.error('OfflineAudioContext rendering failed:', err);
    return null;
  }
}

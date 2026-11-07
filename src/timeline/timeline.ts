import { TimelineConfig, TimelineModel, TimelineSegment, PlayheadState } from './types';

/**
 * Calculates a unified timeline model consisting of 'play' and 'popup' segments.
 *
 * During 'play' segments:
 *   Main video progresses forward.
 *   Filler video progresses forward seamlessly looping via modulo fillerDuration.
 *   Popup video is hidden.
 *
 * During 'popup' segments:
 *   Main video is PAUSED (frozen at current frame).
 *   Filler video is PAUSED (frozen at current frame).
 *   Popup video plays from 0 to popupDuration.
 *
 * Total duration = mainDuration + (popupCount * popupDuration)
 */
export function buildTimeline(config: TimelineConfig): TimelineModel {
  const mainDuration = Math.max(0, config.mainDuration);
  const fillerDuration = Math.max(0.001, config.fillerDuration || mainDuration || 1);
  const popupDuration = Math.max(0, config.popupDuration);
  const popupInterval = Math.max(0.1, config.popupInterval);
  const firstDelay = Math.max(0, config.firstDelay);

  if (mainDuration <= 0) {
    return {
      segments: [],
      totalDuration: 0,
      mainDuration: 0,
      popupDuration: 0,
      popupCount: 0,
      fillerDuration,
    };
  }

  // If there is no popup video or popup duration is 0, it's just one continuous play segment
  if (popupDuration <= 0 || firstDelay >= mainDuration) {
    const singleSegment: TimelineSegment = {
      id: 'seg-play-0',
      type: 'play',
      outStart: 0,
      outEnd: mainDuration,
      duration: mainDuration,
      mainOffset: 0,
      fillerOffset: 0,
      popupOffset: 0,
    };
    return {
      segments: [singleSegment],
      totalDuration: mainDuration,
      mainDuration,
      popupDuration,
      popupCount: 0,
      fillerDuration,
    };
  }

  const segments: TimelineSegment[] = [];
  let currentMainTime = 0;
  let currentOutTime = 0;
  let nextPopupMainTarget = firstDelay;
  let segmentIndex = 0;
  let popupCount = 0;

  // Maximum guard to prevent infinite loops in degenerate cases
  const MAX_SEGMENTS = 5000;

  while (currentMainTime < mainDuration && segments.length < MAX_SEGMENTS) {
    // If next popup target is at or after mainDuration, play until the end
    if (nextPopupMainTarget >= mainDuration) {
      const playLen = mainDuration - currentMainTime;
      if (playLen > 0.0001) {
        segments.push({
          id: `seg-play-${segmentIndex++}`,
          type: 'play',
          outStart: currentOutTime,
          outEnd: currentOutTime + playLen,
          duration: playLen,
          mainOffset: currentMainTime,
          fillerOffset: currentMainTime,
          popupOffset: 0,
        });
        currentOutTime += playLen;
        currentMainTime += playLen;
      }
      break;
    }

    // Play until the next popup trigger
    const playLen = nextPopupMainTarget - currentMainTime;
    if (playLen > 0.0001) {
      segments.push({
        id: `seg-play-${segmentIndex++}`,
        type: 'play',
        outStart: currentOutTime,
        outEnd: currentOutTime + playLen,
        duration: playLen,
        mainOffset: currentMainTime,
        fillerOffset: currentMainTime,
        popupOffset: 0,
      });
      currentOutTime += playLen;
      currentMainTime += playLen;
    }

    // Insert popup segment if Main has not finished
    if (currentMainTime < mainDuration) {
      segments.push({
        id: `seg-popup-${segmentIndex++}`,
        type: 'popup',
        outStart: currentOutTime,
        outEnd: currentOutTime + popupDuration,
        duration: popupDuration,
        mainOffset: currentMainTime,
        fillerOffset: currentMainTime,
        popupOffset: 0,
      });
      currentOutTime += popupDuration;
      popupCount++;

      // Next popup triggers after popupInterval of Main playtime
      nextPopupMainTarget = currentMainTime + popupInterval;
    }
  }

  const totalDuration = segments.length > 0 ? segments[segments.length - 1].outEnd : 0;

  return {
    segments,
    totalDuration,
    mainDuration,
    popupDuration,
    popupCount,
    fillerDuration,
  };
}

/**
 * Calculates exact video positions, opacities, and scales for a given timeline output timestamp.
 */
export function getTimelineStateAt(model: TimelineModel, outTime: number): PlayheadState {
  const clampedTime = Math.max(0, Math.min(outTime, model.totalDuration));

  if (model.segments.length === 0) {
    return {
      outTime: clampedTime,
      segmentIndex: -1,
      currentSegment: null,
      mainTime: 0,
      fillerTime: 0,
      popupTime: 0,
      isPopupActive: false,
      popupOpacity: 0,
      popupScale: 0.9,
    };
  }

  // Find matching segment
  let segIdx = model.segments.findIndex(
    (s) => clampedTime >= s.outStart && clampedTime <= s.outEnd
  );

  if (segIdx === -1) {
    if (clampedTime >= model.totalDuration) {
      segIdx = model.segments.length - 1;
    } else {
      segIdx = 0;
    }
  }

  const seg = model.segments[segIdx];
  const progressInSegment = Math.max(0, clampedTime - seg.outStart);

  if (seg.type === 'play') {
    const rawMain = seg.mainOffset + progressInSegment;
    const mainTime = Math.min(rawMain, model.mainDuration);
    const fillerTime = (seg.fillerOffset + progressInSegment) % model.fillerDuration;

    return {
      outTime: clampedTime,
      segmentIndex: segIdx,
      currentSegment: seg,
      mainTime,
      fillerTime,
      popupTime: 0,
      isPopupActive: false,
      popupOpacity: 0,
      popupScale: 0.9,
    };
  } else {
    // Popup segment: Main and Filler are FROZEN at segment start offsets
    const mainTime = Math.min(seg.mainOffset, model.mainDuration);
    const fillerTime = seg.fillerOffset % model.fillerDuration;
    const popupTime = Math.min(progressInSegment, seg.duration);

    // Fade/scale 0.3s in, 0.3s out
    const transition = Math.min(0.3, seg.duration / 2);
    let opacity = 1;
    if (transition > 0) {
      if (progressInSegment < transition) {
        opacity = progressInSegment / transition;
      } else if (progressInSegment > seg.duration - transition) {
        opacity = Math.max(0, (seg.duration - progressInSegment) / transition);
      }
    }
    // Scale from 0.9 to 1.0 based on opacity
    const scale = 0.9 + 0.1 * opacity;

    return {
      outTime: clampedTime,
      segmentIndex: segIdx,
      currentSegment: seg,
      mainTime,
      fillerTime,
      popupTime,
      isPopupActive: true,
      popupOpacity: Math.min(1, Math.max(0, opacity)),
      popupScale: scale,
    };
  }
}

/**
 * Formats time in mm:ss.ms or mm:ss
 */
export function formatTime(seconds: number, includeMs = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const minStr = mins.toString().padStart(2, '0');
  const secStr = secs.toString().padStart(2, '0');

  if (includeMs) {
    const ms = Math.floor((seconds % 1) * 10);
    return `${minStr}:${secStr}.${ms}`;
  }
  return `${minStr}:${secStr}`;
}

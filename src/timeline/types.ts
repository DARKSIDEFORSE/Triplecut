export type SegmentType = 'play' | 'popup';

export interface TimelineSegment {
  id: string;
  type: SegmentType;
  outStart: number;
  outEnd: number;
  duration: number;
  mainOffset: number; // main time at segment start (frozen during popup)
  fillerOffset: number; // filler accumulated time at segment start (frozen during popup)
  popupOffset: number; // popup time at segment start (0 during popup, 0 during play)
}

export interface TimelineConfig {
  mainDuration: number;
  fillerDuration: number;
  popupDuration: number;
  popupInterval: number; // Interval between popups in Main playback time
  firstDelay: number; // Delay before first popup in Main playback time
}

export interface TimelineModel {
  segments: TimelineSegment[];
  totalDuration: number;
  mainDuration: number;
  popupDuration: number;
  popupCount: number;
  fillerDuration: number;
}

export interface PlayheadState {
  outTime: number;
  segmentIndex: number;
  currentSegment: TimelineSegment | null;
  mainTime: number;
  fillerTime: number;
  popupTime: number;
  isPopupActive: boolean;
  popupOpacity: number;
  popupScale: number;
}

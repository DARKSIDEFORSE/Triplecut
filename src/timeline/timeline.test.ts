import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, getTimelineStateAt, formatTime } from './timeline';

test('buildTimeline correctly calculates total duration, segments and popup count', () => {
  const model = buildTimeline({
    mainDuration: 20,
    fillerDuration: 7,
    popupDuration: 3,
    popupInterval: 5,
    firstDelay: 5,
  });

  // Expected:
  // Play 0..5 (main 0..5)
  // Popup 1 (3s) at out 5..8 (main frozen at 5)
  // Play 5..10 (main 5..10) at out 8..13
  // Popup 2 (3s) at out 13..16 (main frozen at 10)
  // Play 10..15 (main 10..15) at out 16..21
  // Popup 3 (3s) at out 21..24 (main frozen at 15)
  // Play 15..20 (main 15..20) at out 24..29
  // Total duration: 20 + 3 * 3 = 29s
  assert.equal(model.popupCount, 3);
  assert.equal(model.totalDuration, 29);
  assert.equal(model.segments.length, 7);

  // Check segment types in sequence
  assert.equal(model.segments[0].type, 'play');
  assert.equal(model.segments[1].type, 'popup');
  assert.equal(model.segments[2].type, 'play');
  assert.equal(model.segments[3].type, 'popup');
  assert.equal(model.segments[4].type, 'play');
  assert.equal(model.segments[5].type, 'popup');
  assert.equal(model.segments[6].type, 'play');
});

test('buildTimeline handles filler cycle positions modulo fillerDuration', () => {
  const model = buildTimeline({
    mainDuration: 15,
    fillerDuration: 6,
    popupDuration: 2,
    popupInterval: 4,
    firstDelay: 4,
  });

  // At outTime = 2s (inside first play segment):
  // mainTime = 2, fillerTime = 2 % 6 = 2
  const state1 = getTimelineStateAt(model, 2);
  assert.equal(state1.isPopupActive, false);
  assert.equal(state1.mainTime, 2);
  assert.equal(state1.fillerTime, 2);

  // Popup 1 is at out 4..6.
  // During popup at outTime = 5s (middle of popup):
  // Main must be frozen at 4s, Filler frozen at 4 % 6 = 4s, popupTime = 1s
  const state2 = getTimelineStateAt(model, 5);
  assert.equal(state2.isPopupActive, true);
  assert.equal(state2.mainTime, 4);
  assert.equal(state2.fillerTime, 4);
  assert.equal(state2.popupTime, 1);

  // Play segment 2 is at out 6..10 (main 4..8).
  // At outTime = 9s:
  // progress in segment = 3s => mainTime = 4 + 3 = 7s.
  // fillerTime = (4 + 3) % 6 = 7 % 6 = 1s.
  const state3 = getTimelineStateAt(model, 9);
  assert.equal(state3.isPopupActive, false);
  assert.equal(state3.mainTime, 7);
  assert.equal(state3.fillerTime, 1);
});

test('buildTimeline edge case: no popup when popupDuration is 0 or firstDelay exceeds main', () => {
  const modelNoDuration = buildTimeline({
    mainDuration: 30,
    fillerDuration: 10,
    popupDuration: 0,
    popupInterval: 5,
    firstDelay: 5,
  });
  assert.equal(modelNoDuration.popupCount, 0);
  assert.equal(modelNoDuration.totalDuration, 30);
  assert.equal(modelNoDuration.segments.length, 1);
  assert.equal(modelNoDuration.segments[0].type, 'play');

  const modelDelayed = buildTimeline({
    mainDuration: 10,
    fillerDuration: 10,
    popupDuration: 3,
    popupInterval: 5,
    firstDelay: 15,
  });
  assert.equal(modelDelayed.popupCount, 0);
  assert.equal(modelDelayed.totalDuration, 10);
  assert.equal(modelDelayed.segments.length, 1);
});

test('buildTimeline edge case: firstDelay = 0 starts with immediate popup', () => {
  const model = buildTimeline({
    mainDuration: 10,
    fillerDuration: 5,
    popupDuration: 2,
    popupInterval: 5,
    firstDelay: 0,
  });

  // popup at 0..2 (main 0)
  // play at 2..7 (main 0..5)
  // popup at 7..9 (main 5)
  // play at 9..14 (main 5..10)
  // Total = 10 + 2*2 = 14s
  assert.equal(model.segments[0].type, 'popup');
  assert.equal(model.segments[0].outStart, 0);
  assert.equal(model.segments[0].outEnd, 2);
  assert.equal(model.totalDuration, 14);
  assert.equal(model.popupCount, 2);
});

test('formatTime formats minutes and seconds accurately', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(125.4, true), '02:05.4');
});

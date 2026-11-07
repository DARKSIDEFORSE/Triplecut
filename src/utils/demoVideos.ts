/**
 * Generates procedural demo video clips with audio tracks directly in browser
 * so the user can test the full pipeline immediately without having to locate video files.
 */

export interface DemoVideoFile {
  file: File;
  url: string;
  duration: number;
}

export async function createDemoVideo(
  type: 'main' | 'filler' | 'popup',
  durationSec: number,
  onProgress?: (progress: number) => void
): Promise<DemoVideoFile> {
  const canvas = document.createElement('canvas');
  canvas.width = type === 'main' ? 720 : type === 'filler' ? 720 : 640;
  canvas.height = type === 'main' ? 1280 : type === 'filler' ? 1280 : 640;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = Math.round(durationSec * fps);

  // Audio synthesis
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Create an oscillator tone based on type
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(dest);

  if (type === 'main') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  } else if (type === 'filler') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, audioCtx.currentTime); // A2 bass
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  } else {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 chime
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  }
  osc.start();

  // Combine video + audio streams
  const canvasStream = canvas.captureStream(fps);
  const audioTrack = dest.stream.getAudioTracks()[0];
  if (audioTrack) {
    canvasStream.addTrack(audioTrack);
  }

  // Determine supported mimeType
  let mimeType = 'video/webm;codecs=vp8,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      osc.stop();
      audioCtx.close();
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
  });

  recorder.start();

  // Fast rendering loop (accelerated timer for responsive creation)
  const interval = 12; // fast generation
  let frame = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      frame++;
      const t = frame / fps;

      // Draw distinctive content in strict monochrome palette
      if (type === 'main') {
        // Graphite & Dark Steel style
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#050506');
        grad.addColorStop(0.5, '#2B3A3D');
        grad.addColorStop(1, '#4F4D50');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated steel rings
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.45;
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          ctx.arc(cx, cy, 60 * r + Math.sin(t * 3 + r) * 15, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(152, 151, 156, ${0.7 - r * 0.2})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Title and timer
        ctx.fillStyle = '#F2F2F4';
        ctx.font = 'bold 38px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MAIN CONTENT', cx, cy - 80);

        ctx.font = '500 24px -apple-system, sans-serif';
        ctx.fillStyle = '#98979C';
        ctx.fillText(`Таймкод: ${t.toFixed(1)}с / ${durationSec}с`, cx, cy + 130);
      } else if (type === 'filler') {
        // Slate & Graphite with geometric steel road / hatching
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#050506');
        grad.addColorStop(0.5, '#2B3A3D');
        grad.addColorStop(1, '#050506');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Moving perspective road / tunnel lines
        const offset = (t * 200) % 60;
        ctx.strokeStyle = 'rgba(126, 125, 128, 0.4)';
        ctx.lineWidth = 2;
        for (let y = canvas.height * 0.3; y < canvas.height; y += 40) {
          const actualY = y + offset;
          if (actualY < canvas.height) {
            ctx.beginPath();
            ctx.moveTo(0, actualY);
            ctx.lineTo(canvas.width, actualY);
            ctx.stroke();
          }
        }

        // Bouncing silver orb
        const bx = canvas.width / 2 + Math.sin(t * 4) * (canvas.width * 0.3);
        const by = canvas.height * 0.55 + Math.cos(t * 3) * 50;
        ctx.beginPath();
        ctx.arc(bx, by, 32, 0, Math.PI * 2);
        ctx.fillStyle = '#7E7D80';
        ctx.shadowColor = 'rgba(152, 151, 156, 0.5)';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#F2F2F4';
        ctx.font = 'bold 36px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FILLER DYNAMIC', canvas.width / 2, canvas.height * 0.25);
        ctx.font = '22px -apple-system, sans-serif';
        ctx.fillStyle = '#98979C';
        ctx.fillText(`Фоновое зацикливание (${durationSec}с loop)`, canvas.width / 2, canvas.height * 0.85);
      } else {
        // Steel & Graphite popup badge
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#2B3A3D');
        grad.addColorStop(1, '#050506');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pulsing alert ring in steel / silver
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const pulse = 1 + 0.15 * Math.sin(t * 8);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        ctx.fillStyle = 'rgba(126, 125, 128, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#98979C';
        ctx.beginPath();
        ctx.arc(0, 0, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#050506';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('POPUP', 0, -5);

        ctx.restore();

        ctx.font = '600 20px -apple-system, sans-serif';
        ctx.fillStyle = '#F2F2F4';
        ctx.fillText('Пауза контента: Внимание', cx, cy + 150);
      }

      if (onProgress) {
        onProgress(Math.min(100, Math.round((frame / totalFrames) * 100)));
      }

      if (frame >= totalFrames) {
        clearInterval(timer);
        recorder.stop();
        recordingPromise
          .then((blob) => {
            const fileName = `${type}_demo.webm`;
            const file = new File([blob], fileName, { type: blob.type });
            const url = URL.createObjectURL(file);
            resolve({ file, url, duration: durationSec });
          })
          .catch(reject);
      }
    }, interval);
  });
}

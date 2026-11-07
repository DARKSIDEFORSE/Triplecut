import { PlayheadState } from '../timeline/types';

export interface RenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  splitRatio: number; // 0.2 to 0.8: height fraction for Main (top), (1 - splitRatio) for Filler (bottom)
  popupWidthRatio: number; // e.g. 0.6 = 60% of canvas width
  showGridOrGuidelines?: boolean;
}

/**
 * Draws a source image/video/canvas onto a destination rectangle using "cover" crop.
 * Maintains aspect ratio, centers the image, and covers the destination without black bars.
 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || dWidth <= 0 || dHeight <= 0) return;

  const srcRatio = sourceWidth / sourceHeight;
  const dstRatio = dWidth / dHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = sourceWidth;
  let sHeight = sourceHeight;

  if (srcRatio > dstRatio) {
    // Source is wider than destination: crop sides
    sWidth = sourceHeight * dstRatio;
    sx = (sourceWidth - sWidth) / 2;
  } else {
    // Source is taller than destination: crop top/bottom
    sHeight = sourceWidth / dstRatio;
    sy = (sourceHeight - sHeight) / 2;
  }

  ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

/**
 * Draws a stylized placeholder when a video stream/element is not loaded.
 */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number,
  bgColor: string,
  accentColor: string
) {
  ctx.save();
  // Background
  const gradient = ctx.createLinearGradient(dx, dy, dx + dWidth, dy + dHeight);
  gradient.addColorStop(0, bgColor);
  gradient.addColorStop(1, '#0b0f19');
  ctx.fillStyle = gradient;
  ctx.fillRect(dx, dy, dWidth, dHeight);

  // Subtle grid/stripes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = dx; x < dx + dWidth; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, dy);
    ctx.lineTo(x, dy + dHeight);
    ctx.stroke();
  }

  // Accent badge
  const badgeWidth = Math.min(180, dWidth * 0.5);
  const badgeHeight = 36;
  const badgeX = dx + (dWidth - badgeWidth) / 2;
  const badgeY = dy + (dHeight - badgeHeight) / 2 - 12;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 18);
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, dx + dWidth / 2, badgeY + badgeHeight / 2);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '400 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
  ctx.fillText(subtitle, dx + dWidth / 2, badgeY + badgeHeight + 18);

  ctx.restore();
}

/**
 * Composite rendering function used for BOTH live preview and offline WebCodecs export.
 * Renders Main (top), Filler (bottom), and Popup (centered with animation, rounded corners & shadow).
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
  state: PlayheadState,
  mainSource: HTMLVideoElement | HTMLCanvasElement | null,
  fillerSource: HTMLVideoElement | HTMLCanvasElement | null,
  popupSource: HTMLVideoElement | HTMLCanvasElement | null
) {
  const { canvasWidth, canvasHeight, splitRatio, popupWidthRatio } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Calculate split boundaries
  const mainHeight = Math.round(canvasHeight * splitRatio);
  const fillerHeight = canvasHeight - mainHeight;

  // 1. Render MAIN (top half)
  if (
    mainSource &&
    ((mainSource as HTMLVideoElement).videoWidth > 0 || (mainSource as HTMLCanvasElement).width > 0)
  ) {
    const sw = (mainSource as HTMLVideoElement).videoWidth || (mainSource as HTMLCanvasElement).width;
    const sh =
      (mainSource as HTMLVideoElement).videoHeight || (mainSource as HTMLCanvasElement).height;
    drawCoverImage(ctx, mainSource, sw, sh, 0, 0, canvasWidth, mainHeight);
  } else {
    drawPlaceholder(
      ctx,
      'MAIN ВИДЕО',
      'Основной контент (сверху)',
      0,
      0,
      canvasWidth,
      mainHeight,
      '#4F4D50',
      '#98979C'
    );
  }

  // 2. Render FILLER (bottom half)
  if (
    fillerSource &&
    ((fillerSource as HTMLVideoElement).videoWidth > 0 ||
      (fillerSource as HTMLCanvasElement).width > 0)
  ) {
    const sw =
      (fillerSource as HTMLVideoElement).videoWidth || (fillerSource as HTMLCanvasElement).width;
    const sh =
      (fillerSource as HTMLVideoElement).videoHeight || (fillerSource as HTMLCanvasElement).height;
    drawCoverImage(ctx, fillerSource, sw, sh, 0, mainHeight, canvasWidth, fillerHeight);
  } else {
    drawPlaceholder(
      ctx,
      'FILLER ВИДЕО',
      'Динамичный фон (снизу)',
      0,
      mainHeight,
      canvasWidth,
      fillerHeight,
      '#2B3A3D',
      '#7E7D80'
    );
  }

  // Subtle separator line in steel
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, mainHeight);
  ctx.lineTo(canvasWidth, mainHeight);
  ctx.strokeStyle = 'rgba(152, 151, 156, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 3. Render POPUP (centered overlay during pause)
  if (state.isPopupActive && state.popupOpacity > 0.001) {
    const opacity = state.popupOpacity;
    const scale = state.popupScale;

    // Determine popup dimension
    let popupAspect = 16 / 9;
    let sw = 0;
    let sh = 0;
    if (popupSource) {
      sw = (popupSource as HTMLVideoElement).videoWidth || (popupSource as HTMLCanvasElement).width;
      sh =
        (popupSource as HTMLVideoElement).videoHeight || (popupSource as HTMLCanvasElement).height;
      if (sw > 0 && sh > 0) {
        popupAspect = sw / sh;
      }
    }

    const baseWidth = canvasWidth * popupWidthRatio;
    const popupW = Math.round(baseWidth * scale);
    const popupH = Math.round(popupW / popupAspect);

    // Center position
    const px = Math.round((canvasWidth - popupW) / 2);
    const py = Math.round((canvasHeight - popupH) / 2);
    const cornerRadius = Math.max(12, Math.min(28, popupW * 0.06));

    ctx.save();
    ctx.globalAlpha = opacity;

    // Multi-layer drop shadow for Apple Liquid Glass elevation
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 36 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16 * scale;

    // Create path for rounded rectangle
    ctx.beginPath();
    ctx.roundRect(px, py, popupW, popupH, cornerRadius);
    ctx.fillStyle = '#050506';
    ctx.fill();

    // Reset shadow for inner drawing
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Clip to rounded rectangle
    ctx.clip();

    if (popupSource && sw > 0 && sh > 0) {
      drawCoverImage(ctx, popupSource, sw, sh, px, py, popupW, popupH);
    } else {
      drawPlaceholder(
        ctx,
        'POPUP ВИДЕО',
        'Пауза контента',
        px,
        py,
        popupW,
        popupH,
        '#3A393C',
        '#F2F2F4'
      );
    }

    // Glass specular inner border (Liquid Glass 1px gradient stroke in steel & silver)
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = opacity;

    ctx.beginPath();
    ctx.roundRect(px, py, popupW, popupH, cornerRadius);
    const borderGrad = ctx.createLinearGradient(px, py, px + popupW, py + popupH);
    borderGrad.addColorStop(0, 'rgba(242, 242, 244, 0.65)');
    borderGrad.addColorStop(0.5, 'rgba(152, 151, 156, 0.2)');
    borderGrad.addColorStop(1, 'rgba(152, 151, 156, 0.4)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top specular highlight
    ctx.beginPath();
    ctx.roundRect(px + 4, py + 2, popupW - 8, Math.max(4, popupH * 0.15), [
      cornerRadius - 2,
      cornerRadius - 2,
      0,
      0,
    ]);
    const sheenGrad = ctx.createLinearGradient(px, py, px, py + popupH * 0.15);
    sheenGrad.addColorStop(0, 'rgba(242, 242, 244, 0.25)');
    sheenGrad.addColorStop(1, 'rgba(242, 242, 244, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fill();

    ctx.restore();
  }
}

import React, { useEffect, useRef } from 'react';
import { SimulationState, VisualParams } from '../types';
import { STATE_CONFIGS } from './stateMapper';

interface HourglassCanvasProps {
  state?: SimulationState;
  visualParams?: VisualParams;
  score?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
}

interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isLower: boolean;
  settled: boolean;
}

export const HourglassCanvas: React.FC<HourglassCanvasProps> = ({
  state = 'neutral',
  visualParams,
  score = 0.5,
  width = 140,
  height = 200,
  interactive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeParams = visualParams || STATE_CONFIGS[state] || STATE_CONFIGS.neutral;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Logical low-res grid for pixel-art rendering
    const gridW = 70;
    const gridH = 100;

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;

    const cx = Math.floor(gridW / 2); // 35
    const cy = Math.floor(gridH / 2); // 50
    const bulbR = 21;
    const neckW = 4;
    const topBulbY = cy - 20;
    const bottomBulbY = cy + 20;

    // Initialize discrete pixel sand particles
    const particles: PixelParticle[] = [];
    const maxParticles = 110;

    for (let i = 0; i < maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (bulbR * 0.72);
      const px = Math.floor(cx + r * Math.cos(angle));
      const py = Math.floor(topBulbY + (r * 0.65) * Math.sin(angle));

      particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.4 + 0.1,
        color: activeParams.color,
        isLower: false,
        settled: false,
      });
    }

    let animationFrameId: number;
    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Create an offscreen buffer for crisp integer pixel rendering
      const offCanvas = document.createElement('canvas');
      offCanvas.width = gridW;
      offCanvas.height = gridH;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;
      offCtx.imageSmoothingEnabled = false;

      // 1. Draw Dithered Glass Interior (16-bit checkerboard transparency)
      const drawBulbInterior = (centerY: number) => {
        for (let y = centerY - bulbR + 2; y <= centerY + bulbR - 2; y++) {
          const dy = y - centerY;
          const maxDx = Math.floor(Math.sqrt(Math.max(0, bulbR * bulbR - dy * dy)) * 0.85);
          for (let x = cx - maxDx; x <= cx + maxDx; x++) {
            const distFromCenterY = Math.abs(y - cy);
            let allowedX = maxDx;
            if (distFromCenterY < 14) {
              allowedX = Math.floor(neckW / 2 + (distFromCenterY / 14) * (maxDx - neckW / 2));
            }
            if (Math.abs(x - cx) <= allowedX) {
              if ((x + y) % 2 === 0) {
                offCtx.fillStyle = 'rgba(14, 24, 20, 0.45)';
                offCtx.fillRect(x, y, 1, 1);
              }
            }
          }
        }
      };

      drawBulbInterior(topBulbY);
      drawBulbInterior(bottomBulbY);

      // 2. Draw Pixel-Art Glass Contour (Stepped Outline)
      offCtx.fillStyle = '#435360';
      const drawPixelCircleOutline = (centerY: number, isUpper: boolean) => {
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const px = Math.round(cx + bulbR * Math.cos(a));
          const py = Math.round(centerY + bulbR * Math.sin(a) * 0.9);
          
          if (isUpper && py <= cy - 3) {
            offCtx.fillRect(px, py, 1, 1);
          } else if (!isUpper && py >= cy + 3) {
            offCtx.fillRect(px, py, 1, 1);
          }
        }
      };

      drawPixelCircleOutline(topBulbY, true);
      drawPixelCircleOutline(bottomBulbY, false);

      // Neck connection lines
      for (let y = cy - 5; y <= cy + 5; y++) {
        const factor = Math.abs(y - cy) / 5;
        const halfW = Math.round(neckW / 2 + factor * 3);
        offCtx.fillStyle = '#9EADB2';
        offCtx.fillRect(cx - halfW, y, 1, 1);
        offCtx.fillRect(cx + halfW, y, 1, 1);
      }

      // Specular Glass Glints (Stepped White Highlight on upper-left rims)
      offCtx.fillStyle = '#FFFFFF';
      offCtx.fillRect(cx - 14, topBulbY - 11, 2, 2);
      offCtx.fillRect(cx - 12, topBulbY - 13, 2, 1);
      offCtx.fillRect(cx - 10, topBulbY - 14, 3, 1);

      offCtx.fillRect(cx - 14, bottomBulbY - 11, 2, 2);
      offCtx.fillRect(cx - 12, bottomBulbY - 13, 2, 1);
      offCtx.fillRect(cx - 10, bottomBulbY - 14, 3, 1);

      // 3. Draw Ornate Pixel Plates & Pedestals
      // Top Plate
      offCtx.fillStyle = '#171D22';
      offCtx.fillRect(cx - bulbR - 4, cy - 44, (bulbR + 4) * 2, 4);
      offCtx.fillStyle = '#9EADB2';
      offCtx.fillRect(cx - bulbR - 5, cy - 45, (bulbR + 5) * 2, 1);
      offCtx.fillRect(cx - bulbR - 4, cy - 40, (bulbR + 4) * 2, 1);
      // Top Gold Inlay Gem
      offCtx.fillStyle = '#E5B869';
      offCtx.fillRect(cx - 5, cy - 43, 10, 2);
      offCtx.fillStyle = '#FFE082';
      offCtx.fillRect(cx - 2, cy - 43, 4, 1);

      // Bottom Plate
      offCtx.fillStyle = '#171D22';
      offCtx.fillRect(cx - bulbR - 4, cy + 40, (bulbR + 4) * 2, 4);
      offCtx.fillStyle = '#9EADB2';
      offCtx.fillRect(cx - bulbR - 4, cy + 40, (bulbR + 4) * 2, 1);
      offCtx.fillRect(cx - bulbR - 5, cy + 44, (bulbR + 5) * 2, 1);
      // Bottom Gold Inlay Gem
      offCtx.fillStyle = '#E5B869';
      offCtx.fillRect(cx - 5, cy + 41, 10, 2);
      offCtx.fillStyle = '#FFE082';
      offCtx.fillRect(cx - 2, cy + 41, 4, 1);

      // Side Support Pillars (Stepped 2px pixel columns)
      offCtx.fillStyle = '#2A343C';
      offCtx.fillRect(cx - bulbR - 3, cy - 40, 2, 80);
      offCtx.fillRect(cx + bulbR + 2, cy - 40, 2, 80);
      offCtx.fillStyle = '#435360';
      offCtx.fillRect(cx - bulbR - 4, cy - 40, 1, 80);
      offCtx.fillRect(cx + bulbR + 3, cy - 40, 1, 80);

      // 4. Update & Render Sand Particles
      const speedMult = activeParams.sand_speed;
      const isReverse = activeParams.reverse_gravity;
      const isTurbulent = state === 'emotionally_intense';

      particles.forEach((p, idx) => {
        if (isReverse) {
          // Anti-Gravity Float in Deep Moments
          p.vy -= 0.03 * speedMult;
          p.vx += Math.sin(tick * 0.1 + idx) * 0.15;
          p.y += p.vy;
          p.x += p.vx;

          if (p.y < topBulbY - bulbR * 0.6) {
            p.y = bottomBulbY + (Math.random() - 0.5) * 8;
            p.x = cx + (Math.random() - 0.5) * 10;
            p.vy = -0.3;
          }
        } else {
          if (!p.isLower) {
            // Upper Bulb Flow
            const dx = cx - p.x;
            p.vx += dx * 0.02;
            p.vy += 0.05 * speedMult;
            p.vy = Math.min(p.vy, 1.6 * speedMult);

            if (isTurbulent) {
              p.vx += (Math.random() - 0.5) * 0.8;
            }

            p.x += p.vx;
            p.y += p.vy;

            const distFromTop = Math.abs(p.y - topBulbY);
            const maxAllowedX = Math.max(neckW / 2 + 1, Math.floor(Math.sqrt(Math.max(0, bulbR * bulbR - distFromTop * distFromTop)) * 0.8));
            if (Math.abs(p.x - cx) > maxAllowedX) {
              p.x = cx + Math.sign(p.x - cx) * maxAllowedX;
              p.vx *= -0.4;
            }

            if (p.y >= cy) {
              p.isLower = true;
              p.vy = Math.max(1.2 * speedMult, p.vy * 1.2);
            }
          } else {
            // Lower Bulb Accumulation
            p.vy += 0.08 * speedMult;
            p.x += p.vx * 0.7;
            p.y += p.vy;

            const pileBaseY = bottomBulbY + 16;
            const distFromCenter = Math.abs(p.x - cx);
            const pileHeight = Math.max(0, 13 - distFromCenter * 0.7);
            const floorY = pileBaseY - pileHeight;

            if (p.y >= floorY) {
              p.settled = true;
              p.y = floorY;
              p.vx = 0;
              p.vy = 0;

              // Respawn back to top
              if (Math.random() < 0.007 * speedMult) {
                p.isLower = false;
                p.settled = false;
                p.x = cx + (Math.random() - 0.5) * (bulbR * 1.1);
                p.y = topBulbY - 8 + (Math.random() - 0.5) * 5;
                p.vy = Math.random() * 0.3;
                p.vx = (Math.random() - 0.5) * 0.2;
              }
            }
          }
        }

        // Draw discrete sand particle pixel block
        const drawX = Math.round(p.x);
        const drawY = Math.round(p.y);

        offCtx.fillStyle = activeParams.color;
        offCtx.fillRect(drawX, drawY, 2, 2);

        // Shimmer highlight
        if (tick % 2 === 0 && (p.settled || isReverse)) {
          offCtx.fillStyle = '#FFFFFF';
          offCtx.fillRect(drawX, drawY, 1, 1);
        }
      });

      // 5. Constriction Neck Drip Stream
      if (!isReverse && activeParams.sand_speed > 0.05) {
        offCtx.fillStyle = activeParams.color;
        for (let y = cy - 2; y <= bottomBulbY + 5; y += 2) {
          const jitter = (tick + y) % 2 === 0 ? 0 : 1;
          offCtx.fillRect(cx - 1 + jitter, y, 2, 2);
        }
      }

      // 6. Scale up the offscreen pixel buffer onto main canvas
      ctx.drawImage(offCanvas, 0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, visualParams, score, width, height]);

  return (
    <div
      className="relative flex items-center justify-center select-none bg-transparent"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          background: 'transparent',
          imageRendering: 'pixelated',
        }}
        className={`transition-transform duration-200 ${
          interactive ? 'hover:scale-[1.03] cursor-pointer active:scale-95' : ''
        }`}
      />
    </div>
  );
};

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

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  isLower: boolean;
  isFloating: boolean;
  settled: boolean;
}

export const HourglassCanvas: React.FC<HourglassCanvasProps> = ({
  state = 'neutral',
  visualParams,
  score = 0.5,
  width = 240,
  height = 360,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeParams = visualParams || STATE_CONFIGS[state] || STATE_CONFIGS.neutral;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const bulbRadius = width * 0.38;
    const neckWidth = width * 0.08;
    const topBulbY = cy - height * 0.22;
    const bottomBulbY = cy + height * 0.22;

    // Particle pool
    const particles: SandParticle[] = [];
    const maxParticles = 280;

    for (let i = 0; i < maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (bulbRadius * 0.75);
      const px = cx + r * Math.cos(angle);
      const py = topBulbY + (r * 0.7) * Math.sin(angle);
      
      particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.4,
        vy: Math.random() * 0.5 + 0.2,
        radius: Math.random() * 1.6 + 1.2,
        color: activeParams.color,
        alpha: Math.random() * 0.5 + 0.5,
        isLower: false,
        isFloating: false,
        settled: false,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Slytherin Emerald Magical Halo
      const glowColor = activeParams.color;
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, bulbRadius * 1.6);
      glowGrad.addColorStop(0, `${glowColor}${Math.floor(activeParams.glow_intensity * 38).toString(16).padStart(2, '0')}`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Slytherin Polished Silver & Antique Brass Frame
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 209, 204, 0.45)';
      ctx.lineWidth = 3;

      // Top Base Plate (Polished Silver with Dark Obsidian Core)
      ctx.fillStyle = 'rgba(8, 18, 12, 0.95)';
      ctx.beginPath();
      ctx.roundRect(cx - bulbRadius - 12, cy - height * 0.46, (bulbRadius + 12) * 2, 11, 5);
      ctx.fill();
      ctx.stroke();

      // Top Plate Trim
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - bulbRadius - 8, cy - height * 0.46 + 5);
      ctx.lineTo(cx + bulbRadius + 8, cy - height * 0.46 + 5);
      ctx.stroke();

      // Bottom Base Plate
      ctx.strokeStyle = 'rgba(200, 209, 204, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - bulbRadius - 12, cy + height * 0.43, (bulbRadius + 12) * 2, 11, 5);
      ctx.fill();
      ctx.stroke();

      // Bottom Plate Trim
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - bulbRadius - 8, cy + height * 0.43 + 6);
      ctx.lineTo(cx + bulbRadius + 8, cy + height * 0.43 + 6);
      ctx.stroke();

      // Side Serpentine Silver Pillars
      ctx.strokeStyle = 'rgba(200, 209, 204, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - bulbRadius - 7, cy - height * 0.44);
      ctx.lineTo(cx - bulbRadius - 7, cy + height * 0.42);
      ctx.moveTo(cx + bulbRadius + 7, cy - height * 0.44);
      ctx.lineTo(cx + bulbRadius + 7, cy + height * 0.42);
      ctx.stroke();

      // 3. Hourglass Glass Bulbs Path
      ctx.beginPath();
      // Upper chamber
      ctx.moveTo(cx - neckWidth / 2, cy);
      ctx.bezierCurveTo(cx - bulbRadius * 0.9, cy - height * 0.1, cx - bulbRadius, topBulbY - bulbRadius * 0.5, cx, topBulbY - bulbRadius * 0.7);
      ctx.bezierCurveTo(cx + bulbRadius, topBulbY - bulbRadius * 0.5, cx + bulbRadius * 0.9, cy - height * 0.1, cx + neckWidth / 2, cy);
      // Lower chamber
      ctx.bezierCurveTo(cx + bulbRadius * 0.9, cy + height * 0.1, cx + bulbRadius, bottomBulbY + bulbRadius * 0.5, cx, bottomBulbY + bulbRadius * 0.7);
      ctx.bezierCurveTo(cx - bulbRadius, bottomBulbY + bulbRadius * 0.5, cx - bulbRadius * 0.9, cy + height * 0.1, cx - neckWidth / 2, cy);
      ctx.closePath();

      // Glass fill (Deep emerald obsidian tint)
      ctx.fillStyle = 'rgba(8, 22, 15, 0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 209, 204, 0.25)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Glass Reflections
      ctx.beginPath();
      ctx.arc(cx - bulbRadius * 0.45, topBulbY, bulbRadius * 0.3, Math.PI * 0.8, Math.PI * 1.3);
      ctx.strokeStyle = 'rgba(232, 236, 233, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx - bulbRadius * 0.45, bottomBulbY, bulbRadius * 0.3, Math.PI * 0.8, Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();

      // 4. Update & Draw Particles
      const speedMult = activeParams.sand_speed;
      const isReverse = activeParams.reverse_gravity;
      const isTurbulent = state === 'emotionally_intense';

      particles.forEach((p, idx) => {
        if (isReverse) {
          p.vy -= 0.05 * speedMult;
          p.vx += (Math.sin(time * 3 + idx) * 0.2);
          p.y += p.vy;
          p.x += p.vx;

          if (p.y < topBulbY - bulbRadius * 0.5) {
            p.y = bottomBulbY + (Math.random() - 0.5) * 20;
            p.x = cx + (Math.random() - 0.5) * bulbRadius * 0.5;
            p.vy = -0.5;
          }
        } else {
          if (!p.isLower) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            p.vx += dx * 0.015;
            p.vy += 0.08 * speedMult;
            p.vy = Math.min(p.vy, 2.5 * speedMult);

            if (isTurbulent) {
              p.vx += (Math.random() - 0.5) * 1.2;
            }

            p.x += p.vx;
            p.y += p.vy;

            const distFromTop = Math.abs(p.y - topBulbY);
            const maxAllowedWidth = bulbRadius * (1.0 - (p.y - (topBulbY - bulbRadius * 0.4)) / (cy - topBulbY + bulbRadius * 0.4));
            if (Math.abs(p.x - cx) > Math.max(neckWidth * 0.6, maxAllowedWidth)) {
              p.x = cx + Math.sign(p.x - cx) * Math.max(neckWidth * 0.6, maxAllowedWidth);
              p.vx *= -0.5;
            }

            if (p.y >= cy) {
              p.isLower = true;
              p.vy = Math.max(2.0 * speedMult, p.vy * 1.2);
            }
          } else {
            p.vy += 0.12 * speedMult;
            p.x += p.vx * 0.8;
            p.y += p.vy;

            const pileBaseY = bottomBulbY + bulbRadius * 0.5;
            const distFromCenter = Math.abs(p.x - cx);
            const pileHeight = Math.max(0, (bulbRadius * 0.6 - distFromCenter * 0.6));
            const currentFloor = pileBaseY - pileHeight * 0.6;

            if (p.y >= currentFloor) {
              p.settled = true;
              p.y = currentFloor + (Math.random() - 0.5) * 2;
              p.vx = (Math.random() - 0.5) * 0.1;
              p.vy = 0;

              if (Math.random() < 0.008 * speedMult) {
                p.isLower = false;
                p.settled = false;
                p.x = cx + (Math.random() - 0.5) * (bulbRadius * 0.8);
                p.y = topBulbY - bulbRadius * 0.3 + (Math.random() - 0.5) * 10;
                p.vy = Math.random() * 0.4;
                p.vx = (Math.random() - 0.5) * 0.3;
              }
            }
          }
        }

        ctx.save();
        ctx.fillStyle = activeParams.color;
        ctx.shadowColor = activeParams.color;
        ctx.shadowBlur = isReverse ? 9 : 5;
        ctx.globalAlpha = p.alpha * (activeParams.glow_intensity > 0.7 ? 1.0 : 0.85);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (isReverse ? 1.3 : 1.0), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. Constriction Neck Stream Beam
      if (!isReverse && activeParams.sand_speed > 0.05) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(cx, cy - 10, cx, bottomBulbY);
        beamGrad.addColorStop(0, `${activeParams.color}99`);
        beamGrad.addColorStop(0.5, `${activeParams.color}55`);
        beamGrad.addColorStop(1, `${activeParams.color}00`);
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 1.5, cy);
        ctx.lineTo(cx + 1.5, cy);
        ctx.lineTo(cx + 4, bottomBulbY + 10);
        ctx.lineTo(cx - 4, bottomBulbY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, visualParams, score, width, height]);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width, height }}>
      <div
        className="glow-halo"
        style={{
          width: width * 0.85,
          height: height * 0.85,
          backgroundColor: activeParams.color,
          opacity: activeParams.glow_intensity * 0.45,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className={`relative z-10 transition-transform duration-700 ${
          interactive ? 'hover:scale-[1.02] cursor-pointer' : ''
        }`}
      />
    </div>
  );
};

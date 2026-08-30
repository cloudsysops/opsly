'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
};

const PARTICLE_COUNT = 42;

export function CyberParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasRefValue = canvasRef.current;
    if (!canvasRefValue) {
      return;
    }
    const ctxRefValue = canvasRefValue.getContext('2d');
    if (!ctxRefValue) {
      return;
    }
    const canvas = canvasRefValue;
    const ctx = ctxRefValue;

    let animationFrame = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: Math.random() * 0.45 + 0.1,
      size: Math.random() * 1.8 + 0.8,
    }));

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    function step() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height + 8) {
          p.y = -8;
          p.x = Math.random() * width;
        }
        if (p.x < -8) {
          p.x = width + 8;
        }
        if (p.x > width + 8) {
          p.x = -8;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.45)';
        ctx.shadowColor = 'rgba(157, 0, 255, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      animationFrame = window.requestAnimationFrame(step);
    }

    resize();
    step();
    window.addEventListener('resize', resize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 opacity-50" aria-hidden />;
}

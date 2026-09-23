import React, { useEffect, useRef } from 'react';

/**
 * ClickAnimation Component
 * Renders an organic, liquid gooey particle burst wherever the user clicks or taps throughout the webapp.
 * Uses high-performance CSS hardware acceleration and an SVG gooey filter for true fluid physics.
 */
export default function ClickAnimation() {
  const containerRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colors = [
      '#e11d48', // rose-600
      '#f43f6e', // rose-500
      '#fb718e', // rose-400
      '#fda4af', // rose-300
      '#ffffff', // pure white shimmer
      '#ffe4e6', // soft pastel rose
    ];

    const triggerGooeyBurst = (x, y) => {
      // Throttle rapid clicks to 40ms to maintain 120 FPS
      const now = performance.now();
      if (now - lastClickTimeRef.current < 40) return;
      lastClickTimeRef.current = now;

      const cluster = document.createElement('div');
      cluster.className = 'absolute pointer-events-none';
      cluster.style.left = `${x}px`;
      cluster.style.top = `${y}px`;

      // 1. Central Gooey Ripple Splash
      const core = document.createElement('div');
      core.className = 'click-gooey-core';
      core.style.backgroundColor = colors[Math.floor(Math.random() * 3)];
      cluster.appendChild(core);

      // 2. Liquid Droplets Burst
      const particleCount = 12;
      const noise = (n = 1) => n / 2 - Math.random() * n;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + noise(0.5);
        const distance = 28 + Math.random() * 26;
        const duration = 460 + Math.random() * 160;
        const size = 7 + Math.random() * 6;
        const color = colors[i % colors.length];

        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;

        const particle = document.createElement('span');
        particle.className = 'click-gooey-particle';
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.marginLeft = `${-size / 2}px`;
        particle.style.marginTop = `${-size / 2}px`;
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 10px ${color}80`;
        particle.style.setProperty('--end-x', `${endX}px`);
        particle.style.setProperty('--end-y', `${endY}px`);
        particle.style.setProperty('--time', `${duration}ms`);

        cluster.appendChild(particle);
      }

      container.appendChild(cluster);

      // Clean up cluster after animation completes
      setTimeout(() => {
        try {
          if (cluster.parentNode === container) {
            container.removeChild(cluster);
          }
        } catch {
          // ignore cleanup errors if unmounted
        }
      }, 700);
    };

    const handlePointerDown = (e) => {
      // Don't animate if clicking within text inputs where user is typing
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      triggerGooeyBurst(e.clientX, e.clientY);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <>
      {/* Inline styles for Gooey Burst & Liquid Physics */}
      <style>
        {`
          @keyframes click-core-burst {
            0% {
              transform: scale(0.3);
              opacity: 0.95;
            }
            40% {
              transform: scale(1.3);
              opacity: 0.8;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }

          @keyframes click-droplet-burst {
            0% {
              transform: translate(0px, 0px) scale(0.6);
              opacity: 1;
              animation-timing-function: cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            65% {
              transform: translate(var(--end-x, 20px), var(--end-y, 20px)) scale(1.1);
              opacity: 0.9;
            }
            100% {
              transform: translate(calc(var(--end-x, 20px) * 1.25), calc(var(--end-y, 20px) * 1.25)) scale(0);
              opacity: 0;
            }
          }

          .click-gooey-core {
            position: absolute;
            width: 18px;
            height: 18px;
            margin-left: -9px;
            margin-top: -9px;
            border-radius: 9999px;
            animation: click-core-burst 450ms ease-out 1 forwards;
            pointer-events: none;
            box-shadow: 0 0 12px rgba(244, 63, 94, 0.45);
          }

          .click-gooey-particle {
            position: absolute;
            border-radius: 9999px;
            pointer-events: none;
            animation: click-droplet-burst var(--time, 500ms) ease-out 1 forwards;
          }

          .click-gooey-layer {
            filter: url(#global-click-gooey);
          }
        `}
      </style>

      {/* SVG Gooey Matrix Filter for Liquid Particle Coalescing */}
      <svg className="hidden pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="global-click-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Full-screen Layer for Liquid Gooey Particles */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden click-gooey-layer"
        aria-hidden="true"
      />
    </>
  );
}

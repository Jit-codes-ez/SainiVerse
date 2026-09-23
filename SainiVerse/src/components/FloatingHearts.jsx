import React, { useEffect, useRef } from 'react';

/**
 * FloatingHearts Component
 * Renders smooth, translucent red/pink hearts drifting gently upward in the background.
 * Uses HTML5 Canvas with pointer-events-none to ensure non-intrusive user interactions.
 */
export default function FloatingHearts() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Heart palette: warm translucent reds, soft blushes, and gentle roses
    const colors = [
      'rgba(244, 63, 110, ',   // rose-500
      'rgba(251, 113, 142, ',  // rose-400
      'rgba(225, 29, 88, ',    // rose-600
      'rgba(253, 164, 180, ',  // rose-300
      'rgba(240, 98, 146, ',   // pink-400
    ];

    // Initialize floating heart particles
    const particleCount = Math.min(32, Math.floor(window.innerWidth / 40));
    const hearts = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 18 + 14, // 14px - 32px
      speed: Math.random() * 0.75 + 0.35, // Gentle float upward
      opacity: Math.random() * 0.3 + 0.15, // Soft translucency
      swayAmp: Math.random() * 25 + 10,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayOffset: Math.random() * Math.PI * 2,
      baseColor: colors[Math.floor(Math.random() * colors.length)],
      rotation: (Math.random() - 0.5) * 0.3,
    }));

    // Draw a vector heart on the canvas
    function drawHeart(c, x, y, size, color, opacity, rotation) {
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.beginPath();

      const topCurveHeight = size * 0.3;
      c.moveTo(0, topCurveHeight);

      // Top-left curve
      c.bezierCurveTo(
        -size / 2,
        -topCurveHeight,
        -size,
        size / 3,
        0,
        size
      );

      // Top-right curve
      c.bezierCurveTo(
        size,
        size / 3,
        size / 2,
        -topCurveHeight,
        0,
        topCurveHeight
      );

      c.closePath();
      c.fillStyle = `${color}${opacity})`;
      c.fill();
      c.restore();
    }

    let time = 0;

    // Render loop
    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      hearts.forEach((heart) => {
        // Move upward
        heart.y -= heart.speed;

        // Gentle sinusoidal horizontal sway
        const sway = Math.sin(time * heart.swaySpeed + heart.swayOffset) * 0.6;
        const currentX = heart.x + sway * heart.swayAmp;

        drawHeart(
          ctx,
          currentX,
          heart.y,
          heart.size,
          heart.baseColor,
          heart.opacity,
          heart.rotation + Math.sin(time * 0.01 + heart.swayOffset) * 0.08
        );

        // Reset heart to bottom when it drifts out of view
        if (heart.y < -heart.size * 2) {
          heart.y = height + heart.size + Math.random() * 40;
          heart.x = Math.random() * width;
          heart.speed = Math.random() * 0.75 + 0.35;
          heart.opacity = Math.random() * 0.3 + 0.15;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}

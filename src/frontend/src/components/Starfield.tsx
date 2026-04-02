import { useEffect, useRef } from "react";
import type { FC } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  cyan: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  angle: number;
  speed: number;
  progress: number;
  active: boolean;
  opacity: number;
}

interface OrionStar {
  x: number;
  y: number;
  fadeIn: number; // 0-1
}

interface StarfieldProps {
  className?: string;
  starColor?: string;
  starsEnabled?: boolean;
  starsOpacity?: number;
  shootingStarsEnabled?: boolean;
  shootingStarsOpacity?: number;
  orionBeltEnabled?: boolean;
  orionBeltOpacity?: number;
}

const Starfield: FC<StarfieldProps> = ({
  className = "",
  starColor = "rgba(255,255,255,0.8)",
  starsEnabled = true,
  starsOpacity = 0.8,
  shootingStarsEnabled = true,
  shootingStarsOpacity = 0.9,
  orionBeltEnabled = true,
  orionBeltOpacity = 0.7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const shootingRef = useRef<ShootingStar>({
    x: 0,
    y: 0,
    length: 120,
    angle: Math.PI / 6,
    speed: 8,
    progress: 0,
    active: false,
    opacity: 0,
  });
  const orionRef = useRef<OrionStar[]>([]);
  const orionActiveRef = useRef(false);
  const orionFadeRef = useRef(0);
  const lastShootingRef = useRef(0);
  const lastOrionRef = useRef(0);

  // Track props in refs to avoid effect restarts
  const propsRef = useRef({
    starColor,
    starsEnabled,
    starsOpacity,
    shootingStarsEnabled,
    shootingStarsOpacity,
    orionBeltEnabled,
    orionBeltOpacity,
  });
  propsRef.current = {
    starColor,
    starsEnabled,
    starsOpacity,
    shootingStarsEnabled,
    shootingStarsOpacity,
    orionBeltEnabled,
    orionBeltOpacity,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      starsRef.current = Array.from({ length: 160 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        cyan: Math.random() < 0.15,
      }));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let t = 0;
    const draw = () => {
      const p = propsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const now = Date.now();

      ctx.fillStyle = "#070A12";
      ctx.fillRect(0, 0, w, h);
      t += 1;

      // Stars
      if (p.starsEnabled) {
        for (const star of starsRef.current) {
          const twinkle =
            0.6 + 0.4 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
          const opacity = star.opacity * twinkle * p.starsOpacity;

          // Parse star color and apply opacity
          const baseColor = p.starColor;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          if (star.cyan) {
            ctx.fillStyle = `rgba(158,220,255,${opacity})`;
          } else {
            // Extract rgb from starColor if possible, otherwise use white
            ctx.fillStyle = baseColor.startsWith("rgba")
              ? baseColor.replace(/,[^,]+\)$/, `,${opacity})`)
              : `rgba(255,255,255,${opacity})`;
          }
          ctx.fill();
        }
      }

      // Shooting star — every 8s
      if (p.shootingStarsEnabled) {
        const ss = shootingRef.current;
        if (!ss.active && now - lastShootingRef.current > 8000) {
          ss.x = Math.random() * w * 0.7;
          ss.y = Math.random() * h * 0.4;
          ss.length = 100 + Math.random() * 80;
          ss.angle = Math.PI / 5 + Math.random() * 0.3;
          ss.speed = 12 + Math.random() * 8;
          ss.progress = 0;
          ss.active = true;
          ss.opacity = p.shootingStarsOpacity;
          lastShootingRef.current = now;
        }
        if (ss.active) {
          ss.progress += ss.speed;
          const headX = ss.x + Math.cos(ss.angle) * ss.progress;
          const headY = ss.y + Math.sin(ss.angle) * ss.progress;
          const tailX = headX - Math.cos(ss.angle) * ss.length;
          const tailY = headY - Math.sin(ss.angle) * ss.length;

          const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(1, `rgba(255,255,255,${ss.opacity})`);

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (headX > w || headY > h || ss.progress > w) {
            ss.active = false;
          }
        }
      }

      // Orion Belt — every 30s
      if (p.orionBeltEnabled) {
        if (!orionActiveRef.current && now - lastOrionRef.current > 30000) {
          // Place 3 stars in a diagonal belt pattern
          const cx = w * (0.3 + Math.random() * 0.4);
          const cy = h * (0.3 + Math.random() * 0.4);
          orionRef.current = [
            { x: cx - 30, y: cy + 14, fadeIn: 0 },
            { x: cx, y: cy, fadeIn: 0 },
            { x: cx + 30, y: cy - 14, fadeIn: 0 },
          ];
          orionActiveRef.current = true;
          orionFadeRef.current = 0;
          lastOrionRef.current = now;
        }
        if (orionActiveRef.current) {
          orionFadeRef.current = Math.min(1, orionFadeRef.current + 0.01);
          for (const os of orionRef.current) {
            os.fadeIn = Math.min(1, os.fadeIn + 0.012);
            const alpha = os.fadeIn * p.orionBeltOpacity;
            ctx.beginPath();
            ctx.arc(os.x, os.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,230,255,${alpha})`;
            ctx.fill();
            // Glow
            ctx.beginPath();
            ctx.arc(os.x, os.y, 6, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(os.x, os.y, 0, os.x, os.y, 6);
            glow.addColorStop(0, `rgba(200,230,255,${alpha * 0.3})`);
            glow.addColorStop(1, "rgba(200,230,255,0)");
            ctx.fillStyle = glow;
            ctx.fill();
          }
          // Keep visible for 10s after full fade-in
          if (orionFadeRef.current >= 1 && now - lastOrionRef.current > 12000) {
            orionActiveRef.current = false;
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
};

export default Starfield;

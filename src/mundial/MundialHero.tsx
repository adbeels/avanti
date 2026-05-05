import { useEffect, useRef } from 'react';
import { Star, ChevronDown } from 'lucide-react';

interface MundialHeroProps {
  name: string;
}

export default function MundialHero({ name }: MundialHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }[] = [];
    const colors = ['#f59e0b', '#fbbf24', '#d97706', '#ffffff'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.22),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_100%,rgba(0,0,0,0.9),transparent)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" />

      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-5 py-2 text-amber-400 text-sm font-semibold tracking-widest uppercase animate-pulse">
            <Star size={12} fill="currentColor" />
            Mundial 2026
            <Star size={12} fill="currentColor" />
          </div>
        </div>

        <div className="mb-8">
          <img
            src="/panini_logo.png"
            alt="Panini"
            className="w-56 md:w-72 mx-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]"
          />
        </div>

        {name ? (
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            {name},<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
              completa tu álbum
            </span>
          </h1>
        ) : (
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            Estampas y álbumes<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
              del Mundial 2026
            </span>
          </h1>
        )}

        <p className="text-xl md:text-2xl text-white/80 font-semibold max-w-2xl mx-auto mb-4">
          Avanti es tu distribuidor oficial de estampas y álbumes Panini para el Mundial 2026.
        </p>
        <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto mb-12">
          Conviértete en distribuidor autorizado por nosotros, adquiere y vende producto oficial del mundial con un margen competitivo y aprovecha de este mundial el crecimiento que tu negocio necesita!
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-14">
          {[
            { emoji: '📒', label: 'Venta a mayoristas' },
            { emoji: '✨', label: 'Ventas a retail y canal moderno' },
            { emoji: '🚚', label: 'Distribución en México' },
          ].map(({ emoji, label }) => (
            <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-gray-300 text-sm font-medium">
              <span>{emoji}</span>
              {label}
            </div>
          ))}
        </div>

        <a
          href="#fichar"
          className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] hover:scale-105 transition-all duration-300 uppercase tracking-wider"
        >
          <Star size={18} fill="currentColor" />
          Quiero mi estampa dorada
        </a>

        <div className="mt-16 flex justify-center animate-bounce">
          <ChevronDown size={24} className="text-amber-500/50" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/95 dark:bg-black/95 backdrop-blur-sm shadow-lg shadow-amber-900/10' : 'bg-transparent'
    }`}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => scrollToSection('inicio')} className="flex items-center gap-3 group">
            <img
              key={theme}
              src={theme === 'dark' ? '/avantiW.png' : '/avantiN.png'}
              alt="AVANTI"
              className="h-12 w-auto transition-transform group-hover:scale-105"
            />
           </button>

          <button
            className="md:hidden text-amber-600 dark:text-amber-400"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('inicio')} className="text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Inicio</button>
            <button onClick={() => window.scrollTo({ top: document.getElementById('inicio')?.offsetTop ? document.getElementById('inicio')!.offsetTop + window.innerHeight : 800, behavior: 'smooth' })} className="text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Nosotros</button>
            <button onClick={() => scrollToSection('marcas')} className="text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Marcas</button>
            <button onClick={() => scrollToSection('mundial')} className="text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Mundial 2026</button>
            <button onClick={() => scrollToSection('contacto')} className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-600/50 transition-all">
              Contacto
            </button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <button onClick={() => scrollToSection('inicio')} className="block w-full text-left text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2">Inicio</button>
            <button onClick={() => { window.scrollTo({ top: document.getElementById('inicio')?.offsetTop ? document.getElementById('inicio')!.offsetTop + window.innerHeight : 800, behavior: 'smooth' }); setIsMenuOpen(false); }} className="block w-full text-left text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2">Nosotros</button>
            <button onClick={() => scrollToSection('marcas')} className="block w-full text-left text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2">Marcas</button>
            <button onClick={() => scrollToSection('mundial')} className="block w-full text-left text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-2">Mundial 2026</button>
            <button onClick={() => scrollToSection('contacto')} className="block w-full text-left bg-gradient-to-r from-amber-400 to-amber-600 text-black px-6 py-3 rounded-lg font-semibold">
              Contacto
            </button>
            <div className="flex justify-center pt-4">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

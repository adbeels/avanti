import Header from './components/Header';
import Hero from './components/Hero';
import MissionVision from './components/MissionVision';
import Brands from './components/Brands';
import Mundial from './components/Mundial';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminApp from './admin/AdminApp';
import MundialLanding from './mundial/MundialLanding';
import UnsubscribePage from './components/UnsubscribePage';
import OrderPage from './pedido/OrderPage';
import { useTheme } from './hooks/useTheme';

function App() {
  const { theme, toggleTheme } = useTheme();
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const isAdmin = params.has('admin');
  const isMundial =
    params.has('distribuidor-album-mundial-2026') ||
    pathname === '/distribuidor-album-mundial-2026';
  const isUnsubscribe =
    pathname === '/unsubscribe' ||
    params.has('unsubscribe');
  const isPedido = pathname === '/pedido';

  if (isAdmin) {
    return <AdminApp />;
  }

  if (isUnsubscribe) {
    return <UnsubscribePage />;
  }

  if (isPedido) {
    return <OrderPage />;
  }

  if (isMundial) {
    return <MundialLanding />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white transition-colors duration-300">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero theme={theme} />
        <MissionVision />
        <Brands />
        <Mundial />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;

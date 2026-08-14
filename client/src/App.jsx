import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Background from './components/Background.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CarSelect from './pages/CarSelect.jsx';
import Calendar from './pages/Calendar.jsx';
import SetupDetail from './pages/SetupDetail.jsx';
import Standings from './pages/Standings.jsx';

export default function App() {
  const location = useLocation();
  return (
    <div className="min-h-full flex flex-col">
      <Background />
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CarSelect />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/:car" element={<Calendar />} />
            <Route path="/:car/:track" element={<SetupDetail />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

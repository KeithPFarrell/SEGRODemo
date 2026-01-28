import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { DemoModeProvider } from './contexts/DemoModeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ReportingCycles from './pages/ReportingCycles';
import Exceptions from './pages/Exceptions';
import UL360 from './pages/UL360';
import ActivityLog from './pages/ActivityLog';
import { useStore } from './store';

const basePath = import.meta.env.VITE_BASE_PATH || '/';

// Component to handle redirect to root on refresh
function RedirectOnRefresh({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this is a page refresh (only runs once on mount)
    // If we're not on the root path, redirect to root
    const navigationEntries = window.performance?.getEntriesByType('navigation');
    const isRefresh = navigationEntries && navigationEntries.length > 0
      ? (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload'
      : false;

    if (isRefresh && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return <>{children}</>;
}

function App() {
  const { loadUsers } = useStore();

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <DemoModeProvider>
      <BrowserRouter basename={basePath}>
        <RedirectOnRefresh>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cycles" element={<ReportingCycles />} />
              <Route path="/exceptions" element={<Exceptions />} />
              <Route path="/ul360" element={<UL360 />} />
              <Route path="/activity" element={<ActivityLog />} />
            </Routes>
          </Layout>
        </RedirectOnRefresh>
      </BrowserRouter>
    </DemoModeProvider>
  );
}

export default App;

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DemoModeProvider } from './contexts/DemoModeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ReportingCycles from './pages/ReportingCycles';
import Exceptions from './pages/Exceptions';
import UL360 from './pages/UL360';
import ActivityLog from './pages/ActivityLog';
import { useStore } from './store';

const basePath = import.meta.env.VITE_BASE_PATH || '/';

function App() {
  const { loadUsers } = useStore();

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <DemoModeProvider>
      <BrowserRouter basename={basePath}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cycles" element={<ReportingCycles />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/ul360" element={<UL360 />} />
            <Route path="/activity" element={<ActivityLog />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DemoModeProvider>
  );
}

export default App;

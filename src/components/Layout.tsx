import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListChecks, AlertCircle, FileText, Activity, PlayCircle } from 'lucide-react';
import SegroLogo from './SegroLogo';
import { useStore } from '../store';
import { useDemoMode } from '../contexts/DemoModeContext';
import DemoGuidePanel from './DemoGuidePanel';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Reporting Cycles', path: '/cycles', icon: ListChecks },
  { name: 'Exceptions', path: '/exceptions', icon: AlertCircle },
  { name: 'UL 360', path: '/ul360', icon: FileText },
  { name: 'Activity Log', path: '/activity', icon: Activity },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser, users, setCurrentUser } = useStore();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <div className="min-h-screen bg-segro-offwhite">
      {/* Top Navigation */}
      <nav className="bg-segro-charcoal text-white shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <SegroLogo />
                <div className="hidden md:block">
                  <div className="flex space-x-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-segro-red text-white'
                              : 'text-gray-300 hover:bg-segro-midgray hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Demo Mode Toggle & User Selector */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleDemoMode}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isDemoMode
                      ? 'bg-segro-red text-white shadow-lg ring-2 ring-white ring-offset-2 ring-offset-segro-charcoal'
                      : 'bg-segro-midgray text-gray-300 hover:bg-segro-red hover:text-white'
                  }`}
                  title="Toggle Demo Mode"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span className="hidden lg:inline">Demo Mode</span>
                </button>
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    if (user) setCurrentUser(user);
                  }}
                  className="bg-segro-midgray text-white px-3 py-1.5 rounded-lg text-sm border-none focus:ring-2 focus:ring-segro-red"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-segro-midgray">
          <div className="max-w-7xl mx-auto">
            <div className="flex overflow-x-auto px-2 py-2 space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-segro-red text-white'
                        : 'text-gray-300 hover:bg-segro-midgray'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isDemoMode ? 'mr-96' : ''}`}>
        {children}
      </main>

      {/* Demo Mode Guide Panel */}
      {isDemoMode && <DemoGuidePanel />}
    </div>
  );
}

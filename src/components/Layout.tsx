import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Package,
  FileText,
  Settings,
  Calculator,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

const Layout: React.FC = () => {
  const { currentUser, logout, darkMode, toggleDarkMode } = useStore();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!currentUser) return null;

  return (
    <div
      className={`flex h-screen ${
        darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed md:relative z-40 w-64 h-full shadow-lg ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-8">GRAND BUS</h1>

              <nav className="space-y-8">
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all ${
                      location.pathname === '/'
                        ? `${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          } font-medium`
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <LayoutDashboard className="mr-3" size={20} />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => navigate('/book')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all ${
                      location.pathname.startsWith('/book')
                        ? `${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          } font-medium`
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Ticket className="mr-3" size={20} />
                    <span>Book Ticket</span>
                  </button>

                  <button
                    onClick={() => navigate('/parcel')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all ${
                      location.pathname.startsWith('/parcel')
                        ? `${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          } font-medium`
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Package className="mr-3" size={20} />
                    <span>Book Parcel</span>
                  </button>

                  <button
                    onClick={() => navigate('/manifest')}
                    className={`flex items-center w-full p-3 rounded-lg transition-all ${
                      location.pathname.startsWith('/manifest')
                        ? `${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          } font-medium`
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="mr-3" size={20} />
                    <span>Manifest</span>
                  </button>

                  {currentUser.role === 'admin' && (
                    <>
                      <button
                        onClick={() => navigate('/management')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${
                          location.pathname.startsWith('/management')
                            ? `${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              } font-medium`
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Settings className="mr-3" size={20} />
                        <span>Management</span>
                      </button>

                      <button
                        onClick={() => navigate('/expenses')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${
                          location.pathname.startsWith('/expenses')
                            ? `${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              } font-medium`
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <DollarSign className="mr-3" size={20} />
                        <span>Expenses</span>
                      </button>

                      <button
                        onClick={() => navigate('/reconciliation')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${
                          location.pathname.startsWith('/reconciliation')
                            ? `${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              } font-medium`
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Calculator className="mr-3" size={20} />
                        <span>Reconciliation</span>
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>

            <div className="absolute bottom-0 w-full p-6 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">{currentUser.name}</span>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="mr-3" size={20} />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        className={`flex-1 overflow-auto transition-all ${
          isSidebarOpen ? 'md:ml-0' : ''
        }`}
      >
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import RouteManagement from './RouteManagement';
import BusManagement from './BusManagement';
import StaffManagement from './StaffManagement';
import OfficeManagement from './OfficeManagement';

type ManagementTab = 'routes' | 'buses' | 'staff' | 'offices';

const Management: React.FC = () => {
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<ManagementTab>('routes');
  
  // Redirect non-admin users
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-300">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Management</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Manage routes, buses, staff, and offices
        </p>
      </div>
      
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('routes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'routes'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Routes
          </button>
          
          <button
            onClick={() => setActiveTab('buses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'buses'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Buses
          </button>
          
          <button
            onClick={() => setActiveTab('staff')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'staff'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Staff
          </button>
          
          <button
            onClick={() => setActiveTab('offices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'offices'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Offices
          </button>
        </nav>
      </div>
      
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'routes' && <RouteManagement />}
        {activeTab === 'buses' && <BusManagement />}
        {activeTab === 'staff' && <StaffManagement />}
        {activeTab === 'offices' && <OfficeManagement />}
      </motion.div>
    </div>
  );
};

export default Management;
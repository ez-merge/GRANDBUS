import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, useAddBus, useUpdateBus, useDeleteBus, useBuses } from '../../store';
import { Bus } from '../../types';
import { Plus, X, Edit, Trash, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { supabase } from '../../api';

const BusManagement: React.FC = () => {
  const { darkMode } = useStore();
  const { data: buses } = useBuses();
  const addBusMutation = useAddBus();
  const updateBusMutation = useUpdateBus();
  const deleteBusMutation = useDeleteBus();
  
  const [isAddingBus, setIsAddingBus] = useState(false);
  const [isEditingBus, setIsEditingBus] = useState<string | null>(null);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [staffAssignment, setStaffAssignment] = useState({
    driverName: '',
    driverLicense: '',
    conductorName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: ''
  });
  
  const [newBus, setNewBus] = useState<{
    name: string;
    registrationNumber: string;
    type: '49 seater' | '56 seater' | 'bus cargo';
    image: string;
    routes: string[];
  }>({
    name: '',
    registrationNumber: '',
    type: '49 seater',
    image: '',
    routes: [],
  });
  
  const handleSubmit = async () => {
    if (
      (newBus.name?.trim() || '') === '' || 
      (newBus.registrationNumber?.trim() || '') === '' || 
      (newBus.image?.trim() || '') === ''
    ) {
      return;
    }
    
    try {
      if (isEditingBus) {
        await updateBusMutation.mutateAsync({
          id: isEditingBus,
          bus: newBus
        });
        setIsEditingBus(null);
      } else {
        await addBusMutation.mutateAsync(newBus);
      }
      
      setNewBus({
        name: '',
        registrationNumber: '',
        type: '49 seater',
        image: '',
        routes: [],
      });
      
      setIsAddingBus(false);
    } catch (error) {
      console.error('Error saving bus:', error);
    }
  };
  
  const handleEditBus = (bus: Bus) => {
    setNewBus({
      name: bus.name,
      registrationNumber: bus.registrationNumber,
      type: bus.type,
      image: bus.image,
      routes: bus.routes ? [...bus.routes] : [],
    });
    
    setIsEditingBus(bus.id);
    setIsAddingBus(true);
  };
  
  const handleDeleteBus = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        await deleteBusMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting bus:', error);
      }
    }
  };
  
  const handleCancel = () => {
    setNewBus({
      name: '',
      registrationNumber: '',
      type: '49 seater',
      image: '',
      routes: [],
    });
    
    setIsAddingBus(false);
    setIsEditingBus(null);
  };

  const handleStaffAssignment = async () => {
    if (!selectedBusId) return;

    try {
      const { data: driver } = await supabase
        .from('staff_members')
        .insert({
          name: staffAssignment.driverName,
          role: 'driver',
          license_number: staffAssignment.driverLicense
        })
        .select()
        .single();

      const { data: conductor } = await supabase
        .from('staff_members')
        .insert({
          name: staffAssignment.conductorName,
          role: 'conductor'
        })
        .select()
        .single();

      await supabase
        .from('bus_staff_assignments')
        .insert([
          {
            bus_id: selectedBusId,
            staff_id: driver.id,
            start_date: staffAssignment.startDate,
            end_date: staffAssignment.endDate || null
          },
          {
            bus_id: selectedBusId,
            staff_id: conductor.id,
            start_date: staffAssignment.startDate,
            end_date: staffAssignment.endDate || null
          }
        ]);

      toast.success('Staff assigned successfully');
      setIsAssigningStaff(false);
      setSelectedBusId(null);
      setStaffAssignment({
        driverName: '',
        driverLicense: '',
        conductorName: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: ''
      });
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error('Failed to assign staff');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };
  
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {!isAddingBus ? (
        <motion.div 
          className="flex justify-between items-center"
          variants={itemVariants}
        >
          <h2 className="text-xl font-semibold">Bus Management</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingBus(true)}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Bus</span>
          </motion.button>
        </motion.div>
      ) : (
        <motion.div 
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-md`}
          variants={itemVariants}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">
              {isEditingBus ? 'Edit Bus' : 'Add New Bus'}
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <X size={20} />
            </motion.button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bus Name
                </label>
                <input
                  type="text"
                  value={newBus.name}
                  onChange={(e) => setNewBus(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                  required
                />
              </motion.div>
              
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={newBus.registrationNumber}
                  onChange={(e) => setNewBus(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                  required
                />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bus Type
              </label>
              <select
                value={newBus.type}
                onChange={(e) => setNewBus(prev => ({ ...prev, type: e.target.value as '49 seater' | '56 seater' | 'bus cargo' }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
              >
                <option value="49 seater">49 Seater</option>
                <option value="56 seater">56 Seater</option>
                <option value="bus cargo">Bus Cargo (25 Seats + Cargo Area)</option>
              </select>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bus Image URL
              </label>
              <input
                type="url"
                value={newBus.image}
                onChange={(e) => setNewBus(prev => ({ ...prev, image: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                placeholder="https://example.com/bus-image.jpg"
                required
              />
              
              {newBus.image && (
                <motion.div 
                  className="mt-2 rounded-lg overflow-hidden h-40"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <img 
                    src={newBus.image} 
                    alt="Bus Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL';
                    }}
                  />
                </motion.div>
              )}
            </motion.div>
            
            <motion.div 
              className="flex justify-end space-x-4 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } transition-all duration-200`}
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={(newBus.name?.trim() || '') === '' || (newBus.registrationNumber?.trim() || '') === '' || (newBus.image?.trim() || '') === ''}
                className={`px-4 py-2 rounded-lg ${
                  (newBus.name?.trim() || '') === '' || (newBus.registrationNumber?.trim() || '') === '' || (newBus.image?.trim() || '') === ''
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } transition-all duration-200`}
              >
                {isEditingBus ? 'Update Bus' : 'Add Bus'}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
      >
        {Array.isArray(buses) && buses.map((bus, index) => (
          <motion.div 
            key={bus.id} 
            className={`rounded-xl overflow-hidden shadow-md ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } hover:shadow-lg transition-all duration-300`}
            variants={itemVariants}
            whileHover={{ 
              scale: 1.02,
              boxShadow: darkMode 
                ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
                : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="h-48 overflow-hidden">
              <motion.img 
                src={bus.image} 
                alt={bus.name} 
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{bus.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                    {bus.registrationNumber}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {bus.type}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedBusId(bus.id);
                      setIsAssigningStaff(true);
                    }}
                    className={`p-2 rounded-full ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    } transition-colors duration-200`}
                    title="Assign Staff"
                  >
                    <UserPlus size={18} />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEditBus(bus)}
                    className={`p-2 rounded-full ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    } transition-colors duration-200`}
                  >
                    <Edit size={18} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteBus(bus.id)}
                    className={`p-2 rounded-full ${
                      darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                    } transition-colors duration-200`}
                  >
                    <Trash size={18} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {(!Array.isArray(buses) || buses.length === 0) && !isAddingBus && (
        <motion.div 
          className={`p-8 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-md text-center`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-gray-500 dark:text-gray-400">No buses available</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingBus(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
          >
            Add your first bus
          </motion.button>
        </motion.div>
      )}

      {isAssigningStaff && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={`w-full max-w-md p-6 rounded-lg ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <h3 className="text-lg font-medium mb-4">Assign Staff to Bus</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Driver Name</label>
                <input
                  type="text"
                  value={staffAssignment.driverName}
                  onChange={(e) => setStaffAssignment(prev => ({ ...prev, driverName: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } transition-all duration-200`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Driver License Number</label>
                <input
                  type="text"
                  value={staffAssignment.driverLicense}
                  onChange={(e) => setStaffAssignment(prev => ({ ...prev, driverLicense: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } transition-all duration-200`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Conductor Name</label>
                <input
                  type="text"
                  value={staffAssignment.conductorName}
                  onChange={(e) => setStaffAssignment(prev => ({ ...prev, conductorName: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } transition-all duration-200`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={staffAssignment.startDate}
                  onChange={(e) => setStaffAssignment(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } transition-all duration-200`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={staffAssignment.endDate}
                  onChange={(e) => setStaffAssignment(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } transition-all duration-200`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsAssigningStaff(false);
                  setSelectedBusId(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-200 hover:bg-gray-300'
                } transition-all duration-200`}
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStaffAssignment}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
              >
                Assign Staff
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BusManagement;
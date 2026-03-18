import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { Plus, X, Edit, Trash, Building, MapPin, Phone } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../api';
import type { Office } from '../../types';

const OfficeManagement: React.FC = () => {
  const { darkMode } = useStore();
  const [offices, setOffices] = useState<Office[]>([]);
  const [isAddingOffice, setIsAddingOffice] = useState(false);
  const [isEditingOffice, setIsEditingOffice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [newOffice, setNewOffice] = useState<{
    name: string;
    city: string;
    address: string;
    phone: string;
    is_pickup_point: boolean;
  }>({
    name: '',
    city: '',
    address: '',
    phone: '',
    is_pickup_point: true,
  });

  React.useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('city', { ascending: true });

      if (error) throw error;
      setOffices(data || []);
    } catch (error) {
      console.error('Error fetching offices:', error);
      toast.error('Failed to load offices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newOffice.name.trim() || !newOffice.city.trim() || !newOffice.address.trim() || !newOffice.phone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isEditingOffice) {
        const { error } = await supabase
          .from('offices')
          .update({
            name: newOffice.name,
            city: newOffice.city,
            address: newOffice.address,
            phone: newOffice.phone,
            is_pickup_point: newOffice.is_pickup_point,
          })
          .eq('id', isEditingOffice);

        if (error) throw error;
        toast.success('Office updated successfully');
      } else {
        const { error } = await supabase
          .from('offices')
          .insert({
            name: newOffice.name,
            city: newOffice.city,
            address: newOffice.address,
            phone: newOffice.phone,
            is_pickup_point: newOffice.is_pickup_point,
          });

        if (error) throw error;
        toast.success('Office added successfully');
      }

      setNewOffice({
        name: '',
        city: '',
        address: '',
        phone: '',
        is_pickup_point: true,
      });
      setIsAddingOffice(false);
      setIsEditingOffice(null);
      fetchOffices();
    } catch (error: unknown) {
      console.error('Error saving office:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save office');
    }
  };

  const handleEditOffice = (office: Office) => {
    setNewOffice({
      name: office.name,
      city: office.city,
      address: office.address,
      phone: office.phone,
      is_pickup_point: office.is_pickup_point,
    });
    setIsEditingOffice(office.id);
    setIsAddingOffice(true);
  };

  const handleDeleteOffice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this office? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('offices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Office deleted successfully');
      fetchOffices();
    } catch (error: unknown) {
      console.error('Error deleting office:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete office');
    }
  };

  const handleCancel = () => {
    setNewOffice({
      name: '',
      city: '',
      address: '',
      phone: '',
      is_pickup_point: true,
    });
    setIsAddingOffice(false);
    setIsEditingOffice(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Loading offices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isAddingOffice ? (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Office Management</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingOffice(true)}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Office</span>
          </motion.button>
        </div>
      ) : (
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">
              {isEditingOffice ? 'Edit Office' : 'Add New Office'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Office Name *
                </label>
                <input
                  type="text"
                  value={newOffice.name}
                  onChange={(e) => setNewOffice(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., Nairobi Central Office"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={newOffice.city}
                  onChange={(e) => setNewOffice(prev => ({ ...prev, city: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="e.g., Nairobi"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address *
              </label>
              <textarea
                value={newOffice.address}
                onChange={(e) => setNewOffice(prev => ({ ...prev, address: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                rows={3}
                placeholder="Enter full address"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={newOffice.phone}
                onChange={(e) => setNewOffice(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="+254700000000"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="is_pickup_point"
                type="checkbox"
                checked={newOffice.is_pickup_point}
                onChange={(e) => setNewOffice(prev => ({ ...prev, is_pickup_point: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_pickup_point" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                This office serves as a pickup point for passengers and parcels
              </label>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Cancel
              </button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isEditingOffice ? 'Update Office' : 'Add Office'}
              </motion.button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offices.map((office) => (
          <motion.div 
            key={office.id} 
            className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-md hover:shadow-lg transition-shadow`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-full ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <Building size={24} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium">{office.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {office.city}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditOffice(office)}
                  className={`p-2 rounded-full ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Edit size={18} />
                </button>
                
                <button
                  onClick={() => handleDeleteOffice(office.id)}
                  className={`p-2 rounded-full ${
                    darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                  }`}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <MapPin size={16} className="mr-2" />
                <span>{office.address}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Phone size={16} className="mr-2" />
                <span>{office.phone}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                office.is_pickup_point
                  ? darkMode
                    ? 'bg-green-900 text-green-300'
                    : 'bg-green-100 text-green-800'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {office.is_pickup_point ? 'Pickup Point' : 'Office Only'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {offices.length === 0 && !isAddingOffice && (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <Building size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No offices found</p>
          <button
            onClick={() => setIsAddingOffice(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add your first office
          </button>
        </div>
      )}
    </div>
  );
};

export default OfficeManagement;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, isValid, parseISO } from 'date-fns';
import { useStore, useAddUser, useUsers, useUpdateUser, useDeleteUser } from '../../store';
import { User, Office } from '../../types';
import { Plus, X, Edit, Trash, UserCircle, Building } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../api';

const StaffManagement: React.FC = () => {
  const { darkMode } = useStore();
  const { data: users = [], isLoading } = useUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const addUserMutation = useAddUser();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    role: 'admin' | 'staff';
    password: string;
    office_id: string;
  }>({
    name: '',
    email: '',
    role: 'staff',
    password: '',
    office_id: '',
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
    }
  };
  
  const handleSubmit = () => {
    if (
      newUser.name.trim() === '' || 
      newUser.email.trim() === ''
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check password length for new users
    if (!isEditingUser && newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    // For existing users, only validate password if one is provided
    if (isEditingUser && newUser.password.trim() !== '' && newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (isEditingUser) {
      const updateData: Partial<User> = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        office_id: newUser.office_id || undefined,
      };
      
      // Only include password in update if it was changed and valid
      if (newUser.password.trim() !== '') {
        updateData.password = newUser.password;
      }
      
      updateUserMutation.mutate(
        { id: isEditingUser, userData: updateData },
        {
          onSuccess: () => {
            toast.success('Staff member updated successfully');
            setIsEditingUser(null);
            setIsAddingUser(false);
          },
          onError: (error: any) => {
            toast.error(error.message || 'Failed to update staff member');
          }
        }
      );
    } else {
      addUserMutation.mutate({
        ...newUser,
        office_id: newUser.office_id || undefined,
      }, {
        onSuccess: () => {
          toast.success('Staff member added successfully');
          setIsAddingUser(false);
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to add staff member');
        }
      });
    }
    
    setNewUser({
      name: '',
      email: '',
      role: 'staff',
      password: '',
      office_id: '',
    });
  };
  
  const handleEditUser = (user: User) => {
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '', // Don't show existing password
      office_id: user.office_id || '',
    });
    
    setIsEditingUser(user.id);
    setIsAddingUser(true);
  };
  
  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Staff member deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to delete staff member');
        }
      });
    }
  };
  
  const handleCancel = () => {
    setNewUser({
      name: '',
      email: '',
      role: 'staff',
      password: '',
      office_id: '',
    });
    
    setIsAddingUser(false);
    setIsEditingUser(null);
  };

  const isSubmitDisabled = () => {
    if (newUser.name.trim() === '' || newUser.email.trim() === '') {
      return true;
    }
    
    // For new users, require a valid password
    if (!isEditingUser && (newUser.password.trim() === '' || newUser.password.length < 6)) {
      return true;
    }
    
    // For existing users, if a password is provided, it must be valid
    if (isEditingUser && newUser.password.trim() !== '' && newUser.password.length < 6) {
      return true;
    }
    
    return false;
  };

  const formatLastActive = (lastActive: string | null) => {
    if (!lastActive) return 'Never';
    
    const date = parseISO(lastActive);
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const getOfficeInfo = (officeId: string | undefined) => {
    if (!officeId) return null;
    return offices.find(office => office.id === officeId);
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      {!isAddingUser ? (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Staff Management</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingUser(true)}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Staff</span>
          </motion.button>
        </div>
      ) : (
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">
              {isEditingUser ? 'Edit Staff' : 'Add New Staff'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Office
                </label>
                <select
                  value={newUser.office_id}
                  onChange={(e) => setNewUser(prev => ({ ...prev, office_id: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">No specific office</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name} - {office.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEditingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required={!isEditingUser}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Password must be at least 6 characters long
              </p>
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
                disabled={isSubmitDisabled()}
                className={`px-4 py-2 rounded-lg ${
                  isSubmitDisabled()
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isEditingUser ? 'Update Staff' : 'Add Staff'}
              </motion.button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(users) && users.map((user) => {
          const officeInfo = getOfficeInfo(user.office_id);
          
          return (
            <div 
              key={user.id} 
              className={`p-6 rounded-xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-md`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <UserCircle size={24} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className={`p-2 rounded-full ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Edit size={18} />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className={`p-2 rounded-full ${
                      darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                    }`}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? darkMode
                        ? 'bg-purple-900 text-purple-300'
                        : 'bg-purple-100 text-purple-800'
                      : darkMode
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                </div>

                {officeInfo && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Building size={16} className="mr-2" />
                    <span>{officeInfo.name}, {officeInfo.city}</span>
                  </div>
                )}
                
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Last active: {formatLastActive(user.last_active)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {(!Array.isArray(users) || users.length === 0) && !isAddingUser && (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <p className="text-gray-500 dark:text-gray-400">No staff members available</p>
          <button
            onClick={() => setIsAddingUser(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add your first staff member
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
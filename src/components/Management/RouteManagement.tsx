import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, useRoutes, useBuses, useAddRoute, useUpdateRoute, useDeleteRoute } from '../../store';
import { Route, AssignedBus } from '../../types';
import { Plus, X, Edit, Trash, Clock, DollarSign } from 'lucide-react';

const RouteManagement: React.FC = () => {
  const { darkMode } = useStore();
  const { data: routes = [] } = useRoutes();
  const { data: buses = [] } = useBuses();
  const addRouteMutation = useAddRoute();
  const updateRouteMutation = useUpdateRoute();
  const deleteRouteMutation = useDeleteRoute();
  
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState<string | null>(null);
  
  const [newRoute, setNewRoute] = useState<{
    origin: string;
    destination: string;
    intermediateStops: {
      name: string;
      price: number;
    }[];
    basePrice: number;
    currency: 'KES' | 'UGX';
    assignedBuses: AssignedBus[];
  }>({
    origin: '',
    destination: '',
    intermediateStops: [],
    basePrice: 0,
    currency: 'KES',
    assignedBuses: [],
  });
  
  const [newStop, setNewStop] = useState({ name: '', price: 0 });

  // Helper function to check if a bus is already assigned to another route
  const isBusAssignedToOtherRoute = (busId: string): boolean => {
    return routes.some(route => 
      route.id !== isEditingRoute && 
      route.assignedBuses?.some(bus => bus.id === busId)
    );
  };
  
  const handleAddStop = () => {
    if (newStop.name.trim() === '') return;
    
    setNewRoute(prev => ({
      ...prev,
      intermediateStops: [...prev.intermediateStops, { 
        name: newStop.name.trim(),
        price: newStop.price
      }]
    }));
    
    setNewStop({ name: '', price: 0 });
  };
  
  const handleRemoveStop = (index: number) => {
    setNewRoute(prev => ({
      ...prev,
      intermediateStops: prev.intermediateStops.filter((_, i) => i !== index)
    }));
  };
  
  const handleBusSelection = (busId: string, departureTime: string = '08:00') => {
    setNewRoute(prev => {
      const existingBusIndex = prev.assignedBuses.findIndex(b => b.id === busId);
      
      if (existingBusIndex !== -1) {
        // Remove bus if already assigned
        return {
          ...prev,
          assignedBuses: prev.assignedBuses.filter(b => b.id !== busId)
        };
      } else {
        // Add bus with departure time
        return {
          ...prev,
          assignedBuses: [...prev.assignedBuses, { id: busId, departureTime }]
        };
      }
    });
  };
  
  const handleBusDepartureTimeChange = (busId: string, departureTime: string) => {
    setNewRoute(prev => ({
      ...prev,
      assignedBuses: prev.assignedBuses.map(bus => 
        bus.id === busId ? { ...bus, departureTime } : bus
      )
    }));
  };
  
  const handleSubmit = async () => {
    if (
      newRoute.origin.trim() === '' || 
      newRoute.destination.trim() === '' || 
      newRoute.basePrice <= 0
    ) {
      return;
    }
    
    try {
      if (isEditingRoute) {
        await updateRouteMutation.mutateAsync({
          id: isEditingRoute,
          route: newRoute
        });
        setIsEditingRoute(null);
      } else {
        await addRouteMutation.mutateAsync(newRoute);
      }
      
      setNewRoute({
        origin: '',
        destination: '',
        intermediateStops: [],
        basePrice: 0,
        currency: 'KES',
        assignedBuses: [],
      });
      
      setIsAddingRoute(false);
    } catch (error) {
      console.error('Error saving route:', error);
    }
  };
  
  const handleEditRoute = (route: Route) => {
    setNewRoute({
      origin: route.origin,
      destination: route.destination,
      intermediateStops: [...(route.intermediateStops || [])],
      basePrice: route.basePrice,
      currency: route.currency,
      assignedBuses: [...(route.assignedBuses || [])],
    });
    
    setIsEditingRoute(route.id);
    setIsAddingRoute(true);
  };
  
  const handleDeleteRoute = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await deleteRouteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting route:', error);
      }
    }
  };
  
  const handleCancel = () => {
    setNewRoute({
      origin: '',
      destination: '',
      intermediateStops: [],
      basePrice: 0,
      currency: 'KES',
      assignedBuses: [],
    });
    
    setIsAddingRoute(false);
    setIsEditingRoute(null);
  };
  
  const getBusById = (id: string) => buses.find(bus => bus.id === id);
  
  const getCurrencySymbol = (currency: 'KES' | 'UGX') => {
    return currency === 'KES' ? 'KSh' : 'USh';
  };
  
  return (
    <div className="space-y-6">
      {!isAddingRoute ? (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Route Management</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingRoute(true)}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} className="mr-2" />
            <span>Add Route</span>
          </motion.button>
        </div>
      ) : (
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">
              {isEditingRoute ? 'Edit Route' : 'Add New Route'}
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
                  Origin
                </label>
                <input
                  type="text"
                  value={newRoute.origin}
                  onChange={(e) => setNewRoute(prev => ({ ...prev, origin: e.target.value }))}
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
                  Destination
                </label>
                <input
                  type="text"
                  value={newRoute.destination}
                  onChange={(e) => setNewRoute(prev => ({ ...prev, destination: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Price
                </label>
                <div className="flex items-center">
                  <DollarSign size={20} className="mr-2 text-gray-500" />
                  <input
                    type="number"
                    value={newRoute.basePrice}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                    className={`w-full p-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  value={newRoute.currency}
                  onChange={(e) => setNewRoute(prev => ({ ...prev, currency: e.target.value as 'KES' | 'UGX' }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="KES">Kenyan Shillings (KES)</option>
                  <option value="UGX">Ugandan Shillings (UGX)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Intermediate Stops
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newStop.name}
                  onChange={(e) => setNewStop(prev => ({ ...prev, name: e.target.value }))}
                  className={`flex-1 p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Stop name"
                />
                <input
                  type="number"
                  value={newStop.price}
                  onChange={(e) => setNewStop(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className={`w-32 p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Price"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={handleAddStop}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Stop
                </button>
              </div>
              
              {newRoute.intermediateStops.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {newRoute.intermediateStops.map((stop, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center px-3 py-1 rounded-full text-sm ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <span>{stop.name} ({getCurrencySymbol(newRoute.currency)} {stop.price})</span>
                      <button
                        onClick={() => handleRemoveStop(index)}
                        className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign Buses
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {buses.map((bus) => {
                  const isAssigned = newRoute.assignedBuses.some(b => b.id === bus.id);
                  const assignedBus = newRoute.assignedBuses.find(b => b.id === bus.id);
                  const isAssignedToOtherRoute = isBusAssignedToOtherRoute(bus.id);
                  
                  return (
                    <div 
                      key={bus.id} 
                      className={`p-4 rounded-lg ${
                        isAssignedToOtherRoute && !isAssigned
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      } border-2 ${
                        isAssigned
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20'
                          : `border-gray-200 dark:border-gray-700 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                          }`
                      }`}
                      onClick={() => !isAssignedToOtherRoute && handleBusSelection(bus.id)}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                          <img 
                            src={bus.image} 
                            alt={bus.name} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{bus.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {bus.registrationNumber}
                          </p>
                          {isAssignedToOtherRoute && !isAssigned && (
                            <p className="text-xs text-red-500 mt-1">
                              Already assigned to another route
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isAssigned && (
                        <div className="mt-3">
                          <label className="text-sm text-gray-600 dark:text-gray-300">
                            Departure Time
                          </label>
                          <input
                            type="time"
                            value={assignedBus?.departureTime || '08:00'}
                            onChange={(e) => handleBusDepartureTimeChange(bus.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`mt-1 w-full p-2 rounded-lg border ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {buses.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  No buses available. Please add buses first.
                </p>
              )}
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
                disabled={
                  newRoute.origin.trim() === '' || 
                  newRoute.destination.trim() === '' || 
                  newRoute.basePrice <= 0
                }
                className={`px-4 py-2 rounded-lg ${
                  newRoute.origin.trim() === '' || 
                  newRoute.destination.trim() === '' || 
                  newRoute.basePrice <= 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isEditingRoute ? 'Update Route' : 'Add Route'}
              </motion.button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {routes.map((route) => (
          <div 
            key={route.id} 
            className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-md`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{route.origin} - {route.destination}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Base Price: {getCurrencySymbol(route.currency)} {route.basePrice}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditRoute(route)}
                  className={`p-2 rounded-full ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Edit size={18} />
                </button>
                
                <button
                  onClick={() => handleDeleteRoute(route.id)}
                  className={`p-2 rounded-full ${
                    darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                  }`}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
            
            {route.intermediateStops?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intermediate Stops:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {route.intermediateStops.map((stop, index) => (
                    <div 
                      key={index} 
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {stop.name} ({getCurrencySymbol(route.currency)} {stop.price})
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned Buses:
              </h4>
              
              <div className="space-y-2">
                {(route.assignedBuses || []).map((assignedBus) => {
                  const bus = getBusById(assignedBus.id);
                  if (!bus) return null;
                  
                  return (
                    <div 
                      key={assignedBus.id} 
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full overflow-hidden mr-3">
                          <img 
                            src={bus.image} 
                            alt={bus.name} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="font-medium">{bus.name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock size={16} className="mr-2" />
                        <span>{assignedBus.departureTime}</span>
                      </div>
                    </div>
                  );
                })}
                
                {(!route.assignedBuses || route.assignedBuses.length === 0) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No buses assigned
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {routes.length === 0 && !isAddingRoute && (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <p className="text-gray-500 dark:text-gray-400">No routes available</p>
          <button
            onClick={() => setIsAddingRoute(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add your first route
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;
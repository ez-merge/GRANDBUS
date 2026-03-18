import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, useRoutes } from '../../store';
import { Route } from '../../types';
import { Calendar as CalendarIcon, Bus } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface SelectRouteProps {
  onSelect: (route: Route, origin: string, destination: string, price: number) => void;
}

const SelectRoute: React.FC<SelectRouteProps> = ({ onSelect }) => {
  const { darkMode } = useStore();
  const { data: routes = [], isLoading, error } = useRoutes();
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = React.useState(format(today, 'yyyy-MM-dd'));
  const [selectedOrigin, setSelectedOrigin] = React.useState('');
  const [selectedDestination, setSelectedDestination] = React.useState('');
  const [selectedRoute, setSelectedRoute] = React.useState<Route | null>(null);
  const [calculatedPrice, setCalculatedPrice] = React.useState<number>(0);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setShowCalendar(false);
  };
  
  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setSelectedOrigin(route.origin);
    setSelectedDestination('');
    setCalculatedPrice(0);
  };
  
  const getAvailableDestinations = (route: Route | null) => {
    if (!route) return [];
    
    const destinations = [route.destination];
    if (route.intermediateStops) {
      route.intermediateStops.forEach(stop => {
        destinations.push(stop.name);
      });
    }
    return destinations.filter(dest => dest !== selectedOrigin);
  };

  const calculatePrice = (route: Route, origin: string, destination: string): number => {
    if (!route || !origin || !destination) return 0;

    // If direct route from origin to destination
    if (origin === route.origin && destination === route.destination) {
      return route.basePrice;
    }

    // Find indices of origin and destination in the route
    const stops = [route.origin, ...(route.intermediateStops?.map(stop => stop.name) || []), route.destination];
    const originIndex = stops.indexOf(origin);
    const destinationIndex = stops.indexOf(destination);

    if (originIndex === -1 || destinationIndex === -1) return 0;

    // Calculate price based on intermediate stops
    const price = 0;
    if (originIndex < destinationIndex) {
      // Forward journey
      if (originIndex === 0) {
        // Starting from origin
        if (destinationIndex === stops.length - 1) {
          // Going to final destination
          return route.basePrice;
        } else {
          // Going to intermediate stop
          return route.intermediateStops?.[destinationIndex - 1]?.price || 0;
        }
      } else {
        // Starting from intermediate stop
        if (destinationIndex === stops.length - 1) {
          // Going to final destination
          return route.intermediateStops?.[originIndex - 1]?.price || 0;
        } else {
          // Going between intermediate stops
          const destPrice = route.intermediateStops?.[destinationIndex - 1]?.price || 0;
          const originPrice = route.intermediateStops?.[originIndex - 1]?.price || 0;
          return destPrice - originPrice;
        }
      }
    }
    return price;
  };
  
  const handleDestinationChange = (destination: string) => {
    setSelectedDestination(destination);
    if (selectedRoute) {
      const price = calculatePrice(selectedRoute, selectedOrigin, destination);
      setCalculatedPrice(price);
    }
  };
  
  const handleContinue = () => {
    if (selectedRoute && selectedOrigin && selectedDestination) {
      const routeWithDate = {
        ...selectedRoute,
        selectedDate
      };
      onSelect(routeWithDate, selectedOrigin, selectedDestination, calculatedPrice);
    }
  };

  const getCurrencySymbol = (currency: 'KES' | 'UGX') => {
    switch (currency) {
      case 'KES':
        return 'KES';
      case 'UGX':
        return 'UGX';
      default:
        return currency;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Select Route</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose your journey details
        </p>
      </div>
      
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon size={20} className="text-gray-500 mr-2" />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Travel Date
            </label>
          </div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-blue-600 dark:text-blue-400 text-sm"
          >
            Change Date
          </button>
        </div>
        
        <div className="mt-2 relative">
          <input
            type="text"
            value={format(new Date(selectedDate), 'MMMM d, yyyy')}
            readOnly
            className={`w-full p-2 rounded-lg border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer`}
            onClick={() => setShowCalendar(!showCalendar)}
          />
          
          {showCalendar && (
            <div className="absolute z-10 mt-2 w-full">
              <Calendar
                onChange={handleDateChange}
                value={new Date(selectedDate)}
                minDate={today}
                maxDate={addDays(today, 30)}
                className={darkMode ? 'react-calendar--dark' : ''}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <p className="text-gray-500 dark:text-gray-400">Loading routes...</p>
        </div>
      ) : error ? (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center text-red-500`}>
          <p>Error loading routes. Please try again.</p>
        </div>
      ) : Array.isArray(routes) && routes.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <motion.div
                key={route.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-6 rounded-xl ${
                  selectedRoute?.id === route.id
                    ? 'ring-2 ring-blue-500'
                    : ''
                } ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                } shadow-md cursor-pointer transition-colors`}
                onClick={() => handleRouteSelect(route)}
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
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {route.assignedBuses?.length || 0} buses
                  </div>
                </div>
                
                {route.intermediateStops && route.intermediateStops.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Stops:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {route.intermediateStops.map((stop, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}
                        >
                          {stop.name} ({getCurrencySymbol(route.currency)} {stop.price})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Bus className="w-4 h-4 mr-1" />
                  <span>Select for details</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {selectedRoute && (
            <div className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-md mt-6`}>
              <h3 className="text-lg font-medium mb-4">Journey Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Origin
                  </label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => {
                      setSelectedOrigin(e.target.value);
                      setSelectedDestination('');
                      setCalculatedPrice(0);
                    }}
                    className={`w-full p-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value={selectedRoute.origin}>{selectedRoute.origin}</option>
                    {selectedRoute.intermediateStops?.map((stop, index) => (
                      <option key={index} value={stop.name}>{stop.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Destination
                  </label>
                  <select
                    value={selectedDestination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Select destination</option>
                    {getAvailableDestinations(selectedRoute).map((dest, index) => (
                      <option key={index} value={dest}>{dest}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedDestination && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20">
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    Journey Price: {getCurrencySymbol(selectedRoute.currency)} {calculatedPrice}
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={!selectedDestination}
                  className={`px-6 py-2 rounded-lg ${
                    !selectedDestination
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white font-medium`}
                >
                  Continue
                </motion.button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <p className="text-gray-500 dark:text-gray-400">No routes available</p>
        </div>
      )}
    </div>
  );
};

export default SelectRoute;
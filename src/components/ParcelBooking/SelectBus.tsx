import React from 'react';
import { motion } from 'framer-motion';
import { Bus, Route } from '../../types';
import { useStore } from '../../store';
import { ArrowLeft, Clock, Store } from 'lucide-react';

interface SelectBusProps {
  buses: Bus[];
  route: Route;
  onSelect: (bus: Bus | null, departureTime: string) => void;
  onBack: () => void;
}

const SelectBus: React.FC<SelectBusProps> = ({ buses, route, onSelect, onBack }) => {
  const { darkMode } = useStore();
  
  const handleStoreSelect = () => {
    onSelect(null, '');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className={`mr-4 p-2 rounded-full ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          } transition-colors`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Transport Method</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Choose a bus or store the parcel for later dispatch
          </p>
        </div>
      </div>

      {/* Store/Office Option */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md cursor-pointer mb-8`}
        onClick={handleStoreSelect}
      >
        <div className="flex items-center">
          <Store size={24} className="mr-4" />
          <div>
            <h3 className="text-lg font-medium">Store at Office</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Store the parcel at our office for later dispatch
            </p>
          </div>
        </div>
      </motion.div>
      
      <h3 className="text-lg font-medium mb-4">Or Choose a Bus</h3>
      
      {buses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buses.map((bus) => {
            const assignedBus = route.assignedBuses.find(b => b.id === bus.id);
            if (!assignedBus) return null;

            return (
              <motion.div
                key={bus.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl overflow-hidden shadow-md cursor-pointer ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                onClick={() => onSelect(bus, assignedBus.departureTime)}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={bus.image} 
                    alt={bus.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-medium">{bus.name}</h3>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {bus.type}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {bus.registrationNumber}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-blue-600 dark:text-blue-400">
                    <Clock size={16} className="mr-2" />
                    <span>Departure: {assignedBus.departureTime}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={`p-8 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md text-center`}>
          <p className="text-gray-500 dark:text-gray-400">No buses available for this route</p>
        </div>
      )}
    </div>
  );
};

export default SelectBus;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Passenger } from '../../types';
import { useStore } from '../../store';
import { ArrowLeft } from 'lucide-react';

interface PassengerDetailsProps {
  passengers: Passenger[];
  seats: number[];
  onSubmit: (passengers: Passenger[], paymentMethod: 'cash' | 'mpesa') => void;
  onBack: () => void;
}

const PassengerDetails: React.FC<PassengerDetailsProps> = ({ 
  passengers, 
  seats, 
  onSubmit, 
  onBack 
}) => {
  const { darkMode } = useStore();
  const [updatedPassengers, setUpdatedPassengers] = useState<Passenger[]>(passengers);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [activeTab, setActiveTab] = useState<number>(0);
  
  const handleInputChange = (index: number, field: keyof Passenger, value: string | number) => {
    const newPassengers = [...updatedPassengers];
    newPassengers[index] = {
      ...newPassengers[index],
      [field]: value
    };
    setUpdatedPassengers(newPassengers);
  };
  
  const handleSubmit = () => {
    // Validate all passenger details
    const isValid = updatedPassengers.every(passenger => 
      passenger.firstName.trim() !== '' &&
      passenger.lastName.trim() !== '' &&
      passenger.idNumber.trim() !== '' &&
      passenger.age > 0 &&
      passenger.nationality.trim() !== '' &&
      passenger.phoneNumber.trim() !== ''
    );
    
    if (isValid) {
      onSubmit(updatedPassengers, paymentMethod);
    }
  };
  
  const isFormValid = () => {
    return updatedPassengers.every(passenger => 
      passenger.firstName.trim() !== '' &&
      passenger.lastName.trim() !== '' &&
      passenger.idNumber.trim() !== '' &&
      passenger.age > 0 &&
      passenger.nationality.trim() !== '' &&
      passenger.phoneNumber.trim() !== ''
    );
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
          <h2 className="text-xl font-semibold mb-2">Passenger Details</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Enter details for each passenger
          </p>
        </div>
      </div>
      
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        {/* Tabs for multiple passengers */}
        {updatedPassengers.length > 1 && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            {updatedPassengers.map((_, index) => (
              <button
                key={index}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === index
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(index)}
              >
                Passenger {index + 1} (Seat {seats[index]})
              </button>
            ))}
          </div>
        )}
        
        {/* Passenger form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={updatedPassengers[activeTab].firstName}
                onChange={(e) => handleInputChange(activeTab, 'firstName', e.target.value)}
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
                Last Name
              </label>
              <input
                type="text"
                value={updatedPassengers[activeTab].lastName}
                onChange={(e) => handleInputChange(activeTab, 'lastName', e.target.value)}
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
                ID Number
              </label>
              <input
                type="text"
                value={updatedPassengers[activeTab].idNumber}
                onChange={(e) => handleInputChange(activeTab, 'idNumber', e.target.value)}
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
                Age
              </label>
              <input
                type="number"
                value={updatedPassengers[activeTab].age || ''}
                onChange={(e) => handleInputChange(activeTab, 'age', Number(e.target.value))}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
                min="0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nationality
              </label>
              <input
                type="text"
                value={updatedPassengers[activeTab].nationality}
                onChange={(e) => handleInputChange(activeTab, 'nationality', e.target.value)}
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
                Gender
              </label>
              <select
                value={updatedPassengers[activeTab].gender}
                onChange={(e) => handleInputChange(activeTab, 'gender', e.target.value as 'male' | 'female')}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={updatedPassengers[activeTab].phoneNumber}
              onChange={(e) => handleInputChange(activeTab, 'phoneNumber', e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              required
            />
          </div>
          
          {/* Navigation buttons for multiple passengers */}
          {updatedPassengers.length > 1 && (
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
                disabled={activeTab === 0}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 0
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Previous Passenger
              </button>
              
              <button
                onClick={() => setActiveTab(prev => Math.min(updatedPassengers.length - 1, prev + 1))}
                disabled={activeTab === updatedPassengers.length - 1}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === updatedPassengers.length - 1
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Next Passenger
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Payment method */}
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <h3 className="text-lg font-medium mb-4">Payment Method</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="cash"
              type="radio"
              name="payment"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cash" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cash
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="mpesa"
              type="radio"
              name="payment"
              value="mpesa"
              checked={paymentMethod === 'mpesa'}
              onChange={() => setPaymentMethod('mpesa')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="mpesa" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              M-Pesa
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!isFormValid()}
          className={`py-3 px-6 rounded-lg font-medium text-white ${
            !isFormValid()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } transition-colors`}
        >
          Complete Booking
        </motion.button>
      </div>
    </div>
  );
};

export default PassengerDetails;
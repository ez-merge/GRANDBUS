import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { ArrowLeft, Building } from 'lucide-react';
import { supabase } from '../../api';
import type { Office } from '../../types';

interface ParcelDetailsProps {
  onSubmit: (parcelDetails: any, paymentMethod: 'cash' | 'mpesa', price: number, officeId?: string) => void;
  onBack: () => void;
  currency: string;
}

const ParcelDetails: React.FC<ParcelDetailsProps> = ({ 
  onSubmit, 
  onBack,
  currency
}) => {
  const { darkMode, currentUser } = useStore();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [price, setPrice] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [offices, setOffices] = useState<Office[]>([]);
  
  const [parcelDetails, setParcelDetails] = useState({
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    itemType: '',
    itemName: '',
    weight: '',
    description: ''
  });

  React.useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .eq('is_pickup_point', true)
        .order('city', { ascending: true });

      if (error) throw error;
      setOffices(data || []);

      // Auto-select user's office if they have one
      if (currentUser?.office_id) {
        setSelectedOffice(currentUser.office_id);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };
  
  const handleSubmit = () => {
    // Validate all required fields
    const requiredFields = {
      'Sender Name': parcelDetails.senderName,
      'Sender Phone': parcelDetails.senderPhone,
      'Receiver Name': parcelDetails.receiverName,
      'Receiver Phone': parcelDetails.receiverPhone,
      'Item Type': parcelDetails.itemType,
      'Item Name': parcelDetails.itemName
    };

    const emptyFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([field]) => field);

    if (emptyFields.length > 0) {
      return;
    }

    if (!price || Number(price) <= 0) {
      return;
    }
    
    onSubmit({
      ...parcelDetails,
      weight: parcelDetails.weight ? Number(parcelDetails.weight) : null
    }, paymentMethod, Number(price), selectedOffice || undefined);
  };
  
  const isFormValid = () => {
    return (
      parcelDetails.senderName.trim() !== '' &&
      parcelDetails.senderPhone.trim() !== '' &&
      parcelDetails.receiverName.trim() !== '' &&
      parcelDetails.receiverPhone.trim() !== '' &&
      parcelDetails.itemType.trim() !== '' &&
      parcelDetails.itemName.trim() !== '' &&
      price &&
      Number(price) > 0
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
          <h2 className="text-xl font-semibold mb-2">Parcel Details</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Enter sender and receiver details
          </p>
        </div>
      </div>
      
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <div className="space-y-6">
          {/* Office Selection */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Building className="mr-2" size={20} />
              Storage Location
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Office (Optional)
              </label>
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="">General Storage</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name} - {office.city}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose a specific office to store your parcel, or leave blank for general storage
              </p>
            </div>
          </div>

          {/* Sender Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Sender Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={parcelDetails.senderName}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, senderName: e.target.value }))}
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
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={parcelDetails.senderPhone}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, senderPhone: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Receiver Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Receiver Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={parcelDetails.receiverName}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, receiverName: e.target.value }))}
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
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={parcelDetails.receiverPhone}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, receiverPhone: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Parcel Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Parcel Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Type *
                </label>
                <input
                  type="text"
                  value={parcelDetails.itemType}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, itemType: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  required
                  placeholder="e.g., Electronics, Documents, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={parcelDetails.itemName}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, itemName: e.target.value }))}
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
                  Weight (kg) - Optional
                </label>
                <input
                  type="number"
                  value={parcelDetails.weight}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, weight: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description - Optional
                </label>
                <textarea
                  value={parcelDetails.description}
                  onChange={(e) => setParcelDetails(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          {/* Payment Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Payment Details</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price ({currency}) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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

export default ParcelDetails;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bus, Seat } from '../../types';
import { useStore } from '../../store';
import { ArrowLeft, Lock, Unlock } from 'lucide-react';
import { useLockedSeats, useBookedSeats, useLockSeats, useUnlockSeats } from '../../store';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

interface SelectSeatsProps {
  bus: Bus;
  routeId: string;
  departureDate: string;
  departureTime: string;
  price: number;
  currency: string;
  onSelect: (seatNumbers: number[]) => void;
  onBack: () => void;
}

const SelectSeats: React.FC<SelectSeatsProps> = ({ 
  bus, 
  routeId,
  departureDate,
  departureTime: _departureTime,
  price,
  currency,
  onSelect, 
  onBack 
}) => {
  const { darkMode, currentUser } = useStore();
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState<string>('');
  const [showLockReasonInput, setShowLockReasonInput] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  const { data: lockedSeatsData = { lockedSeats: [], lockedSeatReasons: {}, lockedSeatUsers: {} }, refetch: refetchLockedSeats } = useLockedSeats(bus.id, routeId, departureDate);
  const { data: bookedSeats = [], refetch: refetchBookedSeats } = useBookedSeats(bus.id, routeId, departureDate);
  const { mutateAsync: lockSeats } = useLockSeats();
  const { mutateAsync: unlockSeats } = useUnlockSeats();

  const formatSeatNumber = (num: number): string => {
    if (bus.type === 'bus cargo') {
      // For cargo bus: 2x2 layout for first 20 seats, then 5 seats in back
      if (num <= 20) {
        const row = Math.floor((num - 1) / 2);
        const seatInRow = ((num - 1) % 2) + 1;
        const rowLetter = String.fromCharCode(65 + row);
        return `${rowLetter}${seatInRow}`;
      } else {
        // Back row seats (21-25)
        const backSeatNum = num - 20;
        return `Z${backSeatNum}`;
      }
    } else {
      // Regular bus layout
      const row = Math.floor((num - 1) / 4);
      const seatInRow = ((num - 1) % 4) + 1;
      const rowLetter = String.fromCharCode(65 + row);
      return `${rowLetter}${seatInRow}`;
    }
  };
  
  // Generate seats based on bus type and status
  useEffect(() => {
    if (!bus || !lockedSeatsData) return;

    let totalSeats;
    switch (bus.type) {
      case 'bus cargo':
        totalSeats = 25;
        break;
      case '49 seater':
        totalSeats = 49;
        break;
      case '56 seater':
        totalSeats = 56;
        break;
      default:
        totalSeats = 49;
    }

    const generatedSeats: Seat[] = [];
    
    for (let i = 1; i <= totalSeats; i++) {
      generatedSeats.push({
        id: `seat-${i}`,
        number: i,
        isBooked: bookedSeats.includes(i),
        isLocked: lockedSeatsData.lockedSeats.includes(i),
      });
    }
    
    setSeats(generatedSeats);
  }, [bus, bookedSeats, lockedSeatsData]);

  const handleSeatClick = async (seat: Seat) => {
    if (!seat || seat.isBooked || seat.isLocked) {
      if (seat.isBooked) {
        toast.error(`Seat ${formatSeatNumber(seat.number)} is already booked`);
      } else if (seat.isLocked) {
        const lockedBy = lockedSeatsData.lockedSeatUsers[seat.number] || 'Unknown';
        toast.error(`Seat ${formatSeatNumber(seat.number)} is locked by ${lockedBy}`);
      }
      return;
    }

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats(prev => prev.filter(s => s !== seat.number));
    } else {
      if (selectedSeats.length >= 4) {
        toast.error('You can only select up to 4 seats');
        return;
      }
      setSelectedSeats(prev => [...prev, seat.number]);
    }
  };

  const handleAdminLockToggle = async (seat: Seat) => {
    if (!currentUser?.role === 'admin' || !seat || seat.isBooked) return;

    if (!seat.isLocked) {
      setShowLockReasonInput(seat.number);
    } else {
      try {
        await unlockSeats({
          busId: bus.id,
          routeId: routeId,
          seatNumbers: [seat.number],
          date: departureDate
        });
        toast.success(`Seat ${formatSeatNumber(seat.number)} unlocked successfully`);
        await refetchLockedSeats();
      } catch (error) {
        console.error('Error unlocking seat:', error);
        toast.error('Failed to unlock seat');
      }
    }
  };

  const handleLockReasonSubmit = async (seat: Seat) => {
    if (!lockReason.trim()) {
      toast.error('Please provide a reason for locking the seat');
      return;
    }

    try {
      await lockSeats({
        busId: bus.id,
        routeId: routeId,
        seatNumbers: [seat.number],
        date: departureDate,
        reason: lockReason,
        lockedBy: currentUser?.name || 'Unknown'
      });
      
      // If the seat was selected, deselect it
      if (selectedSeats.includes(seat.number)) {
        setSelectedSeats(prev => prev.filter(s => s !== seat.number));
      }
      
      toast.success(`Seat ${formatSeatNumber(seat.number)} locked successfully`);
      setShowLockReasonInput(null);
      setLockReason('');
      await refetchLockedSeats();
    } catch (error) {
      console.error('Error locking seat:', error);
      toast.error('Failed to lock seat');
    }
  };

  const handleSubmit = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    
    // Check if any selected seat is now booked or locked
    const unavailableSeats = selectedSeats.filter(seatNum => {
      const seat = seats.find(s => s.number === seatNum);
      return seat?.isBooked || seat?.isLocked;
    });
    
    if (unavailableSeats.length > 0) {
      toast.error(`Seats ${unavailableSeats.map(formatSeatNumber).join(', ')} are no longer available`);
      // Refetch to get latest status
      await Promise.all([refetchLockedSeats(), refetchBookedSeats()]);
      return;
    }
    
    // Convert numeric seat numbers to formatted seat codes before passing to onSelect
    const formattedSeats = selectedSeats.map(num => ({
      number: num,
      code: formatSeatNumber(num)
    }));
    
    onSelect(formattedSeats.map(seat => seat.number));
    
    // Invalidate queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['lockedSeats', bus.id, routeId, departureDate] });
    queryClient.invalidateQueries({ queryKey: ['bookedSeats', bus.id, routeId, departureDate] });
  };
  
  const renderSeat = (seat: Seat) => {
    if (!seat) return null;
    
    const isSelected = selectedSeats.includes(seat.number);
    const formattedSeatNumber = formatSeatNumber(seat.number);
    
    let seatColor = 'bg-gray-200 dark:bg-gray-700';
    if (isSelected) {
      seatColor = 'bg-blue-500 text-white';
    } else if (seat.isBooked) {
      seatColor = 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 cursor-not-allowed';
    } else if (seat.isLocked) {
      seatColor = 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    }
    
    return (
      <div className="relative" key={seat.id}>
        {showLockReasonInput === seat.number ? (
          <div className="absolute z-50 -top-20 left-1/2 transform -translate-x-1/2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
            <input
              type="text"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="Enter reason"
              className="w-full p-2 mb-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowLockReasonInput(null);
                  setLockReason('');
                }}
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLockReasonSubmit(seat)}
                className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Lock
              </button>
            </div>
          </div>
        ) : null}
        
        <motion.div
          className={`relative w-12 h-12 rounded-t-lg flex items-center justify-center text-xs ${seatColor} ${
            !seat.isBooked && !seat.isLocked ? 'hover:bg-blue-400 dark:hover:bg-blue-600 cursor-pointer' : 'cursor-not-allowed'
          }`}
          whileHover={!seat.isBooked && !seat.isLocked ? { scale: 1.05 } : {}}
          whileTap={!seat.isBooked && !seat.isLocked ? { scale: 0.95 } : {}}
          onClick={() => handleSeatClick(seat)}
          onMouseEnter={() => setHoveredSeat(seat.number)}
          onMouseLeave={() => setHoveredSeat(null)}
        >
          {formattedSeatNumber}
          
          {seat.isLocked && (
            <div className="absolute -top-1 -right-1">
              <Lock size={14} />
            </div>
          )}
        </motion.div>

        {/* Admin Lock/Unlock Button */}
        {currentUser?.role === 'admin' && !seat.isBooked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAdminLockToggle(seat);
            }}
            className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 p-1 rounded-full ${
              seat.isLocked
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-gray-500 hover:bg-gray-600'
            } text-white transition-colors`}
            title={seat.isLocked ? 'Unlock seat' : 'Lock seat'}
          >
            {seat.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
          </button>
        )}
        
        {/* Tooltip */}
        {hoveredSeat === seat.number && (seat.isLocked || seat.isBooked) && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white dark:bg-gray-800 rounded shadow-lg text-xs z-10">
            <div className="relative">
              <div className="text-gray-900 dark:text-white font-medium">
                {seat.isBooked ? 'Seat Booked' : 'Seat Locked'}
              </div>
              <div className="text-gray-600 dark:text-gray-300 mt-1">
                {seat.isBooked ? (
                  'This seat is already booked'
                ) : (
                  <>
                    <div>Reason: {lockedSeatsData.lockedSeatReasons[seat.number] || 'No reason provided'}</div>
                    <div className="mt-1">Locked by: {lockedSeatsData.lockedSeatUsers[seat.number] || 'Unknown'}</div>
                  </>
                )}
              </div>
              <div className="absolute w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 left-1/2 -bottom-1.5 -ml-1.5"></div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderBusLayout = () => {
    if (!seats.length) return null;
    
    if (bus.type === 'bus cargo') {
      return renderCargoLayout();
    } else {
      return renderRegularLayout();
    }
  };

  const renderCargoLayout = () => {
    const regularSeats = seats.slice(0, 20); // First 20 seats in 2x2 layout
    const backSeats = seats.slice(20, 25); // Last 5 seats in back row
    const rows = 10; // 20 seats / 2 seats per row

    return (
      <div className="relative w-full max-w-2xl mx-auto">
        {/* Bus front */}
        <div className={`h-16 w-full rounded-t-3xl ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mb-8 flex items-center justify-center`}>
          <span className="text-sm">Driver</span>
        </div>
        
        {/* Regular rows (2 seats each) */}
        <div className="space-y-8">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex justify-between">
              {/* Left seat */}
              <div className="flex">
                {regularSeats.slice(rowIndex * 2, rowIndex * 2 + 1).map(seat => renderSeat(seat))}
              </div>
              
              {/* Aisle */}
              <div className="w-32 flex items-center justify-center">
                {rowIndex === 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">Aisle</span>
                )}
              </div>
              
              {/* Right seat */}
              <div className="flex">
                {regularSeats.slice(rowIndex * 2 + 1, rowIndex * 2 + 2).map(seat => renderSeat(seat))}
              </div>
            </div>
          ))}
          
          {/* Back row (5 seats) */}
          <div className="flex justify-between items-center mt-8 pt-8 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex-1 flex justify-between">
              {backSeats.map(seat => renderSeat(seat))}
            </div>
          </div>

          {/* Cargo Area */}
          <div className={`mt-8 p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} text-center`}>
            <h3 className="text-lg font-medium mb-2">Cargo Area</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Space available for cargo and luggage
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderRegularLayout = () => {
    const totalSeats = bus.type === '49 seater' ? 49 : 56;
    const rows = Math.floor((totalSeats - 5) / 4); // Subtract 5 seats for the back row
    const remainingSeats = 5; // Always 5 seats in the back row
    
    return (
      <div className="relative w-full max-w-2xl mx-auto">
        {/* Bus front */}
        <div className={`h-16 w-full rounded-t-3xl ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mb-8 flex items-center justify-center`}>
          <span className="text-sm">Driver</span>
        </div>
        
        {/* Regular rows (4 seats each) */}
        <div className="space-y-8">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex justify-between">
              {/* Left side (2 seats) */}
              <div className="flex gap-4">
                {seats.slice(rowIndex * 4, rowIndex * 4 + 2).map(seat => renderSeat(seat))}
              </div>
              
              {/* Aisle */}
              <div className="w-16 flex items-center justify-center">
                {rowIndex === 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">Aisle</span>
                )}
              </div>
              
              {/* Right side (2 seats) */}
              <div className="flex gap-4">
                {seats.slice(rowIndex * 4 + 2, rowIndex * 4 + 4).map(seat => renderSeat(seat))}
              </div>
            </div>
          ))}
          
          {/* Back row (5 seats) */}
          <div className="flex justify-between items-center mt-8">
            <div className="flex-1 flex justify-between">
              {seats.slice(rows * 4, rows * 4 + remainingSeats).map(seat => renderSeat(seat))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (!bus) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">No bus selected</p>
      </div>
    );
  }
  
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
          <h2 className="text-xl font-semibold mb-2">Select Seats</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Choose up to 4 seats for your journey
          </p>
        </div>
      </div>
      
      <div className="space-y-8">
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-medium">{bus.name} - {bus.type}</h3>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 mr-2"></div>
                <span className="text-xs">Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-blue-500 mr-2"></div>
                <span className="text-xs">Selected</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900 mr-2"></div>
                <span className="text-xs">Booked</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-yellow-200 dark:bg-yellow-900 mr-2"></div>
                <span className="text-xs">Locked</span>
              </div>
            </div>
          </div>
          
          {renderBusLayout()}
          
          {currentUser?.role === 'admin' && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Admin tip: Use the lock/unlock buttons below each seat to manage seat availability
            </div>
          )}
        </div>
        
        <div className={`p-6 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-md`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-gray-600 dark:text-gray-300">Selected Seats:</span>
              <span className="ml-2 font-medium">
                {selectedSeats.length > 0 
                  ? selectedSeats.sort((a, b) => a - b).map(formatSeatNumber).join(', ')
                  : 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-300">Total Price:</span>
              <span className="ml-2 font-medium">
                {currency} {price * selectedSeats.length}
              </span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={selectedSeats.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
              selectedSeats.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {selectedSeats.length === 0 
              ? 'Select at least one seat' 
              : `Continue with ${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''}`}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SelectSeats;
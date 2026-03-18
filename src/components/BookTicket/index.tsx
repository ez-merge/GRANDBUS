import { Bus, Passenger, Route } from '../../types';
import React, { useState } from 'react';
import { useAddBooking, useBuses, useStore } from '../../store';

import PassengerDetails from './PassengerDetails';
import SelectBus from './SelectBus';
import SelectRoute from './SelectRoute';
import SelectSeats from './SelectSeats';
import TicketSummary from './TicketSummary';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

type BookingStep = 'route' | 'bus' | 'seats' | 'details' | 'summary';

const BookTicket: React.FC = () => {
  const { currentUser } = useStore();
  const { data: buses = [] } = useBuses();
  const addBookingMutation = useAddBooking();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('route');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [departureDate, setDepartureDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [departureTime, setDepartureTime] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('KES');
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [bookingRef, setBookingRef] = useState<string>('');
  
  const handleRouteSelect = (route: Route, origin: string, destination: string, calculatedPrice: number) => {
    setSelectedRoute(route);
    setSelectedOrigin(origin);
    setSelectedDestination(destination);
    setPrice(calculatedPrice);
    setCurrency(route.currency);
    if ('selectedDate' in route && route.selectedDate) {
      setDepartureDate(route.selectedDate);
    }
    setCurrentStep('bus');
  };
  
  const handleBusSelect = (bus: Bus, departureTime: string) => {
    setSelectedBus(bus);
    setDepartureTime(departureTime);
    setCurrentStep('seats');
  };
  
  const handleSeatsSelect = (seats: number[]) => {
    setSelectedSeats(seats);
    setPrice(prev => prev * seats.length);
    
    const initialPassengers = seats.map(() => ({
      firstName: '',
      lastName: '',
      idNumber: '',
      age: 0,
      nationality: '',
      gender: 'male' as const,
      phoneNumber: '',
    }));
    
    setPassengers(initialPassengers);
    setCurrentStep('details');
  };
  
  const handlePassengerDetails = async (updatedPassengers: Passenger[], paymentMethod: 'cash' | 'mpesa') => {
    setPassengers(updatedPassengers);
    setPaymentMethod(paymentMethod);
    
    if (selectedRoute && selectedBus && currentUser) {
      try {
        const result = await addBookingMutation.mutateAsync({
          routeId: selectedRoute.id,
          route: `${selectedOrigin} - ${selectedDestination}`,
          busId: selectedBus.id,
          bus: selectedBus.name,
          seats: selectedSeats,
          passengers: updatedPassengers,
          departureDate,
          departureTime,
          price,
          currency,
          paymentMethod,
          bookedBy: currentUser.id,
          destination: selectedDestination // Add actual destination
        });
        
        setBookingRef(result.booking_ref);
        setCurrentStep('summary');
      } catch (error) {
        console.error('Failed to create booking:', error);
      }
    }
  };
  
  const resetBooking = () => {
    setSelectedRoute(null);
    setSelectedOrigin('');
    setSelectedDestination('');
    setSelectedBus(null);
    setSelectedSeats([]);
    setDepartureDate(format(new Date(), 'yyyy-MM-dd'));
    setDepartureTime('');
    setPrice(0);
    setCurrency('KES');
    setPassengers([]);
    setPaymentMethod('cash');
    setBookingRef('');
    setCurrentStep('route');
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 'route':
        return <SelectRoute onSelect={handleRouteSelect} />;
      case 'bus':
        return selectedRoute && selectedRoute.assignedBuses ? 
          <SelectBus 
            buses={buses.filter(bus => selectedRoute.assignedBuses?.some(b => b.id === bus.id))}
            route={selectedRoute}
            onSelect={handleBusSelect}
            onBack={() => setCurrentStep('route')}
          /> : null;
      case 'seats':
        return selectedBus && selectedRoute ? 
          <SelectSeats 
            bus={selectedBus}
            routeId={selectedRoute.id}
            departureDate={departureDate}
            departureTime={departureTime}
            price={price}
            currency={currency}
            onSelect={handleSeatsSelect}
            onBack={() => setCurrentStep('bus')}
          /> : null;
      case 'details':
        return selectedSeats.length > 0 ? 
          <PassengerDetails 
            passengers={passengers}
            seats={selectedSeats}
            onSubmit={handlePassengerDetails}
            onBack={() => setCurrentStep('seats')}
          /> : null;
      case 'summary':
        return bookingRef ? 
          <TicketSummary 
            bookingRef={bookingRef}
            route={`${selectedOrigin} - ${selectedDestination}`}
            bus={selectedBus?.name || ''}
            seats={selectedSeats}
            passengers={passengers}
            departureDate={departureDate}
            departureTime={departureTime}
            price={price}
            currency={currency}
            paymentMethod={paymentMethod}
            bookedBy={currentUser?.name || ''}
            onNewBooking={resetBooking}
          /> : null;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Book Ticket</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Create a new booking for passengers
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        {['route', 'bus', 'seats', 'details', 'summary'].map((step, index) => (
          <React.Fragment key={step}>
            <motion.div 
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === step 
                  ? 'bg-blue-600 text-white' 
                  : index < ['route', 'bus', 'seats', 'details', 'summary'].indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              initial={false}
              animate={{ 
                scale: currentStep === step ? 1.1 : 1,
                backgroundColor: currentStep === step 
                  ? '#2563eb' 
                  : index < ['route', 'bus', 'seats', 'details', 'summary'].indexOf(currentStep)
                    ? '#10b981'
                    : '#e5e7eb'
              }}
              transition={{ duration: 0.2 }}
            >
              {index < ['route', 'bus', 'seats', 'details', 'summary'].indexOf(currentStep) ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </motion.div>
            
            {index < 4 && (
              <div className={`flex-1 h-1 ${
                index < ['route', 'bus', 'seats', 'details', 'summary'].indexOf(currentStep)
                  ? 'bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderStep()}
      </motion.div>
    </div>
  );
};

export default BookTicket;
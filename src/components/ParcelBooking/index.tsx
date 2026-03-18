import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore, useRoutes, useBuses, useAddParcel } from '../../store';
import { Route, Bus } from '../../types';
import SelectRoute from '../BookTicket/SelectRoute';
import SelectBus from './SelectBus';
import ParcelDetails from './ParcelDetails';
import type { ParcelFormDetails } from './ParcelDetails';
import ParcelSummary from './ParcelSummary';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

type BookingStep = 'route' | 'bus' | 'details' | 'summary';

const ParcelBooking: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useStore();
  const { data: routes = [] } = useRoutes();
  const { data: buses = [] } = useBuses();
  const addParcelMutation = useAddParcel();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('route');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [departureDate, setDepartureDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [departureTime, setDepartureTime] = useState<string>('');
  const [currency, setCurrency] = useState<string>('KES');
  const [parcelRef, setParcelRef] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [parcelDetails, setParcelDetails] = useState<ParcelFormDetails | null>(null);

  useEffect(() => {
    if (!currentUser) {
      toast.error('Please log in to book a parcel');
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  const handleRouteSelect = (route: Route, origin: string, destination: string) => {
    setSelectedRoute(route);
    setSelectedOrigin(origin);
    setSelectedDestination(destination);
    setCurrency(route.currency);
    if ('selectedDate' in route) {
      setDepartureDate(route.selectedDate);
    }
    setCurrentStep('bus');
  };
  
  const handleBusSelect = (bus: Bus | null, departureTime: string) => {
    setSelectedBus(bus);
    setDepartureTime(departureTime);
    setCurrentStep('details');
  };
  
  const handleParcelDetails = async (details: ParcelFormDetails, paymentMethod: 'cash' | 'mpesa', price: number, officeId?: string) => {
    if (!currentUser?.id) {
      toast.error('Please log in to book a parcel');
      navigate('/login');
      return;
    }

    if (!selectedRoute) {
      toast.error('Missing required booking information. Please try again.');
      return;
    }

    try {
      const result = await addParcelMutation.mutateAsync({
        routeId: selectedRoute.id,
        busId: selectedBus?.id || null,
        officeId: officeId || null,
        senderName: details.senderName,
        senderPhone: details.senderPhone,
        receiverName: details.receiverName,
        receiverPhone: details.receiverPhone,
        itemType: details.itemType,
        itemName: details.itemName,
        weight: details.weight,
        description: details.description,
        departureDate,
        departureTime: selectedBus ? departureTime : '00:00',
        price: Number(price),
        currency,
        paymentMethod,
        bookedBy: currentUser.id
      });
      
      setParcelRef(result.parcel_ref);
      setPrice(Number(price));
      setParcelDetails(details);
      setCurrentStep('summary');
      toast.success('Parcel booking created successfully!');
    } catch (error) {
      console.error('Failed to create parcel booking:', error);
      if (error.message?.includes('row-level security')) {
        toast.error('Authentication error. Please try logging in again.');
        navigate('/login');
      } else {
        toast.error('Failed to create parcel booking. Please try again.');
      }
    }
  };
  
  const resetBooking = () => {
    setSelectedRoute(null);
    setSelectedOrigin('');
    setSelectedDestination('');
    setSelectedBus(null);
    setDepartureDate(format(new Date(), 'yyyy-MM-dd'));
    setDepartureTime('');
    setCurrency('KES');
    setParcelRef('');
    setPrice(0);
    setParcelDetails(null);
    setCurrentStep('route');
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 'route':
        return <SelectRoute routes={routes} onSelect={handleRouteSelect} />;
      case 'bus':
        return selectedRoute ? 
          <SelectBus 
            buses={buses.filter(bus => selectedRoute.assignedBuses?.some(b => b.id === bus.id))}
            route={selectedRoute}
            onSelect={handleBusSelect}
            onBack={() => setCurrentStep('route')}
          /> : null;
      case 'details':
        return selectedRoute ? 
          <ParcelDetails 
            onSubmit={handleParcelDetails}
            onBack={() => setCurrentStep('bus')}
            currency={currency}
          /> : null;
      case 'summary':
        return parcelRef ? 
          <ParcelSummary 
            parcelRef={parcelRef}
            route={`${selectedOrigin} - ${selectedDestination}`}
            bus={selectedBus?.name || 'Store'}
            departureDate={departureDate}
            departureTime={departureTime}
            price={price}
            currency={currency}
            bookedBy={currentUser?.name || ''}
            senderName={parcelDetails?.senderName}
            senderPhone={parcelDetails?.senderPhone}
            receiverName={parcelDetails?.receiverName}
            receiverPhone={parcelDetails?.receiverPhone}
            itemType={parcelDetails?.itemType}
            itemName={parcelDetails?.itemName}
            weight={parcelDetails?.weight}
            description={parcelDetails?.description}
            onNewBooking={resetBooking}
          /> : null;
      default:
        return null;
    }
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please Log In</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You need to be logged in to book a parcel
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Book Parcel</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Create a new parcel booking
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        {['route', 'bus', 'details', 'summary'].map((step, index) => (
          <React.Fragment key={step}>
            <motion.div 
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === step 
                  ? 'bg-blue-600 text-white' 
                  : index < ['route', 'bus', 'details', 'summary'].indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              initial={false}
              animate={{ 
                scale: currentStep === step ? 1.1 : 1,
                backgroundColor: currentStep === step 
                  ? '#2563eb' 
                  : index < ['route', 'bus', 'details', 'summary'].indexOf(currentStep)
                    ? '#10b981'
                    : '#e5e7eb'
              }}
              transition={{ duration: 0.2 }}
            >
              {index < ['route', 'bus', 'details', 'summary'].indexOf(currentStep) ? (
                <svg className="w-6 h-6\" fill="none\" stroke="currentColor\" viewBox="0 0 24 24\" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round\" strokeLinejoin="round\" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </motion.div>
            
            {index < 3 && (
              <div className={`flex-1 h-1 ${
                index < ['route', 'bus', 'details', 'summary'].indexOf(currentStep)
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

export default ParcelBooking;
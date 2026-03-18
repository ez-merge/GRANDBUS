import { ChevronDown, ChevronUp, Clock, MoreVertical, Printer, Search, Store } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { useBuses, useRoutes } from '../../store';

import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import logo from '../../assets/logo.png';
import { manifest } from '../../api';
import { toast } from 'react-toastify';
import { useStore } from '../../store';

interface ManifestPassenger {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  idNumber?: string;
  nationality?: string;
  gender?: string;
  age?: number;
}

interface ManifestBooking {
  id: string;
  booking_ref?: string;
  parcel_ref?: string;
  bus_id?: string;
  route_id?: string;
  departure_date: string;
  departure_time?: string;
  passengers?: ManifestPassenger[];
  seats?: number[];
  price?: number;
  currency?: string;
  payment_method?: string;
  booked_by?: string;
  destination?: string;
  is_cancelled?: boolean;
  cancellation_reason?: string;
  cancelled_by?: string | { name: string };
  cancelled_at?: string;
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;
  item_name?: string;
  item_type?: string;
  weight?: number;
  description?: string;
  office_id?: string;
  stored_date?: string;
  type?: string;
  reason?: string;
  booked_by_name?: string;
  route?: { origin: string; destination: string } | string;
  bus?: { name: string } | string;
}

interface ManifestBus {
  id: string;
  name: string;
  registration_number?: string;
  type?: string;
}

const loadLogoAsDataUrl = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = logo;
  });
};

const getRouteDisplay = (route: ManifestBooking['route']): { origin: string; destination: string } => {
  if (typeof route === 'object' && route) return route;
  if (typeof route === 'string') {
    const parts = route.split(' - ');
    return { origin: parts[0] || '', destination: parts[1] || '' };
  }
  return { origin: '', destination: '' };
};

const getBusName = (bus: ManifestBooking['bus']): string => {
  if (typeof bus === 'object' && bus) return bus.name;
  if (typeof bus === 'string') return bus;
  return '';
};

const getCancelledByName = (cancelledBy: ManifestBooking['cancelled_by']): string => {
  if (typeof cancelledBy === 'object' && cancelledBy) return cancelledBy.name;
  if (typeof cancelledBy === 'string') return cancelledBy;
  return 'Unknown';
};

const Manifest: React.FC = () => {
  const { darkMode, currentUser } = useStore();
  const { data: routes = [] } = useRoutes();
  const { data: buses = [] } = useBuses();
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [expandedBuses, setExpandedBuses] = useState<string[]>([]);
  const [bookings, setBookings] = useState<ManifestBooking[]>([]);
  const [parcelsInStore, setParcelsInStore] = useState<ManifestBooking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<ManifestBooking[]>([]);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ManifestBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [manifestType, setManifestType] = useState<'tickets' | 'parcels'>('tickets');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ManifestBooking | null>(null);
  const [selectedDispatchBus, setSelectedDispatchBus] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableBuses, setAvailableBuses] = useState<ManifestBus[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleCancelBooking = (booking: ManifestBooking) => {
    // Check if booking is from a past date
    const bookingDate = new Date(booking.departure_date);
    const today = startOfDay(new Date());
    
    if (isBefore(bookingDate, today)) {
      toast.error('Cannot cancel bookings from past dates');
      return;
    }

    setSelectedBooking(booking);
    setCancellationReason('');
    setShowCancellationModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!selectedBooking || !cancellationReason.trim() || !currentUser?.id) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      await manifest.cancelBooking(selectedBooking.id, cancellationReason, currentUser.id);
      
      setBookings(prevBookings => 
        prevBookings.filter(booking => booking.id !== selectedBooking.id)
      );
      
      const cancelledData = await manifest.getCancelledBookings(selectedDate);
      setCancelledBookings(cancelledData || []);
      
      toast.success('Booking cancelled successfully');
      setShowCancellationModal(false);
      setSelectedBooking(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDispatchParcel = async (parcel: ManifestBooking) => {
    if (!parcel.route_id) {
      toast.error('Parcel has no route assigned');
      return;
    }
    try {
      const buses = await manifest.getAvailableBusesForRoute(parcel.route_id, parcel.departure_date);
      setAvailableBuses(buses.flat());
      setSelectedParcel(parcel);
      setSelectedDispatchBus('');
      setShowDispatchModal(true);
    } catch (error) {
      console.error('Error fetching available buses:', error);
      toast.error('Failed to load available buses');
    }
  };

  const confirmDispatchParcel = async () => {
    if (!selectedParcel || !selectedDispatchBus) {
      toast.error('Please select a bus for dispatch');
      return;
    }

    setIsDispatching(true);
    try {
      await manifest.updateParcel(selectedParcel.id, { bus_id: selectedDispatchBus });
      
      // Refresh parcels in store
      const storeData = await manifest.getParcelsInStore();
      setParcelsInStore(storeData || []);
      
      // Refresh parcels for the selected date
      const data = await manifest.getParcels(
        selectedDate,
        selectedRoute === 'all' ? undefined : selectedRoute
      );
      setBookings(data || []);
      
      toast.success('Parcel dispatched successfully');
      setShowDispatchModal(false);
      setSelectedParcel(null);
      setSelectedDispatchBus('');
    } catch (error) {
      console.error('Error dispatching parcel:', error);
      toast.error('Failed to dispatch parcel');
    } finally {
      setIsDispatching(false);
    }
  };

  const toggleActionMenu = (id: string) => {
    setActionMenuOpen(actionMenuOpen === id ? null : id);
  };

  const handleAction = (action: 'dispatch' | 'cancel' | 'print', item: ManifestBooking) => {
    setActionMenuOpen(null);
    switch (action) {
      case 'dispatch':
        handleDispatchParcel(item);
        break;
      case 'cancel':
        handleCancelBooking(item);
        break;
      case 'print':
        printTicket(item);
        break;
    }
  };

  const ActionMenu = ({ item, showDispatch = false }: { item: ManifestBooking; showDispatch?: boolean }) => (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleActionMenu(item.id);
        }}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <MoreVertical size={16} />
      </button>
      {actionMenuOpen === item.id && (
        <div 
          className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          } ring-1 ring-black ring-opacity-5 z-50`}
        >
          <div className="py-1">
            {showDispatch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('dispatch', item);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Dispatch
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction('print', item);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Print
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('cancel', item);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchQuery.toLowerCase();
    
    if (manifestType === 'tickets') {
      // Search in booking reference
      if (booking.booking_ref?.toLowerCase().includes(searchLower)) return true;
      
      // Search in passenger details
      return (booking.passengers || []).some((passenger: ManifestPassenger) => {
        const fullName = `${passenger.firstName} ${passenger.lastName}`.toLowerCase();
        return fullName.includes(searchLower) || 
               passenger.phoneNumber?.includes(searchQuery) ||
               passenger.idNumber?.toLowerCase().includes(searchLower);
      });
    } else {
      // Search in parcel reference
      if (booking.parcel_ref?.toLowerCase().includes(searchLower)) return true;
      
      // Search in sender/receiver details
      return booking.sender_name?.toLowerCase().includes(searchLower) ||
             booking.sender_phone?.includes(searchQuery) ||
             booking.receiver_name?.toLowerCase().includes(searchLower) ||
             booking.receiver_phone?.includes(searchQuery) ||
             booking.item_name?.toLowerCase().includes(searchLower) ||
             booking.item_type?.toLowerCase().includes(searchLower);
    }
  });

  const filteredParcelsInStore = parcelsInStore.filter(parcel => {
    const searchLower = searchQuery.toLowerCase();
    
    // Search in parcel reference
    if (parcel.parcel_ref?.toLowerCase().includes(searchLower)) return true;
    
    // Search in sender/receiver details
    return parcel.sender_name?.toLowerCase().includes(searchLower) ||
           parcel.sender_phone?.includes(searchQuery) ||
           parcel.receiver_name?.toLowerCase().includes(searchLower) ||
           parcel.receiver_phone?.includes(searchQuery) ||
           parcel.item_name?.toLowerCase().includes(searchLower) ||
           parcel.item_type?.toLowerCase().includes(searchLower);
  });

  const bookingsByBus = filteredBookings.reduce((acc: { [key: string]: ManifestBooking[] }, booking: ManifestBooking) => {
    if (!booking.bus_id) return acc;
    if (!acc[booking.bus_id]) {
      acc[booking.bus_id] = [];
    }
    acc[booking.bus_id].push(booking);
    return acc;
  }, {});

  const formatSeatNumber = (num: number): string => {
    const row = Math.floor((num - 1) / 4);
    const seatInRow = ((num - 1) % 4) + 1;
    const rowLetter = String.fromCharCode(65 + row);
    return `${rowLetter}${seatInRow}`;
  };

  const toggleBusExpansion = (busId: string) => {
    setExpandedBuses(prev => 
      prev.includes(busId) 
        ? prev.filter(id => id !== busId)
        : [...prev, busId]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let data;
        if (manifestType === 'tickets') {
          data = await manifest.getBookings(
            selectedDate,
            selectedRoute === 'all' ? undefined : selectedRoute
          );
        } else {
          data = await manifest.getParcels(
            selectedDate,
            selectedRoute === 'all' ? undefined : selectedRoute
          );
        }
        setBookings(data || []);

        // Get cancelled bookings for the selected date
        const cancelledData = await manifest.getCancelledBookings(selectedDate);
        setCancelledBookings(cancelledData || []);

        // Get parcels in store (only for parcels manifest)
        if (manifestType === 'parcels') {
          const storeData = await manifest.getParcelsInStore();
          setParcelsInStore(storeData || []);
        }
      } catch (error) {
        console.error('Error fetching manifest data:', error);
        toast.error('Failed to load manifest data');
      }
    };

    fetchData();
  }, [selectedDate, selectedRoute, manifestType]);

  const printTicket = async (booking: ManifestBooking) => {
    try {
      const doc = new jsPDF({
        format: [226.77, 841.89],
        unit: 'pt'
      });

      let y = 20;
      const margin = 20;
      const width = 226.77 - (margin * 2);

      const centerText = (text: string, fontSize: number) => {
        doc.setFontSize(fontSize);
        const textWidth = doc.getTextWidth(text);
        return (width - textWidth) / 2 + margin;
      };

      try {
        const logoDataUrl = await loadLogoAsDataUrl();
        const logoHeight = 40;
        const logoWidth = 100;
        const logoX = (226.77 - logoWidth) / 2;
        doc.addImage(logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
        y += logoHeight + 10;
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error);
        y += 10;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('GRAND BUS', centerText('GRAND BUS', 16), y);
      y += 15;

      doc.setFontSize(8);
      doc.text('Our contacts: +25413045946, +254743869392', centerText('Our contacts: +25413045946, +254743869392', 8), y);
      y += 15;

      doc.setLineWidth(1);
      doc.line(margin, y, width + margin, y);
      y += 15;

      if (manifestType === 'tickets') {
        doc.setFontSize(12);
        const routeInfo = getRouteDisplay(booking.route);
        const routeText = `${routeInfo.origin} → ${routeInfo.destination}`;
        doc.text(routeText, centerText(routeText, 12) - 30, y);
        y += 20;

        const dateInfo = {
          dayOfWeek: format(new Date(booking.departure_date), 'EEE'),
          day: format(new Date(booking.departure_date), 'dd'),
          month: format(new Date(booking.departure_date), 'MMM'),
          year: format(new Date(booking.departure_date), 'yyyy')
        };

        doc.setFillColor(240, 240, 240);
        const dateBlockWidth = 80;
        const dateBlockX = (226.77 - dateBlockWidth) / 2;
        doc.rect(dateBlockX, y, dateBlockWidth, 50, 'F');

        doc.setFontSize(10);
        doc.text(dateInfo.dayOfWeek, centerText(dateInfo.dayOfWeek, 10), y + 15);
        doc.setFontSize(16);
        doc.text(dateInfo.day, centerText(dateInfo.day, 16), y + 30);
        doc.setFontSize(10);
        doc.text(`${dateInfo.month} ${dateInfo.year}`, centerText(`${dateInfo.month} ${dateInfo.year}`, 10), y + 45);
        y += 60;

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, width, 40, 'F');
        doc.setFontSize(10);
        
        // Calculate reporting time (30 minutes before departure)
        const [hours, minutes] = (booking.departure_time || '00:00').split(':');
        const departureDate = new Date();
        departureDate.setHours(parseInt(hours), parseInt(minutes) - 30);
        const reportingTime = format(departureDate, 'h:mm a');

        doc.text('Reporting Time:', margin + 10, y + 15);
        doc.text(reportingTime, width - doc.getTextWidth(reportingTime) + margin - 10, y + 15);
        doc.text('Departure Time:', margin + 10, y + 35);
        doc.text(format(departureDate.setMinutes(departureDate.getMinutes() + 30), 'h:mm a'), width - doc.getTextWidth(format(departureDate, 'h:mm a')) + margin - 10, y + 35);
        y += 50;

        (booking.passengers || []).forEach((passenger: ManifestPassenger, index: number) => {
          doc.setFontSize(11);
          doc.text(`Passenger ${index + 1}`, margin, y);
          y += 15;
          doc.setFontSize(10);
          doc.text(`Name: ${passenger.firstName} ${passenger.lastName}`, margin + 10, y);
          y += 12;
          doc.text(`Phone: ${passenger.phoneNumber}`, margin + 10, y);
          y += 12;
          doc.text(`Seat: ${formatSeatNumber(booking.seats?.[index] || 0)}`, margin + 10, y);
          y += 12;
          doc.text(`ID: ${passenger.idNumber}`, margin + 10, y);
          y += 20;
        });
      } else {
        // Parcel receipt format
        doc.setFontSize(12);
        doc.text('PARCEL RECEIPT', centerText('PARCEL RECEIPT', 12), y);
        y += 20;

        doc.setFontSize(10);
        doc.text(`Ref: ${booking.parcel_ref}`, margin, y);
        y += 15;

        // Sender details
        doc.text('Sender Details:', margin, y);
        y += 12;
        doc.text(`Name: ${booking.sender_name}`, margin + 10, y);
        y += 12;
        doc.text(`Phone: ${booking.sender_phone}`, margin + 10, y);
        y += 20;

        // Receiver details
        doc.text('Receiver Details:', margin, y);
        y += 12;
        doc.text(`Name: ${booking.receiver_name}`, margin + 10, y);
        y += 12;
        doc.text(`Phone: ${booking.receiver_phone}`, margin + 10, y);
        y += 20;

        // Parcel details
        doc.text('Parcel Details:', margin, y);
        y += 12;
        doc.text(`Type: ${booking.item_type}`, margin + 10, y);
        y += 12;
        doc.text(`Item: ${booking.item_name}`, margin + 10, y);
        if (booking.weight) {
          y += 12;
          doc.text(`Weight: ${booking.weight} kg`, margin + 10, y);
        }
        if (booking.description) {
          y += 12;
          doc.text(`Description: ${booking.description}`, margin + 10, y);
        }
        y += 20;

        // Journey details
        const parcelRoute = getRouteDisplay(booking.route);
        doc.text(`Route: ${parcelRoute.origin} - ${parcelRoute.destination}`, margin, y);
        y += 15;
        doc.text(`Bus: ${getBusName(booking.bus) || 'To be dispatched'}`, margin, y);
        y += 15;
        doc.text(`Date: ${format(new Date(booking.departure_date), 'MMMM d, yyyy')}`, margin, y);
        y += 15;
        doc.text(`Time: ${booking.departure_time}`, margin, y);
        y += 15;
      }

      // Common footer section
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, width, 30, 'F');
      doc.setFontSize(10);
      doc.text('Amount:', margin + 10, y + 12);
      const priceStr = `${booking.currency} ${(booking.price || 0).toFixed(2)}`;
      doc.text(priceStr, width - doc.getTextWidth(priceStr) + margin - 10, y + 12);
      doc.text('Payment Method:', margin + 10, y + 27);
      const paymentStr = (booking.payment_method || '').toUpperCase();
      doc.text(paymentStr, width - doc.getTextWidth(paymentStr) + margin - 10, y + 27);
      y += 40;

      doc.text(`${manifestType === 'tickets' ? 'Booking' : 'Parcel'} Ref: ${booking.booking_ref || booking.parcel_ref}`, margin, y);
      const busLabel = `Bus: ${getBusName(booking.bus) || 'To be dispatched'}`;
      doc.text(busLabel, width - doc.getTextWidth(busLabel) + margin, y);
      y += 20;

      // Generate and add QR code
      try {
        const qrBusName = getBusName(booking.bus);
        const qrData = manifestType === 'tickets' 
          ? `REF:${booking.booking_ref}\nBUS:${qrBusName}\nDATE:${booking.departure_date}\nTIME:${booking.departure_time}`
          : `REF:${booking.parcel_ref}\nBUS:${qrBusName || 'To be dispatched'}\nDATE:${booking.departure_date}\nTIME:${booking.departure_time}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrData);
        const qrSize = 60;
        const qrX = (226.77 - qrSize) / 2;
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
        y += qrSize + 10;

        doc.setFontSize(8);
        doc.text(`Scan QR code to verify ${manifestType === 'tickets' ? 'ticket' : 'parcel'}`, centerText(`Scan QR code to verify ${manifestType === 'tickets' ? 'ticket' : 'parcel'}`, 8), y);
        y += 15;
      } catch (error) {
        console.warn('Failed to add QR code:', error);
      }

      // Footer
      doc.setFontSize(8);
      doc.text(`Booked by: ${booking.booked_by_name}`, margin, y);
      doc.text(`Printed: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, width - doc.getTextWidth(`Printed: ${format(new Date(), 'MMM d, yyyy h:mm a')}`) + margin, y);

      if (manifestType === 'tickets') {
        y += 15;
        doc.setFont('helvetica', 'italic');
        doc.text('Terms & Conditions:', margin, y);
        y += 10;
        doc.text('1. Please arrive 30 minutes before departure', margin + 5, y);
        y += 8;
        doc.text('2. No refund after departure', margin + 5, y);
        y += 8;
        doc.text('3. Keep this ticket safe', margin + 5, y);
      }

      doc.save(`${manifestType === 'tickets' ? 'ticket' : 'parcel'}-${booking.booking_ref || booking.parcel_ref}.pdf`);
      toast.success('Document generated successfully!');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const printBusManifest = async (_busId: string, busName: string, busBookings: ManifestBooking[]) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('GRAND BUS', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`${manifestType === 'tickets' ? 'Passenger' : 'Parcel'} Manifest`, 105, 30, { align: 'center' });
      
      // Add bus details
      doc.setFontSize(12);
      doc.text(`Bus: ${busName}`, 20, 45);
      doc.text(`Date: ${selectedDate}`, 20, 55);
      
      // Add manifest details
      let y = 70;
      if (manifestType === 'tickets') {
        busBookings.forEach(booking => {
          (booking.passengers || []).forEach((passenger: ManifestPassenger, index: number) => {
            doc.text(`${formatSeatNumber(booking.seats?.[index] || 0)} - ${passenger?.firstName || ''} ${passenger?.lastName || ''} - ${passenger?.phoneNumber || ''}`, 20, y);
            y += 10;
          });
        });
      } else {
        busBookings.forEach(parcel => {
          doc.text(`${parcel.parcel_ref} - ${parcel.sender_name} to ${parcel.receiver_name}`, 20, y);
          y += 10;
        });
      }
      
      // Add footer
      doc.text(`Printed: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, y + 20);
      
      // Save the PDF
      doc.save(`manifest-${busName}-${selectedDate}.pdf`);
      
      toast.success('Manifest generated successfully!');
    } catch (error) {
      console.error('Error generating manifest:', error);
      toast.error('Failed to generate manifest');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manifest</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          View booking manifests by bus
        </p>
      </div>
      
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Route
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="all">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={`${route.origin} - ${route.destination}`}>
                  {route.origin} - {route.destination}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Manifest Type
            </label>
            <div className="flex rounded-lg overflow-hidden">
              <button
                onClick={() => setManifestType('tickets')}
                className={`flex-1 px-4 py-2 ${
                  manifestType === 'tickets'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                }`}
              >
                Tickets
              </button>
              <button
                onClick={() => setManifestType('parcels')}
                className={`flex-1 px-4 py-2 ${
                  manifestType === 'parcels'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                }`}
              >
                Parcels
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${manifestType === 'tickets' ? 'tickets by reference, name, phone or ID' : 'parcels by reference, name, phone or item'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full p-2 pl-10 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        {manifestType === 'parcels' && (
          <div className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-md mb-6`}>
            <div className="flex items-center mb-4">
              <Store size={20} className="mr-2" />
              <h3 className="text-lg font-medium">Parcels in Store</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-600`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Parcel Ref
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sender
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Receiver
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Route
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stored Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredParcelsInStore.map(parcel => (
                    <tr key={parcel.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {parcel.parcel_ref || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {parcel.sender_name || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {parcel.receiver_name || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {`${getRouteDisplay(parcel.route).origin} - ${getRouteDisplay(parcel.route).destination}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {parcel.stored_date ? format(new Date(parcel.stored_date), 'MMM d, yyyy h:mm a') : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          In Store
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ActionMenu item={parcel} showDispatch={true} />
                      </td>
                    </tr>
                  ))}
                  {filteredParcelsInStore.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No parcels in store
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {Object.entries(bookingsByBus).map(([busId, busBookings]) => {
            const bus = buses.find(b => b.id === busId);
            if (!bus) return null;
            
            const departureTime = busBookings[0]?.departure_time;
            
            return (
              <div 
                key={busId}
                className={`rounded-lg overflow-hidden ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div 
                  className={`p-4 flex justify-between items-center ${
                    darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  } cursor-pointer`}
                  onClick={() => toggleBusExpansion(busId)}
                >
                
                  <div className="flex-1">
                    <h3 className="text-lg font-medium">{bus.name || ''}</h3>
                    <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{bus.registrationNumber || ''} • {bus.type || ''}</span>
                      {departureTime && (
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          <span>Departure: {departureTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {manifestType === 'tickets'
                        ? `${busBookings.reduce((sum, booking) => sum + ((booking.passengers || []).length || 0), 0)} passengers`
                        : `${busBookings.length} parcels`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printBusManifest(busId, bus.name || '', busBookings);
                      }}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                    >
                      <Printer size={18} className="mr-2" />
                      Print Manifest
                    </button>
                    {expandedBuses.includes(busId) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                
                {expandedBuses.includes(busId) && (
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-600`}>
                      <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                        <tr>
                          {manifestType === 'tickets' ? (
                            <>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Booking Ref
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Name
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Mobile No.
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Seat No.
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Origin
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Destination
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Cost
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Booked By
                              </th>
                              {currentUser?.role === 'admin' && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              )}
                            </>
                          ) : (
                            <>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Parcel Ref
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Sender
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Receiver
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Item
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Origin
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Destination
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Cost
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Booked By
                              </th>
                              {currentUser?.role === 'admin' && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              )}
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {busBookings.map((booking) => (
                          manifestType === 'tickets' && booking.passengers ? (
                            (booking.passengers || []).map((passenger: ManifestPassenger, pIndex: number) => (
                              <tr key={`${booking.id}-${pIndex}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {booking.booking_ref || ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {`${passenger?.firstName || ''} ${passenger?.lastName || ''}`}
                                </td>
                                <td className="px-6 py-4  whitespace-nowrap text-sm">
                                  {passenger?.phoneNumber || ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {formatSeatNumber(booking.seats?.[pIndex] || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {getRouteDisplay(booking.route).origin}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {getRouteDisplay(booking.route).destination}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {`${booking.currency || ''} ${((booking.price || 0) / ((booking.passengers || []).length || 1)).toFixed(2)}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {booking.booked_by_name || ''}
                                </td>
                                {currentUser?.role === 'admin' && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <ActionMenu item={booking} />
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr key={booking.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {booking.parcel_ref || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {booking.sender_name || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {booking.receiver_name || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {booking.item_name || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {getRouteDisplay(booking.route).origin}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {getRouteDisplay(booking.route).destination}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {`${booking.currency || ''} ${(booking.price || 0).toFixed(2)}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {booking.booked_by_name || ''}
                              </td>
                              {currentUser?.role === 'admin' && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <ActionMenu item={booking} />
                                </td>
                              )}
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          
          {Object.keys(bookingsByBus).length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No bookings found for the selected criteria
            </div>
          )}
        </div>
      </div>

      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h3 className="text-lg font-medium mb-4">Cancel Booking</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Reason for Cancellation
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                rows={3}
                placeholder="Enter reason for cancellation..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancellationModal(false);
                  setSelectedBooking(null);
                  setCancellationReason('');
                }}
                className={`px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={isCancelling}
              >
                Cancel
              </button>
              <button
                onClick={confirmCancelBooking}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h3 className="text-lg font-medium mb-4">Dispatch Parcel</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Select Bus
              </label>
              <select
                value={selectedDispatchBus}
                onChange={(e) => setSelectedDispatchBus(e.target.value)}
                className={`w-full p-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="">Select a bus...</option>
                {availableBuses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.name} ({bus.registration_number})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDispatchModal(false);
                  setSelectedParcel(null);
                  setSelectedDispatchBus('');
                }}
                className={`px-4 py-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                disabled={isDispatching}
              >
                Cancel
              </button>
              <button
                onClick={confirmDispatchParcel}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isDispatching}
              >
                {isDispatching ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`mt-8 p-6 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-md`}>
        <h2 className="text-xl font-semibold mb-4">Cancellation History - {format(new Date(selectedDate), 'MMMM d, yyyy')}</h2>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-600`}>
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reference
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Route
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bus
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cancelled By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cancelled At
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {cancelledBookings.map((booking) => (
                <tr key={`${booking.type}-${booking.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.type === 'ticket' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {booking.type === 'ticket' ? 'Ticket' : 'Parcel'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.booking_ref || booking.parcel_ref}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {typeof booking.route === 'string' ? booking.route : `${getRouteDisplay(booking.route).origin} - ${getRouteDisplay(booking.route).destination}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getBusName(booking.bus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getCancelledByName(booking.cancelled_by)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.cancelled_at ? format(new Date(booking.cancelled_at), 'MMM d, yyyy h:mm a') : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.reason}
                  </td>
                </tr>
              ))}
              {cancelledBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No cancelled bookings found for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Manifest;
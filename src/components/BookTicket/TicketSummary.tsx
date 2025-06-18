import React from 'react';
import { motion } from 'framer-motion';
import { format, addMinutes, isValid } from 'date-fns';
import { jsPDF } from 'jspdf';
import { Passenger } from '../../types';
import { useStore } from '../../store';
import { Printer, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import logo from '../../assets/logo.png';

interface TicketSummaryProps {
  bookingRef: string;
  route: string;
  bus: string;
  seats: number[];
  passengers: Passenger[];
  departureDate: string;
  departureTime: string;
  price: number;
  currency: string;
  paymentMethod: 'cash' | 'mpesa';
  bookedBy: string;
  onNewBooking: () => void;
}

const TicketSummary: React.FC<TicketSummaryProps> = ({
  bookingRef,
  route,
  bus,
  seats,
  passengers,
  departureDate,
  departureTime,
  price,
  currency,
  paymentMethod,
  bookedBy,
  onNewBooking
}) => {
  const { darkMode } = useStore();
  
  const reportingTime = () => {
    try {
      const [hours, minutes] = departureTime.split(':').map(Number);
      const baseDate = new Date();
      baseDate.setHours(hours, minutes, 0, 0);
      const reportingDateTime = addMinutes(baseDate, -30);
      return format(reportingDateTime, 'h:mm a');
    } catch (error) {
      return 'Invalid Time';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) throw new Error('Invalid date');
      return {
        dayOfWeek: format(date, 'EEE'),
        day: format(date, 'dd'),
        month: format(date, 'MMM'),
        year: format(date, 'yyyy')
      };
    } catch (error) {
      return {
        dayOfWeek: '--',
        day: '--',
        month: '---',
        year: '----'
      };
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  const formatSeatNumber = (num: number): string => {
    const row = Math.floor((num - 1) / 4);
    const seatInRow = ((num - 1) % 4) + 1;
    const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'
    return `${rowLetter}${seatInRow}`;
  };

  const loadLogoAsDataUrl = (logoSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = logoSrc;
    });
  };
  
  const generatePDF = async () => {
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
        const logoDataUrl = await loadLogoAsDataUrl(logo);
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
      
      doc.setFontSize(12);
      const [origin, destination] = route.split(' - ');
      const routeText = `${origin} → ${destination}`;
      doc.text(routeText, centerText(routeText, 12) - 30, y);
      y += 20;
      
      const dateInfo = formatDate(departureDate);
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
      doc.text('Reporting Time:', margin + 10, y + 15);
      doc.text(reportingTime(), width - doc.getTextWidth(reportingTime()) + margin - 10, y + 15);
      doc.text('Departure Time:', margin + 10, y + 35);
      doc.text(formatTime(departureTime), width - doc.getTextWidth(formatTime(departureTime)) + margin - 10, y + 35);
      y += 50;
      
      passengers.forEach((passenger, index) => {
        doc.setFontSize(11);
        doc.text(`Passenger ${index + 1}`, margin, y);
        y += 15;
        doc.setFontSize(10);
        doc.text(`Name: ${passenger.firstName} ${passenger.lastName}`, margin + 10, y);
        y += 12;
        doc.text(`Phone: ${passenger.phoneNumber}`, margin + 10, y);
        y += 12;
        const formattedSeatNumber = formatSeatNumber(seats[index]);
        doc.text(`Seat: ${formattedSeatNumber}`, margin + 10, y);
        y += 12;
        doc.text(`ID: ${passenger.idNumber}`, margin + 10, y);
        y += 20;
      });
      
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, width, 30, 'F');
      doc.setFontSize(10);
      doc.text('Amount:', margin + 10, y + 12);
      doc.text(`${currency} ${price.toFixed(2)}`, width - doc.getTextWidth(`${currency} ${price.toFixed(2)}`) + margin - 10, y + 12);
      doc.text('Payment Method:', margin + 10, y + 27);
      doc.text(paymentMethod.toUpperCase(), width - doc.getTextWidth(paymentMethod.toUpperCase()) + margin - 10, y + 27);
      y += 40;
      
      doc.text(`Booking Ref: ${bookingRef}`, margin, y);
      doc.text(`Bus: ${bus}`, width - doc.getTextWidth(`Bus: ${bus}`) + margin, y);
      y += 20;
      
      const qrData = `REF:${bookingRef}\nBUS:${bus}\nDATE:${departureDate}\nTIME:${departureTime}`;
      const qrSize = 50;
      const qrX = (226.77 - qrSize) / 2;
      
      const cellSize = qrSize / 25;
      doc.setFillColor(0, 0, 0);
      
      for (let i = 0; i < 25; i++) {
        for (let j = 0; j < 25; j++) {
          if (Math.random() < 0.5) {
            doc.rect(qrX + (i * cellSize), y + (j * cellSize), cellSize, cellSize, 'F');
          }
        }
      }
      
      y += qrSize + 15;
      
      doc.setFontSize(8);
      doc.text(`Booked by: ${bookedBy}`, margin, y);
      doc.text(`Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, width - doc.getTextWidth(`Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`) + margin, y);
      y += 15;
      
      doc.setFont('helvetica', 'italic');
      doc.text('Terms & Conditions:', margin, y);
      y += 10;
      doc.text('1. Please arrive 30 minutes before departure', margin + 5, y);
      y += 8;
      doc.text('2. No refund after departure', margin + 5, y);
      y += 8;
      doc.text('3. Keep this ticket safe', margin + 5, y);
      
      doc.save(`ticket-${bookingRef}.pdf`);
      
      toast.success('Your ticket was generated successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate ticket. Please try again.');
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Your booking has been successfully completed
        </p>
      </div>
      
      <div className={`p-8 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-lg border-t-4 border-green-500`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <img src={logo} alt="GRAND BUS" className="h-16 mb-4" />
            <h3 className="text-2xl font-bold">GRAND BUS</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Bus Ticket</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
          }`}>
            Confirmed
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-medium mb-4">Booking Details</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Booking Reference:</span>
                <span className="font-medium">{bookingRef}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Route:</span>
                <span className="font-medium">{route}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bus:</span>
                <span className="font-medium">{bus}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Seat(s):</span>
                <span className="font-medium">{seats.map(formatSeatNumber).join(', ')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                <span className="font-medium">{formatDate(departureDate).dayOfWeek}, {formatDate(departureDate).day} {formatDate(departureDate).month} {formatDate(departureDate).year}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Departure Time:</span>
                <span className="font-medium">{formatTime(departureTime)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reporting Time:</span>
                <span className="font-medium">{reportingTime()}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Passenger Details</h4>
            
            <div className="space-y-4">
              {passengers.map((passenger, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">
                      {passenger.firstName} {passenger.lastName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Seat {formatSeatNumber(seats[index])}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>ID: {passenger.idNumber}</span>
                      <span>Age: {passenger.age}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Phone: {passenger.phoneNumber}</span>
                      <span>Gender: {passenger.gender}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <h4 className="text-lg font-medium mb-4">Payment Details</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                  <span className="font-medium">{paymentMethod.toUpperCase()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="font-medium">{currency} {price.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Booked By:</span>
                  <span className="font-medium">{bookedBy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Booking Date: {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            <p className="mt-1">Thank you for choosing GRAND BUS!</p>
          </div>
          
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generatePDF}
              className={`flex items-center px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <Download size={18} className="mr-2" />
              <span>Download</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generatePDF}
              className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer size={18} className="mr-2" />
              <span>Print Ticket</span>
            </motion.button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewBooking}
          className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          Book Another Ticket
        </motion.button>
      </div>
    </div>
  );
};

export default TicketSummary;
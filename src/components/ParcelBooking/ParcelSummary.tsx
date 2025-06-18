import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store';
import { Printer, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import logo from '../../assets/logo.png';
import QRCode from 'qrcode';

interface ParcelSummaryProps {
  parcelRef: string;
  route: string;
  bus: string;
  departureDate: string;
  departureTime: string;
  price: number;
  currency: string;
  bookedBy: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  itemType?: string;
  itemName?: string;
  weight?: number;
  description?: string;
  onNewBooking: () => void;
}

const ParcelSummary: React.FC<ParcelSummaryProps> = ({
  parcelRef,
  route,
  bus,
  departureDate,
  departureTime,
  price,
  currency,
  bookedBy,
  senderName,
  senderPhone,
  receiverName,
  receiverPhone,
  itemType,
  itemName,
  weight,
  description,
  onNewBooking
}) => {
  const { darkMode } = useStore();

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

  const generateQRCode = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const generateReceipt = async () => {
    try {
      // Create PDF with thermal printer dimensions (58mm width)
      const doc = new jsPDF({
        format: [226.77, 841.89], // 80mm width (converted to points)
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
        console.warn('Failed to add logo to receipt:', error);
        y += 10;
      }

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('GRAND BUS', centerText('GRAND BUS', 16), y);
      y += 15;

      doc.setFontSize(8);
      doc.text('Our contacts: +25413045946, +254743869392', centerText('Our contacts: +25413045946, +254743869392', 8), y);
      y += 15;

      // Divider
      doc.setLineWidth(1);
      doc.line(margin, y, width + margin, y);
      y += 15;

      // Parcel details
      doc.setFontSize(12);
      doc.text('PARCEL RECEIPT', centerText('PARCEL RECEIPT', 12), y);
      y += 20;

      doc.setFontSize(10);
      doc.text(`Ref: ${parcelRef}`, margin, y);
      y += 15;

      // Sender details
      doc.text('Sender Details:', margin, y);
      y += 12;
      doc.text(`Name: ${senderName || ''}`, margin + 10, y);
      y += 12;
      doc.text(`Phone: ${senderPhone || ''}`, margin + 10, y);
      y += 20;

      // Receiver details
      doc.text('Receiver Details:', margin, y);
      y += 12;
      doc.text(`Name: ${receiverName || ''}`, margin + 10, y);
      y += 12;
      doc.text(`Phone: ${receiverPhone || ''}`, margin + 10, y);
      y += 20;

      // Parcel details
      doc.text('Parcel Details:', margin, y);
      y += 12;
      doc.text(`Type: ${itemType || ''}`, margin + 10, y);
      y += 12;
      doc.text(`Item: ${itemName || ''}`, margin + 10, y);
      if (weight) {
        y += 12;
        doc.text(`Weight: ${weight} kg`, margin + 10, y);
      }
      if (description) {
        y += 12;
        doc.text(`Description: ${description}`, margin + 10, y);
      }
      y += 20;

      // Journey details
      doc.text(`Route: ${route}`, margin, y);
      y += 15;
      doc.text(`Bus: ${bus}`, margin, y);
      y += 15;
      doc.text(`Date: ${format(new Date(departureDate), 'MMMM d, yyyy')}`, margin, y);
      y += 15;
      doc.text(`Time: ${departureTime || 'To be dispatched'}`, margin, y);
      y += 15;

      // Amount
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, width, 20, 'F');
      doc.text('Amount:', margin + 5, y + 13);
      doc.text(`${currency} ${price.toFixed(2)}`, width - doc.getTextWidth(`${currency} ${price.toFixed(2)}`) + margin - 5, y + 13);
      y += 30;

      // Add QR Code
      try {
        const qrCodeDataUrl = await generateQRCode(parcelRef);
        const qrSize = 60;
        const qrX = (226.77 - qrSize) / 2;
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
        y += qrSize + 10;
        
        doc.setFontSize(8);
        doc.text('Scan QR code to verify parcel', centerText('Scan QR code to verify parcel', 8), y);
        y += 15;
      } catch (error) {
        console.warn('Failed to add QR code:', error);
      }

      // Footer
      doc.setFontSize(8);
      doc.text(`Booked by: ${bookedBy}`, margin, y);
      doc.text(`Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, width - doc.getTextWidth(`Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`) + margin, y);

      // Save the PDF
      doc.save(`parcel-${parcelRef}.pdf`);
      
      toast.success('Receipt generated successfully!');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Your parcel booking has been successfully completed
        </p>
      </div>
      
      <div className={`p-8 rounded-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-lg border-t-4 border-green-500`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <img src={logo} alt="GRAND BUS" className="h-16 mb-4" />
            <h3 className="text-2xl font-bold">GRAND BUS</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Parcel Receipt</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
          }`}>
            Confirmed
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium mb-4">Sender Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="ml-2 font-medium">{senderName}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="ml-2 font-medium">{senderPhone}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-4">Receiver Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="ml-2 font-medium">{receiverName}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="ml-2 font-medium">{receiverPhone}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-4">Parcel Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="ml-2 font-medium">{itemType}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Item:</span>
                <span className="ml-2 font-medium">{itemName}</span>
              </div>
              {weight && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                  <span className="ml-2 font-medium">{weight} kg</span>
                </div>
              )}
              {description && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Description:</span>
                  <span className="ml-2 font-medium">{description}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-4">Journey Details</h4>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reference:</span>
                <span className="font-medium">{parcelRef}</span>
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
                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                <span className="font-medium">{format(new Date(departureDate), 'MMMM d, yyyy')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                <span className="font-medium">{departureTime || 'To be dispatched'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium">{currency} {price.toFixed(2)}</span>
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
              onClick={generateReceipt}
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
              onClick={generateReceipt}
              className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer size={18} className="mr-2" />
              <span>Print Receipt</span>
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
          Book Another Parcel
        </motion.button>
      </div>
    </div>
  );
};

export default ParcelSummary;
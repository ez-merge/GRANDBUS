import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Calendar from 'react-calendar';
import { format, isValid } from 'date-fns';
import { useStore, useDashboardStats } from '../store';
import 'react-calendar/dist/Calendar.css';

const Dashboard: React.FC = () => {
  const { darkMode } = useStore();
  const { data: dashboardStats, isLoading, error } = useDashboardStats();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const cardVariants = {
    hover: {
      scale: 1.05,
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: { type: 'spring', stiffness: 400, damping: 10 },
    },
    initial: {
      scale: 1,
      boxShadow:
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      transition: { type: 'spring', stiffness: 400, damping: 17 },
    },
  };

  const getGlowColor = (cardType: string) => {
    switch (cardType) {
      case 'bookings':
        return darkMode
          ? 'rgba(59, 130, 246, 0.3)'
          : 'rgba(59, 130, 246, 0.15)';
      case 'routes':
        return darkMode
          ? 'rgba(16, 185, 129, 0.3)'
          : 'rgba(16, 185, 129, 0.15)';
      case 'passengers':
        return darkMode
          ? 'rgba(245, 158, 11, 0.3)'
          : 'rgba(245, 158, 11, 0.15)';
      default:
        return darkMode
          ? 'rgba(139, 92, 246, 0.3)'
          : 'rgba(139, 92, 246, 0.15)';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        return 'Invalid Date';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error loading dashboard data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Welcome back to GRAND BUS!
          </p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <p className="text-2xl font-semibold">
            {format(currentTime, 'h:mm:ss a')}
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        } rounded-xl p-6`}
      >
        {/* Total Bookings */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          whileHover="hover"
          onHoverStart={() => setHoveredCard('bookings')}
          onHoverEnd={() => setHoveredCard(null)}
          className={`relative z-10 p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
          style={{
            background:
              hoveredCard === 'bookings'
                ? `radial-gradient(circle at center, ${getGlowColor(
                    'bookings'
                  )}, ${darkMode ? '#1f2937' : 'white'} 70%)`
                : darkMode
                ? '#1f2937'
                : 'white',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Total Bookings
            </h3>
            <span className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold">
            {dashboardStats?.totalBookings || 0}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Today's bookings
          </p>
        </motion.div>

        {/* Active Routes */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          whileHover="hover"
          onHoverStart={() => setHoveredCard('routes')}
          onHoverEnd={() => setHoveredCard(null)}
          className={`relative z-10 p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
          style={{
            background:
              hoveredCard === 'routes'
                ? `radial-gradient(circle at center, ${getGlowColor(
                    'routes'
                  )}, ${darkMode ? '#1f2937' : 'white'} 70%)`
                : darkMode
                ? '#1f2937'
                : 'white',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Active Routes
            </h3>
            <span className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold">
            {dashboardStats?.activeRoutes || 0}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Available routes
          </p>
        </motion.div>

        {/* Total Passengers */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          whileHover="hover"
          onHoverStart={() => setHoveredCard('passengers')}
          onHoverEnd={() => setHoveredCard(null)}
          className={`relative z-10 p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
          style={{
            background:
              hoveredCard === 'passengers'
                ? `radial-gradient(circle at center, ${getGlowColor(
                    'passengers'
                  )}, ${darkMode ? '#1f2937' : 'white'} 70%)`
                : darkMode
                ? '#1f2937'
                : 'white',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
              Total Passengers
            </h3>
            <span className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold">
            {dashboardStats?.totalPassengers || 0}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Today's passengers
          </p>
        </motion.div>

        {/* Calendar */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          whileHover="hover"
          className={`relative z-10 p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg col-span-1 md:col-span-1 lg:col-span-1`}
        >
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
            Calendar
          </h3>
          <Calendar
            value={currentTime}
            className={`border-0 ${darkMode ? 'react-calendar--dark' : ''}`}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2  }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
        >
          <h3 className="text-lg font-medium mb-4">Recent Bookings</h3>

          {dashboardStats?.recentBookings &&
          dashboardStats.recentBookings.length > 0 ? (
            <div className="space-y-4">
              {dashboardStats.recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } flex justify-between items-center`}
                >
                  <div>
                    <p className="font-medium">
                      {(booking.passengers as any[])[0].firstName}{' '}
                      {(booking.passengers as any[])[0].lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {`${booking.route.origin} - ${booking.route.destination}`} • {formatDate(booking.departure_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {booking.currency} {booking.price}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Seat {booking.seats.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No recent bookings
            </div>
          )}
        </motion.div>

        {/* Popular Routes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
        >
          <h3 className="text-lg font-medium mb-4">Popular Routes</h3>

          {dashboardStats?.popularRoutes &&
          dashboardStats.popularRoutes.length > 0 ? (
            <div className="space-y-4">
              {dashboardStats.popularRoutes.map((route, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } flex justify-between items-center`}
                >
                  <p className="font-medium">{route.route}</p>
                  <div className="flex items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode
                          ? 'bg-blue-900 text-blue-300'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {route.bookings} bookings
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No route data available
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
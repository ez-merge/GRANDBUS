import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import LoginPage from './components/Loginpage';
import Dashboard from './components/Dashboard';
import BookTicket from './components/BookTicket';
import ParcelBooking from './components/ParcelBooking';
import Manifest from './components/Manifest';
import Management from './components/Management';
import Expenses from './components/Expenses';
import Reconciliation from './components/Reconciliation';
import { useStore } from './store';

function App() {
  const { darkMode } = useStore();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="book" element={<BookTicket />} />
            <Route path="parcel" element={<ParcelBooking />} />
            <Route path="manifest" element={<Manifest />} />
            <Route path="management" element={<Management />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reconciliation" element={<Reconciliation />} />
          </Route>
          <Route path="*" element={<Navigate to="/\" replace />} />
        </Routes>
      </Router>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? 'dark' : 'light'}
      />
    </div>
  );
}

export default App;
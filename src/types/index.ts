export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  lastActive: string;
  office_id?: string;
  office?: Office;
};

export type Office = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  is_pickup_point: boolean;
  created_at: string;
  updated_at: string;
};

export type AssignedBus = {
  id: string;
  departureTime: string;
};

export type Route = {
  id: string;
  origin: string;
  destination: string;
  intermediateStops: {
    name: string;
    price: number;
  }[];
  basePrice: number;
  currency: 'KES' | 'UGX';
  assignedBuses: AssignedBus[];
  selectedDate?: string;
};

export type Bus = {
  id: string;
  name: string;
  registrationNumber: string;
  type: '49 seater' | '56 seater' | 'bus cargo';
  image: string;
  routes: string[];
  bookedSeats: {
    [key: string]: {
      [key: string]: number[];
    };
  };
};

export type Seat = {
  id: string;
  number: number;
  isBooked: boolean;
  isLocked?: boolean;
  lockedBy?: string;
  lockReason?: string;
};

export type Passenger = {
  firstName: string;
  lastName: string;
  idNumber: string;
  age: number;
  nationality: string;
  gender: 'male' | 'female';
  phoneNumber: string;
};

export type Booking = {
  id: string;
  bookingRef: string;
  routeId: string;
  route: string;
  bus: string;
  busId: string;
  seats: number[];
  passengers: Passenger[];
  departureDate: string;
  departureTime: string;
  price: number;
  currency: 'KES' | 'UGX';
  paymentMethod: 'cash' | 'mpesa';
  bookedBy: string;
  bookedAt: string;
  destination: string;
  is_cancelled?: boolean;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
};

export type Parcel = {
  id: string;
  parcel_ref: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  item_type: string;
  item_name: string;
  weight?: number;
  description?: string;
  route_id: string;
  bus_id?: string;
  office_id?: string;
  departure_date: string;
  departure_time: string;
  price: number;
  currency: 'KES' | 'UGX';
  payment_method: 'cash' | 'mpesa';
  booked_by: string;
  created_at: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  stored_date: string;
  office?: Office;
  route?: Route;
  bus?: Bus;
};

export type CancellationHistory = {
  id: string;
  bookingId: string;
  bookingRef: string;
  route: string;
  bus: string;
  seats: string[];
  passengers: Passenger[];
  departureDate: string;
  departureTime: string;
  price: number;
  currency: string;
  cancelledBy: string;
  cancelledAt: string;
  reason: string;
};

export type DashboardStats = {
  totalBookings: number;
  activeRoutes: number;
  totalPassengers: number;
  recentBookings: Booking[];
  popularRoutes: {
    route: string;
    bookings: number;
  }[];
};
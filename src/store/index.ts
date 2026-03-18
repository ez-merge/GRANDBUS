import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seats, buses } from '../api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import type { Route, User, DashboardStats, Passenger } from '../types';
import { format } from 'date-fns';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          office:offices(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<User> }) => {
      if ('password' in userData) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          id,
          { password: userData.password as string }
        );
        if (authError) throw authError;
        delete userData.password;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          role: userData.role,
          office_id: userData.office_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

interface RawBusRoute {
  bus_id: string;
  departure_time: string;
}

interface RawRoute {
  id: string;
  origin: string;
  destination: string;
  intermediate_stops: { name: string; price: number }[];
  base_price: number;
  currency: string;
  bus_routes: RawBusRoute[];
}

const transformRouteData = (rawRoute: RawRoute): Route => {
  return {
    id: rawRoute.id,
    origin: rawRoute.origin,
    destination: rawRoute.destination,
    intermediateStops: rawRoute.intermediate_stops || [],
    basePrice: Number(rawRoute.base_price) || 0,
    currency: (rawRoute.currency || 'KES') as Route['currency'],
    assignedBuses: (rawRoute.bus_routes || []).map((br: RawBusRoute) => ({
      id: br.bus_id,
      departureTime: br.departure_time
    }))
  };
};

export const useRoutes = () => {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          bus_routes (
            bus_id,
            departure_time
          )
        `);

      if (error) throw error;
      return (data || []).map(transformRouteData);
    }
  });
};

export const useBuses = () => {
  return useQuery({
    queryKey: ['buses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*');

      if (error) throw error;
      return data || [];
    }
  });
};

export const useAddParcel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parcel: {
      routeId: string;
      busId: string | null;
      officeId?: string | null;
      senderName: string;
      senderPhone: string;
      receiverName: string;
      receiverPhone: string;
      itemType: string;
      itemName: string;
      weight?: number;
      description?: string;
      departureDate: string;
      departureTime: string;
      price: number;
      currency: string;
      paymentMethod: string;
      bookedBy: string;
    }) => {
      const parcelRef = `PL${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('parcels')
        .insert({
          parcel_ref: parcelRef,
          route_id: parcel.routeId,
          bus_id: parcel.busId,
          office_id: parcel.officeId,
          sender_name: parcel.senderName,
          sender_phone: parcel.senderPhone,
          receiver_name: parcel.receiverName,
          receiver_phone: parcel.receiverPhone,
          item_type: parcel.itemType,
          item_name: parcel.itemName,
          weight: parcel.weight,
          description: parcel.description,
          departure_date: parcel.departureDate,
          departure_time: parcel.departureTime,
          price: parcel.price,
          currency: parcel.currency,
          payment_method: parcel.paymentMethod,
          booked_by: parcel.bookedBy
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });
};

export const useAddUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: {
      name: string;
      email: string;
      password: string;
      role: 'admin' | 'staff';
      office_id?: string;
    }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            name: user.name,
            role: user.role,
            office_id: user.office_id
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update the profile with office_id if provided
      if (user.office_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ office_id: user.office_id })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

export const useAddRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (route: {
      origin: string;
      destination: string;
      intermediateStops: { name: string; price: number; }[];
      basePrice: number;
      currency: string;
      assignedBuses: { id: string; departureTime: string; }[];
    }) => {
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          origin: route.origin,
          destination: route.destination,
          intermediate_stops: route.intermediateStops,
          base_price: route.basePrice,
          currency: route.currency
        })
        .select()
        .single();

      if (routeError) throw routeError;

      if (route.assignedBuses.length > 0) {
        const busRoutes = route.assignedBuses.map(bus => ({
          bus_id: bus.id,
          route_id: routeData.id,
          departure_time: bus.departureTime
        }));

        const { error: busRoutesError } = await supabase
          .from('bus_routes')
          .insert(busRoutes);

        if (busRoutesError) throw busRoutesError;
      }

      return routeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });
};

export const useUpdateRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, route }: {
      id: string;
      route: {
        origin: string;
        destination: string;
        intermediateStops: { name: string; price: number; }[];
        basePrice: number;
  currency: string;
        assignedBuses: { id: string; departureTime: string; }[];
      };
    }) => {
      const { error: routeError } = await supabase
        .from('routes')
        .update({
          origin: route.origin,
          destination: route.destination,
          intermediate_stops: route.intermediateStops,
          base_price: route.basePrice,
          currency: route.currency
        })
        .eq('id', id);

      if (routeError) throw routeError;

      const { error: deleteError } = await supabase
        .from('bus_routes')
        .delete()
        .eq('route_id', id);

      if (deleteError) throw deleteError;

      if (route.assignedBuses.length > 0) {
        const busRoutes = route.assignedBuses.map(bus => ({
          bus_id: bus.id,
          route_id: id,
          departure_time: bus.departureTime
        }));

        const { error: busRoutesError } = await supabase
          .from('bus_routes')
          .insert(busRoutes);

        if (busRoutesError) throw busRoutesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });
};

export const useDeleteRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });
};

export const useAddBus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buses.addBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    }
  });
};

export const useUpdateBus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bus }: { id: string; bus: { name: string; registrationNumber: string; type: string; image: string } }) => buses.updateBus(id, bus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    }
  });
};

export const useDeleteBus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buses.deleteBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    }
  });
};

export const useAddBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (booking: {
      routeId: string;
      route: string;
      busId: string;
      bus: string;
      seats: number[];
      passengers: Passenger[];
      departureDate: string;
      departureTime: string;
      price: number;
      currency: string;
      paymentMethod: string;
      bookedBy: string;
      destination: string;
    }) => {
      const bookingRef = `BK${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          booking_ref: bookingRef,
          route_id: booking.routeId,
          bus_id: booking.busId,
          seats: booking.seats,
          passengers: booking.passengers,
          departure_date: booking.departureDate,
          departure_time: booking.departureTime,
          price: booking.price,
          currency: booking.currency,
          payment_method: booking.paymentMethod,
          booked_by: booking.bookedBy,
          destination: booking.destination
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });
};

export const useLockSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ busId, routeId, seatNumbers, date, reason, lockedBy }: { 
      busId: string; 
      routeId: string; 
      seatNumbers: number[]; 
      date: string;
      reason?: string;
      lockedBy?: string;
    }) => {
      // Get current user name if lockedBy is not provided
      let lockedByName = lockedBy;
      if (!lockedByName) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          lockedByName = profile?.name || user.email || 'Unknown';
        }
      }
      
      return seats.lockSeats(busId, routeId, seatNumbers, date, reason, lockedByName);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lockedSeats', variables.busId, variables.routeId, variables.date] });
    }
  });
};

export const useUnlockSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, routeId, seatNumbers, date }: { 
      busId: string; 
      routeId: string; 
      seatNumbers: number[];
      date: string;
    }) => seats.unlockSeats(busId, routeId, seatNumbers, date),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lockedSeats', variables.busId, variables.routeId, variables.date] });
    }
  });
};

export const useLockedSeats = (busId: string, routeId: string, date: string) => {
  return useQuery({
    queryKey: ['lockedSeats', busId, routeId, date],
    queryFn: async () => seats.getLockedSeats(busId, routeId, date),
    enabled: !!busId && !!routeId && !!date,
    refetchInterval: 5000
  });
};

export const useBookedSeats = (busId: string, routeId: string, date: string) => {
  return useQuery({
    queryKey: ['bookedSeats', busId, routeId, date],
    queryFn: async () => seats.getBookedSeats(busId, routeId, date),
    enabled: !!busId && !!routeId && !!date,
    refetchInterval: 5000
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { count: totalBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('departure_date', today)
        .eq('is_cancelled', false);
      
      if (bookingsError) throw bookingsError;

      const { count: activeRoutes, error: routesError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true });
      
      if (routesError) throw routesError;

      const { data: bookings, error: passengersError } = await supabase
        .from('bookings')
        .select('passengers')
        .eq('departure_date', today)
        .eq('is_cancelled', false);
      
      if (passengersError) throw passengersError;
      
      const totalPassengers = bookings?.reduce((sum, booking) => {
        const passengers = booking.passengers as Passenger[];
        return sum + passengers.length;
      }, 0) || 0;

      const { data: recentBookings, error: recentError } = await supabase
        .from('bookings')
        .select(`
          *,
          route:routes(
            id,
            origin,
            destination
          ),
          bus:buses(
            id,
            name,
            registration_number,
            type
          ),
          booked_by:profiles!bookings_booked_by_fkey(
            id,
            name
          )
        `)
        .eq('is_cancelled', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) throw recentError;

      const { data: popularRoutes, error: popularError } = await supabase
        .from('bookings')
        .select(`
          route:routes(
            origin,
            destination
          )
        `)
        .eq('departure_date', today)
        .eq('is_cancelled', false);
      
      if (popularError) throw popularError;

      const routeStats = popularRoutes?.reduce((acc: { [key: string]: number }, booking) => {
        const routeName = `${booking.route.origin} - ${booking.route.destination}`;
        acc[routeName] = (acc[routeName] || 0) + 1;
        return acc;
      }, {});

      const popularRoutesArray = Object.entries(routeStats || {})
        .map(([route, bookings]) => ({ route, bookings }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);

      return {
        totalBookings: totalBookings || 0,
        activeRoutes: activeRoutes || 0,
        totalPassengers,
        recentBookings: recentBookings || [],
        popularRoutes: popularRoutesArray
      } as DashboardStats;
    },
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });
};

interface Store {
  selectedBus: string | null;
  selectedRoute: string | null;
  selectedDate: string | null;
  selectedSeats: number[];
  currentUser: { id: string; name: string; role?: string; office_id?: string } | null;
  darkMode: boolean;
  lastActivity: number;
  setSelectedBus: (busId: string | null) => void;
  setSelectedRoute: (routeId: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedSeats: (seats: number[]) => void;
  setCurrentUser: (user: { id: string; name: string; role?: string; office_id?: string } | null) => void;
  toggleDarkMode: () => void;
  updateLastActivity: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  reset: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, _get) => ({
      selectedBus: null,
      selectedRoute: null,
      selectedDate: null,
      selectedSeats: [],
      currentUser: null,
      darkMode: false,
      lastActivity: Date.now(),
      setSelectedBus: (busId) => set({ selectedBus: busId }),
      setSelectedRoute: (routeId) => set({ selectedRoute: routeId }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedSeats: (seats) => set({ selectedSeats: seats }),
      setCurrentUser: (user) => set({ currentUser: user }),
      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.darkMode;
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { darkMode: newDarkMode };
        });
      },
      updateLastActivity: () => set({ lastActivity: Date.now() }),
      login: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          if (data.user) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;

            set({ 
              currentUser: { 
                id: data.user.id, 
                name: profileData.name || data.user.email,
                role: profileData.role,
                office_id: profileData.office_id
              },
              lastActivity: Date.now()
            });

            return { success: true };
          }

          return { success: false, error: 'No user data returned' };
        } catch (error: unknown) {
          console.error('Login error:', error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'An error occurred during login' 
          };
        }
      },
      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({ currentUser: null });
        } catch (error) {
          console.error('Logout error:', error);
          throw error;
        }
      },
      reset: () => set({ 
        selectedBus: null, 
        selectedRoute: null, 
        selectedDate: null, 
        selectedSeats: [] 
      })
    }),
    {
      name: 'bus-booking-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        darkMode: state.darkMode,
        lastActivity: state.lastActivity
      })
    }
  )
);

// Session management
if (typeof window !== 'undefined') {
  const checkSession = () => {
    const store = useStore.getState();
    const now = Date.now();
    const timeSinceLastActivity = now - store.lastActivity;

    if (store.currentUser && timeSinceLastActivity > IDLE_TIMEOUT) {
      store.logout();
      window.location.href = '/login';
    }
  };

  // Check session every minute
  setInterval(checkSession, 60 * 1000);

  // Update last activity on user interaction
  const updateActivity = () => {
    useStore.getState().updateLastActivity();
  };

  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('click', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('touchstart', updateActivity);
}
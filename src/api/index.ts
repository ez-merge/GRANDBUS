import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const auth = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

// Bus management functions
export const buses = {
  addBus: async (bus: { name: string; registrationNumber: string; type: string; image: string }) => {
    const { data, error } = await supabase
      .from('buses')
      .insert([{
        name: bus.name,
        registration_number: bus.registrationNumber,
        type: bus.type,
        image: bus.image
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateBus: async (id: string, bus: { name: string; registrationNumber: string; type: string; image: string }) => {
    const { data, error } = await supabase
      .from('buses')
      .update({
        name: bus.name,
        registration_number: bus.registrationNumber,
        type: bus.type,
        image: bus.image
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteBus: async (id: string) => {
    const { error } = await supabase
      .from('buses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Seat management functions
export const seats = {
  lockSeats: async (busId: string, routeId: string, seats: number[], date: string, reason?: string, lockedBy?: string) => {
    const { data: currentData } = await supabase
      .from('bus_routes')
      .select('locked_dates, locked_seat_reason, locked_seat_users')
      .eq('bus_id', busId)
      .eq('route_id', routeId)
      .single();

    const currentLockedDates = currentData?.locked_dates || {};
    const currentReasons = currentData?.locked_seat_reason || {};
    const currentUsers = currentData?.locked_seat_users || {};
    
    // Initialize or get current locks for this date
    const dateKey = date;
    const currentDateLocks = currentLockedDates[dateKey] || [];
    const newDateLocks = [...new Set([...currentDateLocks, ...seats])];
    
    // Update reasons and users if provided
    const newReasons = { ...currentReasons };
    const newUsers = { ...currentUsers };
    
    if (reason || lockedBy) {
      if (!newReasons[dateKey]) {
        newReasons[dateKey] = {};
      }
      if (!newUsers[dateKey]) {
        newUsers[dateKey] = {};
      }
      
      seats.forEach(seat => {
        if (reason) {
          newReasons[dateKey][seat.toString()] = reason;
        }
        if (lockedBy) {
          newUsers[dateKey][seat.toString()] = lockedBy;
        }
      });
    }

    const { error } = await supabase
      .from('bus_routes')
      .update({ 
        locked_dates: { ...currentLockedDates, [dateKey]: newDateLocks },
        locked_seat_reason: newReasons,
        locked_seat_users: newUsers
      })
      .eq('bus_id', busId)
      .eq('route_id', routeId);

    if (error) throw error;
  },

  unlockSeats: async (busId: string, routeId: string, seats: number[], date: string) => {
    const { data: currentData } = await supabase
      .from('bus_routes')
      .select('locked_dates, locked_seat_reason, locked_seat_users')
      .eq('bus_id', busId)
      .eq('route_id', routeId)
      .single();

    const currentLockedDates = currentData?.locked_dates || {};
    const currentReasons = currentData?.locked_seat_reason || {};
    const currentUsers = currentData?.locked_seat_users || {};
    
    // Get current locks for this date
    const dateKey = date;
    const currentDateLocks = currentLockedDates[dateKey] || [];
    const newDateLocks = currentDateLocks.filter((seat: number) => !seats.includes(seat));
    
    // Remove reasons and users for unlocked seats
    const newReasons = { ...currentReasons };
    const newUsers = { ...currentUsers };
    
    if (newReasons[dateKey]) {
      seats.forEach(seat => {
        delete newReasons[dateKey][seat.toString()];
      });
    }
    
    if (newUsers[dateKey]) {
      seats.forEach(seat => {
        delete newUsers[dateKey][seat.toString()];
      });
    }

    const { error } = await supabase
      .from('bus_routes')
      .update({ 
        locked_dates: { ...currentLockedDates, [dateKey]: newDateLocks },
        locked_seat_reason: newReasons,
        locked_seat_users: newUsers
      })
      .eq('bus_id', busId)
      .eq('route_id', routeId);

    if (error) throw error;
  },

  getLockedSeats: async (busId: string, routeId: string, date: string) => {
    const { data, error } = await supabase
      .from('bus_routes')
      .select('locked_dates, locked_seat_reason, locked_seat_users')
      .eq('bus_id', busId)
      .eq('route_id', routeId)
      .single();

    if (error) throw error;
    
    const dateKey = date;
    return {
      lockedSeats: data?.locked_dates?.[dateKey] || [],
      lockedSeatReasons: data?.locked_seat_reason?.[dateKey] || {},
      lockedSeatUsers: data?.locked_seat_users?.[dateKey] || {}
    };
  },

  getBookedSeats: async (busId: string, routeId: string, date: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('seats')
      .eq('bus_id', busId)
      .eq('route_id', routeId)
      .eq('departure_date', date)
      .eq('is_cancelled', false);

    if (error) throw error;
    
    // Flatten all booked seats into a single array
    const bookedSeats = data?.reduce((acc: number[], booking) => {
      return [...acc, ...(booking.seats || [])];
    }, []) || [];

    return bookedSeats;
  }
};

// Manifest functions
export const manifest = {
  getBookings: async (date: string, routeFilter?: string) => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        route:routes(
          id,
          origin,
          destination,
          intermediate_stops,
          base_price,
          currency
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
      .eq('departure_date', date)
      .eq('is_cancelled', false);

    // If route filter is provided, first get the route ID
    if (routeFilter) {
      const [origin, destination] = routeFilter.split(' - ');
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('id')
        .eq('origin', origin)
        .eq('destination', destination)
        .single();

      if (routeError) throw routeError;
      if (routeData) {
        query = query.eq('route_id', routeData.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.map(booking => {
      if (!booking?.route) {
        console.warn(`Booking ${booking?.id} has no route information`);
        return null;
      }

      // Get actual destination from intermediate stops if applicable
      let destination = booking.destination || booking.route.destination;
      const intermediateStops = booking.route.intermediate_stops || [];
      
      // Check if the booking's destination matches any intermediate stop
      for (const stop of intermediateStops) {
        if (stop.name === booking.destination) {
          destination = stop.name;
          break;
        }
      }

      return {
        ...booking,
        route: {
          ...booking.route,
          destination: destination // Use actual destination
        },
        busId: booking.bus?.id,
        routeId: booking.route.id,
        booked_by_name: booking.booked_by?.name || 'Unknown'
      };
    }).filter(Boolean) || [];
  },

  getParcels: async (date: string, routeFilter?: string, officeFilter?: string) => {
    let query = supabase
      .from('parcels')
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
        office:offices(
          id,
          name,
          city
        ),
        booked_by:profiles!parcels_booked_by_fkey(
          id,
          name
        )
      `)
      .eq('departure_date', date)
      .eq('is_cancelled', false);

    if (routeFilter) {
      const [origin, destination] = routeFilter.split(' - ');
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('id')
        .eq('origin', origin)
        .eq('destination', destination)
        .single();

      if (routeError) throw routeError;
      if (routeData) {
        query = query.eq('route_id', routeData.id);
      }
    }

    if (officeFilter && officeFilter !== 'all') {
      query = query.eq('office_id', officeFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.map(parcel => ({
      ...parcel,
      busId: parcel.bus?.id,
      routeId: parcel.route?.id,
      booked_by_name: parcel.booked_by?.name || 'Unknown'
    })) || [];
  },

  getParcelsInStore: async (officeFilter?: string) => {
    let query = supabase
      .from('parcels')
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
        office:offices(
          id,
          name,
          city
        ),
        booked_by:profiles!parcels_booked_by_fkey(
          id,
          name
        )
      `)
      .is('bus_id', null)
      .eq('is_cancelled', false)
      .order('stored_date', { ascending: false });

    if (officeFilter && officeFilter !== 'all') {
      query = query.eq('office_id', officeFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.map(parcel => ({
      ...parcel,
      busId: parcel.bus?.id,
      routeId: parcel.route?.id,
      booked_by_name: parcel.booked_by?.name || 'Unknown'
    })) || [];
  },

  getCancelledBookings: async (date: string) => {
    const { data: ticketCancellations, error: ticketError } = await supabase
      .from('cancellation_history')
      .select(`
        *,
        cancelled_by:profiles!cancellation_history_cancelled_by_fkey(
          id,
          name
        )
      `)
      .eq('departure_date', date)
      .order('cancelled_at', { ascending: false });

    if (ticketError) throw ticketError;

    const { data: parcelCancellations, error: parcelError } = await supabase
      .from('parcel_cancellation_history')
      .select(`
        *,
        cancelled_by:profiles!parcel_cancellation_history_cancelled_by_fkey(
          id,
          name
        )
      `)
      .eq('departure_date', date)
      .order('cancelled_at', { ascending: false });

    if (parcelError) throw parcelError;

    // Combine and format both types of cancellations
    const allCancellations = [
      ...(ticketCancellations || []).map(item => ({ ...item, type: 'ticket' })),
      ...(parcelCancellations || []).map(item => ({ ...item, type: 'parcel' }))
    ];

    return allCancellations.sort((a, b) => 
      new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime()
    );
  },

  cancelBooking: async (bookingId: string, reason: string, cancelledBy: string) => {
    // First check if this is a ticket or parcel
    const { data: parcel, error: parcelError } = await supabase
      .from('parcels')
      .select('id')
      .eq('id', bookingId)
      .maybeSingle();

    if (parcelError) throw parcelError;

    if (parcel) {
      // This is a parcel - update the is_cancelled flag and other fields
      const { error: updateError } = await supabase
        .from('parcels')
        .update({
          is_cancelled: true,
          cancellation_reason: reason,
          cancelled_by: cancelledBy,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;
    } else {
      // This is a ticket - use the RPC function
      const { error: rpcError } = await supabase.rpc('cancel_booking', {
        booking_id: bookingId,
        cancellation_reason: reason,
        cancelled_by_id: cancelledBy
      });

      if (rpcError) throw rpcError;
    }
  },

  updateParcel: async (parcelId: string, updates: { bus_id?: string }) => {
    const { data, error } = await supabase
      .from('parcels')
      .update(updates)
      .eq('id', parcelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getAvailableBusesForRoute: async (routeId: string, date: string) => {
    const { data, error } = await supabase
      .from('bus_routes')
      .select(`
        bus_id,
        buses:buses(
          id,
          name,
          registration_number,
          type
        )
      `)
      .eq('route_id', routeId);

    if (error) throw error;
    return data?.map(item => item.buses).filter(Boolean) || [];
  }
};

// Parcel management functions
export const parcels = {
  addParcel: async (parcel: {
    routeId: string;
    route: string;
    busId: string;
    bus: string;
    sender_name: string;
    sender_phone: string;
    receiver_name: string;
    receiver_phone: string;
    item_type: string;
    item_name: string;
    weight?: number;
    description?: string;
    departureDate: string;
    departureTime: string;
    price: number;
    currency: string;
    paymentMethod: string;
    bookedBy: string;
    destination: string;
  }) => {
    // Ensure required string fields are not null/undefined
    const sender_name = String(parcel.sender_name || '').trim();
    const sender_phone = String(parcel.sender_phone || '').trim();
    const receiver_name = String(parcel.receiver_name || '').trim();
    const receiver_phone = String(parcel.receiver_phone || '').trim();
    const item_type = String(parcel.item_type || '').trim();
    const item_name = String(parcel.item_name || '').trim();

    // Validate required fields
    if (!sender_name || !sender_phone || !receiver_name || !receiver_phone || !item_type || !item_name) {
      throw new Error('All required fields must be filled');
    }

    const parcelRef = `PL${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('parcels')
      .insert({
        parcel_ref: parcelRef,
        route_id: parcel.routeId,
        bus_id: parcel.busId,
        sender_name,
        sender_phone,
        receiver_name,
        receiver_phone,
        item_type,
        item_name,
        weight: parcel.weight,
        description: parcel.description?.trim(),
        departure_date: parcel.departureDate,
        departure_time: parcel.departureTime,
        price: parcel.price,
        currency: parcel.currency,
        payment_method: parcel.paymentMethod,
        booked_by: parcel.bookedBy,
        stored_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
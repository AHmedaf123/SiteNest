/**
 * Enhanced Availability System Usage Examples
 * Demonstrates how to use the new centralized availability service
 */

import { AvailabilityService } from '../services/availability.service';

// Initialize the service
const availabilityService = new AvailabilityService();

/**
 * Example 1: Basic Availability Check with Check-in/Check-out Dates
 */
async function basicAvailabilityCheck() {
  console.log('=== Basic Availability Check ===');
  
  const result = await availabilityService.checkAvailability({
    apartmentId: 1,
    checkIn: '2024-02-15',
    checkOut: '2024-02-18',
    includePendingReservations: true
  });

  console.log('Availability Result:', {
    isAvailable: result.isAvailable,
    reason: result.reason,
    conflictingBookings: result.conflictingBookings?.length || 0,
    conflictingReservations: result.conflictingReservations?.length || 0,
    availableFrom: result.availableFrom,
    availableUntil: result.availableUntil
  });
}

/**
 * Example 2: Bulk Availability Check for Multiple Apartments
 */
async function bulkAvailabilityCheck() {
  console.log('=== Bulk Availability Check ===');
  
  const results = await availabilityService.checkBulkAvailability({
    apartmentIds: [1, 2, 3, 4, 5],
    checkIn: '2024-02-15',
    checkOut: '2024-02-18',
    includePendingReservations: true
  });

  console.log('Bulk Results:');
  Object.entries(results).forEach(([apartmentId, result]) => {
    console.log(`Apartment ${apartmentId}: ${result.isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    if (!result.isAvailable) {
      console.log(`  Reason: ${result.reason}`);
      console.log(`  Next available: ${result.availableFrom || 'Unknown'}`);
    }
  });
}

/**
 * Example 3: Calendar Availability with Same-Day Checkout/Checkin Logic
 */
async function calendarAvailability() {
  console.log('=== Calendar Availability (Check-in/Check-out Range) ===');
  
  const calendarData = await availabilityService.getCalendarAvailability(
    1, // apartmentId
    '2024-02-01', // startDate
    '2024-02-28'  // endDate
  );

  console.log(`Calendar data for ${calendarData.length} days:`);
  
  // Show first 10 days as example
  calendarData.slice(0, 10).forEach(day => {
    const status = day.isAvailable ? '✅ Available' : '❌ Occupied';
    const details = [];
    
    if (day.hasCheckIn) details.push('Check-in');
    if (day.hasCheckOut) details.push('Check-out');
    if (day.booking) details.push(`Booking #${day.booking.id}`);
    if (day.reservation) details.push(`Reserved until ${day.reservation.expiresAt}`);
    
    console.log(`${day.date}: ${status} ${details.length ? `(${details.join(', ')})` : ''}`);
  });
}

/**
 * Example 4: Date Range Availability with Available Periods
 */
async function dateRangeAvailability() {
  console.log('=== Date Range Availability Analysis ===');
  
  const analysis = await availabilityService.getDateRangeAvailability({
    apartmentId: 1,
    startDate: '2024-02-01',
    endDate: '2024-02-28',
    minStayDays: 3 // Minimum 3-day stays
  });

  console.log('Availability Analysis:', {
    apartmentId: analysis.apartmentId,
    totalAvailableDays: analysis.totalAvailableDays,
    occupancyRate: `${analysis.occupancyRate}%`,
    availablePeriods: analysis.availablePeriods.length
  });

  console.log('Available Periods:');
  analysis.availablePeriods.forEach((period, index) => {
    const days = Math.ceil(
      (new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    
    console.log(`${index + 1}. ${period.startDate} to ${period.endDate} (${days} days) ${
      period.minStayMet ? '✅ Meets min stay' : '❌ Too short'
    }`);
  });
}

/**
 * Example 5: Create Temporary Reservation (Hold)
 */
async function createReservation() {
  console.log('=== Create Temporary Reservation ===');
  
  try {
    const reservation = await availabilityService.createReservation(
      'user-123', // userId
      1,          // apartmentId
      '2024-02-15', // checkIn
      '2024-02-18', // checkOut
      45          // holdMinutes (45 minutes hold)
    );

    console.log('Reservation Created:', {
      id: reservation.id,
      apartmentId: reservation.apartmentId,
      userId: reservation.userId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      expiresAt: reservation.expiresAt,
      status: reservation.status
    });
  } catch (error) {
    console.error('Failed to create reservation:', (error as Error).message);
  }
}

/**
 * Example 6: Release Expired Reservations
 */
async function releaseExpiredReservations() {
  console.log('=== Release Expired Reservations ===');
  
  const releasedCount = await availabilityService.releaseExpiredReservations();
  console.log(`Released ${releasedCount} expired reservations`);
}

/**
 * Example 7: API Usage Examples
 */
function apiUsageExamples() {
  console.log('=== API Usage Examples ===');
  
  interface BaseAPIExample {
    method: string;
    url: string;
    description: string;
  }
  
  interface APIExampleWithBody extends BaseAPIExample {
    body: Record<string, any>;
  }
  
  interface APIExampleWithHeaders extends BaseAPIExample {
    headers: Record<string, string>;
  }
  
  interface APIExampleWithBodyAndHeaders extends BaseAPIExample {
    body: Record<string, any>;
    headers: Record<string, string>;
  }
  
  type APIExample = BaseAPIExample | APIExampleWithBody | APIExampleWithHeaders | APIExampleWithBodyAndHeaders;
  
  const examples: Record<string, APIExample> = {
    // Enhanced calendar availability
    calendarAPI: {
      method: 'GET',
      url: '/api/enhanced-availability/calendar/1?startDate=2024-02-01&endDate=2024-02-28',
      description: 'Get calendar availability for apartment 1 from Feb 1-28, 2024'
    },
    
    // Bulk availability check
    bulkAPI: {
      method: 'POST',
      url: '/api/enhanced-availability/bulk',
      body: {
        apartmentIds: [1, 2, 3],
        checkIn: '2024-02-15',
        checkOut: '2024-02-18',
        includePendingReservations: true
      },
      description: 'Check availability for multiple apartments'
    },
    
    // Date range analysis
    dateRangeAPI: {
      method: 'GET',
      url: '/api/enhanced-availability/date-range/1?startDate=2024-02-01&endDate=2024-02-28&minStayDays=3',
      description: 'Get available periods for apartment 1 with minimum 3-day stays'
    },
    
    // Create reservation
    reserveAPI: {
      method: 'POST',
      url: '/api/enhanced-availability/reserve',
      headers: { 'Authorization': 'Bearer <token>' },
      body: {
        apartmentId: 1,
        checkIn: '2024-02-15',
        checkOut: '2024-02-18',
        holdMinutes: 45
      },
      description: 'Create a 45-minute hold on apartment 1'
    },
    
    // Enhanced availability check
    enhancedCheckAPI: {
      method: 'POST',
      url: '/api/enhanced-availability/check',
      body: {
        apartmentId: 1,
        checkIn: '2024-02-15',
        checkOut: '2024-02-18',
        includePendingReservations: true
      },
      description: 'Enhanced availability check with detailed information'
    }
  };

  Object.entries(examples).forEach(([name, example]) => {
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`${example.method} ${example.url}`);
    if ('body' in example) {
      console.log('Body:', JSON.stringify(example.body, null, 2));
    }
    if ('headers' in example) {
      console.log('Headers:', JSON.stringify(example.headers, null, 2));
    }
    console.log(`Description: ${example.description}`);
  });
}

/**
 * Example 8: Frontend Integration Examples
 */
function frontendIntegrationExamples() {
  console.log('=== Frontend Integration Examples ===');
  
  const jsExamples = `
// React/JavaScript Frontend Examples

// 1. Check availability for date range
async function checkAvailability(apartmentId, checkIn, checkOut) {
  const response = await fetch('/api/enhanced-availability/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apartmentId,
      checkIn,
      checkOut,
      includePendingReservations: true
    })
  });
  
  const result = await response.json();
  return result.data;
}

// 2. Get calendar data for booking interface
async function getCalendarData(apartmentId, startDate, endDate) {
  const response = await fetch(
    \`/api/enhanced-availability/calendar/\${apartmentId}?startDate=\${startDate}&endDate=\${endDate}\`
  );
  
  const result = await response.json();
  return result.data;
}

// 3. Check multiple apartments at once
async function checkMultipleApartments(apartmentIds, checkIn, checkOut) {
  const response = await fetch('/api/enhanced-availability/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apartmentIds,
      checkIn,
      checkOut
    })
  });
  
  const result = await response.json();
  return result.data;
}

// 4. Create temporary reservation during booking process
async function holdRoom(apartmentId, checkIn, checkOut, token) {
  const response = await fetch('/api/enhanced-availability/reserve', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`
    },
    body: JSON.stringify({
      apartmentId,
      checkIn,
      checkOut,
      holdMinutes: 45
    })
  });
  
  const result = await response.json();
  return result.data;
}

// 5. Get available periods for flexible date selection
async function getAvailablePeriods(apartmentId, startDate, endDate, minStayDays = 1) {
  const response = await fetch(
    \`/api/enhanced-availability/date-range/\${apartmentId}?startDate=\${startDate}&endDate=\${endDate}&minStayDays=\${minStayDays}\`
  );
  
  const result = await response.json();
  return result.data;
}
`;

  console.log(jsExamples);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicAvailabilityCheck();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await bulkAvailabilityCheck();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await calendarAvailability();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await dateRangeAvailability();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await createReservation();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await releaseExpiredReservations();
    console.log('\n' + '='.repeat(50) + '\n');
    
    apiUsageExamples();
    console.log('\n' + '='.repeat(50) + '\n');
    
    frontendIntegrationExamples();
    
  } catch (error) {
    console.error('Example execution failed:', (error as Error).message);
  }
}

// Export for use in other files
export {
  basicAvailabilityCheck,
  bulkAvailabilityCheck,
  calendarAvailability,
  dateRangeAvailability,
  createReservation,
  releaseExpiredReservations,
  runAllExamples
};

// Run examples if this file is executed directly
// Note: In ES modules, use import.meta.main when available, or remove this check
// if (import.meta.main) {
//   runAllExamples();
// }
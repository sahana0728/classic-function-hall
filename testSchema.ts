import { z } from 'zod';
import { users, themes, bookings, enquiries, bookingDetailsSchema } from './shared/schema.ts';
import { api } from './shared/routes.ts';
import { parseWithLogging } from './src/lib/api.ts';

const mockEnquiry = {
  id: "1",
  name: "John",
  phone: "123",
  startDate: "2024-05-10",
  endDate: "2024-05-11",
  notes: null
};

// Check what the zod schema actually is
console.log("api.enquiries.list.responses[200]:", api.enquiries.list.responses[200]);

try {
  const result = parseWithLogging(api.enquiries.list.responses[200], [mockEnquiry], "enquiries.list");
  console.log("parseWithLogging Result:", result);
} catch (e) {
  console.error("Error!!!", e);
}

try {
  const mockBooking = {
    id: "1", customerName: "A", phone: "123", startDate: "2024-05-10", endDate: "2024-05-11", 
    totalAmount: 100, advancePaid: 50, themeId: 1, notes: null, status: 'Booked',
    themeName: "Theme", themeImage: "img"
  };
  const result2 = parseWithLogging(api.bookings.list.responses[200], [mockBooking], "bookings.list");
  console.log("parseWithLogging Booking Result:", result2);
} catch (e) {
  console.error("Booking Error!!!", e);
}

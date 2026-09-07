type BookingDateSpan = {
  startDate: string;
  endDate: string;
};

export function bookingMatchesDateRange(
  booking: BookingDateSpan,
  fromDate: string,
  toDate: string,
) {
  if (!fromDate && !toDate) return true;

  const bookingStart = new Date(booking.startDate);
  const bookingEnd = new Date(booking.endDate);
  if (Number.isNaN(bookingStart.getTime()) || Number.isNaN(bookingEnd.getTime())) return false;

  bookingStart.setHours(0, 0, 0, 0);
  bookingEnd.setHours(23, 59, 59, 999);

  const filterStart = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const filterEnd = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

  if (filterStart && filterEnd) {
    return bookingStart <= filterEnd && bookingEnd >= filterStart;
  }
  if (filterStart) return bookingEnd >= filterStart;
  if (filterEnd) return bookingStart <= filterEnd;
  return true;
}

// Helper to get date ranges in IST
export function getDateRange(filter, customDateRange = null) {
  // Get current date in IST (Asia/Kolkata)
  // format: YYYY-MM-DD
  const now = new Date();
  const istDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  // Helper to create IST Date
  const createISTDate = (dateStr, timeStr) =>
    new Date(`${dateStr}T${timeStr}+05:30`);

  const todayStart = createISTDate(istDateStr, "00:00:00");
  const todayEnd = createISTDate(istDateStr, "23:59:59.999");

  // For Yesterday calculation
  const getYesterdayDates = () => {
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
    return { startDate: yesterdayStart, endDate: yesterdayEnd };
  };

  if (filter === "Custom" && customDateRange?.from && customDateRange?.to) {
    const startDate = new Date(customDateRange.from);
    // set end date to end of day if it's the same day, or just use the provided date
    const endDate = new Date(customDateRange.to);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Handle named filters
  switch (filter) {
    case "Today":
      return { startDate: todayStart, endDate: todayEnd };

    case "Yesterday":
      return getYesterdayDates();

    case "Last 7 Days": {
      const start = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 14 Days": {
      const start = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 30 Days": {
      const start = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "Last 90 Days": {
      const start = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "This Month": {
      const start = new Date(
        todayStart.getFullYear(),
        todayStart.getMonth(),
        1,
      );
      return { startDate: start, endDate: todayEnd };
    }

    case "Last Month": {
      const start = new Date(
        todayStart.getFullYear(),
        todayStart.getMonth() - 1,
        1,
      );
      const end = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case "Last 3 Months": {
      const start = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: todayEnd };
    }

    case "All Time":
    default:
      return { startDate: null, endDate: null };
  }
}

// Helper to get date shifted to IST (UTC + 5:30) for display alignment
export function getDisplayDate(dateStr) {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  // Add 5 hours 30 minutes to recover Local Face Value from the UTC-shifted string
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
}

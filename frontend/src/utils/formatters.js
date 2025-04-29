import { format, parseISO } from 'date-fns';

/**
 * Formats a number as LKR currency.
 * @param {number | string | null | undefined} amount - The amount to format.
 * @returns {string} - Formatted currency string or "N/A".
 */
export const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (amount === null || amount === undefined || isNaN(numericAmount)) {
    return "N/A";
  }
  return numericAmount.toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats a date string or Date object.
 * @param {string | Date | null | undefined} dateInput - The date to format.
 * @param {string} formatString - The desired date format (defaults to 'MMM d, yyyy').
 * @returns {string} - Formatted date string or "N/A".
 */
export const formatDate = (dateInput, formatString = 'MMM d, yyyy') => {
  if (!dateInput) return "N/A";
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(date, formatString);
  } catch (error) {
    console.error("Error formatting date:", dateInput, error);
    return "Invalid Date";
  }
};

/**
 * Formats a date for API requests (YYYY-MM-DD).
 * @param {Date | null | undefined} date - The date to format.
 * @returns {string | null} - Formatted date string or null.
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  try {
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error formatting date for API:", date, error);
    return null;
  }
};

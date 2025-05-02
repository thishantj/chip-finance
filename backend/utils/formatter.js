// Function to format date as YYYY-MM-DD (or your preferred format)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Adjust for potential timezone issues if needed, or use a library like date-fns
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return 'Invalid Date';
  }
};

// Function to format currency (LKR)
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "LKR 0.00"; // Default or N/A
  return parseFloat(amount).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

module.exports = {
  formatDate,
  formatCurrency,
};

function formatDate(date) {
    if (!date) return null; // Handle null or undefined dates
    // Ensure it's a Date object
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null; // Handle invalid dates

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = { formatDate };

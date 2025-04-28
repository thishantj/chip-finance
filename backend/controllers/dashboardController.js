const pool = require('../config/db');
// Import core functions from date-fns
const { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } = require('date-fns');
// Import only the timezone-specific function needed from date-fns-tz
const { toZonedTime } = require('date-fns-tz');

const timeZone = 'Asia/Colombo'; // Define the target timezone

// Helper to get the start and end of the current week (Monday to Sunday) in Colombo Timezone
const getCurrentWeekBounds = () => {
    const now = new Date(); // Current time in UTC
    // Use toZonedTime from date-fns-tz
    const nowInColombo = toZonedTime(now, timeZone);

    // Use core functions from date-fns, passing the timeZone option
    const start = startOfWeek(nowInColombo, { timeZone, weekStartsOn: 1 });
    const end = endOfWeek(nowInColombo, { timeZone, weekStartsOn: 1 });

    // Return standard Date objects. The database driver should handle conversion
    // based on the connection's timezone settings or assume UTC.
    // These Date objects represent the UTC instants corresponding to the Colombo timezone boundaries.
    return { start, end };
};

// Helper to get the start and end of the previous week (Monday to Sunday) in Colombo Timezone
const getPreviousWeekBounds = () => {
    const now = new Date();
    // Use toZonedTime from date-fns-tz
    const nowInColombo = toZonedTime(now, timeZone);
    // Use core functions from date-fns
    const startOfCurrentWeek = startOfWeek(nowInColombo, { timeZone, weekStartsOn: 1 });
    const startOfPreviousWeek = subWeeks(startOfCurrentWeek, 1);
    const endOfPreviousWeek = endOfWeek(startOfPreviousWeek, { timeZone, weekStartsOn: 1 });

    return { start: startOfPreviousWeek, end: endOfPreviousWeek };
};

// Helper to get the start and end of the current month using Colombo Timezone
const getCurrentMonthBounds = () => {
    const now = new Date();
    // Use toZonedTime from date-fns-tz
    const nowInColombo = toZonedTime(now, timeZone);
    // Use core functions from date-fns
    const start = startOfMonth(nowInColombo, { timeZone });
    const end = endOfMonth(nowInColombo, { timeZone });
    return { start, end };
};

// Helper to get the start and end of the previous month using Colombo Timezone
const getPreviousMonthBounds = () => {
     const now = new Date();
     // Use toZonedTime from date-fns-tz
     const nowInColombo = toZonedTime(now, timeZone);
     // Use core functions from date-fns
     const startOfCurrentMonth = startOfMonth(nowInColombo, { timeZone });
     const startOfPreviousMonth = subMonths(startOfCurrentMonth, 1);
     const endOfPreviousMonth = endOfMonth(startOfPreviousMonth, { timeZone });
     return { start: startOfPreviousMonth, end: endOfPreviousMonth };
};


// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
    if (previous > 0) {
        return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    } else if (current > 0) {
        return 100.0; // Infinite increase effectively
    }
    return 0.0; // No change if both are 0 or previous is 0 and current is 0
};

// Get total payments made this week (Monday-Sunday) and percentage change from last week
exports.getWeeklyPaymentsSummary = async (req, res) => {
    try {
        const currentWeek = getCurrentWeekBounds(); // Uses Colombo TZ
        const previousWeek = getPreviousWeekBounds(); // Uses Colombo TZ
        
        const sql = `SELECT SUM(amount_paid) as totalAmount FROM payment_history WHERE payment_date BETWEEN ? AND ?`;

        const [[currentRows], [previousRows]] = await Promise.all([
            pool.query(sql, [currentWeek.start, currentWeek.end]),
            pool.query(sql, [previousWeek.start, previousWeek.end])
        ]);

        const currentAmount = currentRows[0]?.totalAmount || 0; // Use optional chaining
        const previousAmount = previousRows[0]?.totalAmount || 0; // Use optional chaining
        const percentageChange = calculatePercentageChange(currentAmount, previousAmount);

        res.status(200).json({
            totalAmount: currentAmount,
            percentageChange: percentageChange
        });
    } catch (error) {
        console.error('Error fetching weekly payments summary:', error);
        res.status(500).json({ message: 'Server error fetching weekly payments summary' });
    }
};

// Get total payments made this month and percentage change from last month
exports.getMonthlyPaymentsSummary = async (req, res) => {
    try {
        const currentMonth = getCurrentMonthBounds(); // Uses Colombo TZ
        const previousMonth = getPreviousMonthBounds(); // Uses Colombo TZ
        const sql = `SELECT SUM(amount_paid) as totalAmount FROM payment_history WHERE payment_date BETWEEN ? AND ?`;

        const [[currentRows], [previousRows]] = await Promise.all([
            pool.query(sql, [currentMonth.start, currentMonth.end]),
            pool.query(sql, [previousMonth.start, previousMonth.end])
        ]);

        const currentAmount = currentRows[0].totalAmount || 0;
        const previousAmount = previousRows[0].totalAmount || 0;
        const percentageChange = calculatePercentageChange(currentAmount, previousAmount);

        res.status(200).json({
            totalAmount: currentAmount,
            percentageChange: percentageChange
        });
    } catch (error) {
        console.error('Error fetching monthly payments summary:', error);
        res.status(500).json({ message: 'Server error fetching monthly payments summary' });
    }
};

// Get count of loans created this month and percentage change from last month
exports.getMonthlyLoansCountSummary = async (req, res) => {
    try {
        const currentMonth = getCurrentMonthBounds(); // Uses Colombo TZ
        const previousMonth = getPreviousMonthBounds(); // Uses Colombo TZ
        const sql = `SELECT COUNT(loan_id) as count FROM loans WHERE created_at BETWEEN ? AND ?`;

        const [[currentRows], [previousRows]] = await Promise.all([
            pool.query(sql, [currentMonth.start, currentMonth.end]),
            pool.query(sql, [previousMonth.start, previousMonth.end])
        ]);

        const currentCount = currentRows[0].count || 0;
        const previousCount = previousRows[0].count || 0;
        const percentageChange = calculatePercentageChange(currentCount, previousCount);

        res.status(200).json({
            count: currentCount,
            percentageChange: percentageChange
        });
    } catch (error) {
        console.error('Error fetching monthly loans count summary:', error);
        res.status(500).json({ message: 'Server error fetching monthly loans count summary' });
    }
};

// Get count of new clients this month and percentage change from last month
exports.getMonthlyNewClientsSummary = async (req, res) => {
    try {
        const currentMonth = getCurrentMonthBounds(); // Uses Colombo TZ
        const previousMonth = getPreviousMonthBounds(); // Uses Colombo TZ

        const currentSql = `SELECT COUNT(client_id) as count FROM clients WHERE created_at BETWEEN ? AND ?`;
        const previousSql = `SELECT COUNT(client_id) as count FROM clients WHERE created_at BETWEEN ? AND ?`;

        const [[currentRows], [previousRows]] = await Promise.all([
            pool.query(currentSql, [currentMonth.start, currentMonth.end]),
            pool.query(previousSql, [previousMonth.start, previousMonth.end])
        ]);

        const currentCount = currentRows[0].count || 0;
        const previousCount = previousRows[0].count || 0;
        const percentageChange = calculatePercentageChange(currentCount, previousCount);

        res.status(200).json({
            count: currentCount,
            percentageChange: percentageChange
        });

    } catch (error) {
        console.error('Error fetching monthly new clients summary:', error);
        res.status(500).json({ message: 'Server error fetching monthly new clients summary' });
    }
};

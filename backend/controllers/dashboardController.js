const pool = require('../config/db');

// Helper to get the start and end of the current week (Monday to Sunday)
const getCurrentWeekBounds = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Adjust Sunday to be end of week
    const firstDayOfWeek = new Date(now.setDate(now.getDate() + diffToMonday));
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6); // Sunday

    firstDayOfWeek.setHours(0, 0, 0, 0);
    lastDayOfWeek.setHours(23, 59, 59, 999);
    return { start: firstDayOfWeek, end: lastDayOfWeek };
};

// Helper to get the start and end of the previous week (Monday to Sunday)
const getPreviousWeekBounds = () => {
    const { start: currentWeekStart } = getCurrentWeekBounds();
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1); // End is Sunday of previous week
    const previousWeekStart = new Date(previousWeekEnd);
    previousWeekStart.setDate(previousWeekStart.getDate() - 6); // Start is Monday of previous week

    previousWeekStart.setHours(0, 0, 0, 0);
    previousWeekEnd.setHours(23, 59, 59, 999);
    return { start: previousWeekStart, end: previousWeekEnd };
};

// Helper to get the start and end of the current month
const getCurrentMonthBounds = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    return { start: firstDayOfMonth, end: lastDayOfMonth };
};

// Helper to get the start and end of the previous month
const getPreviousMonthBounds = () => {
    const now = new Date();
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    firstDayOfPreviousMonth.setHours(0, 0, 0, 0);
    lastDayOfPreviousMonth.setHours(23, 59, 59, 999);
    return { start: firstDayOfPreviousMonth, end: lastDayOfPreviousMonth };
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
        const currentWeek = getCurrentWeekBounds();
        const previousWeek = getPreviousWeekBounds();
        const sql = `SELECT SUM(amount_paid) as totalAmount FROM payment_history WHERE payment_date BETWEEN ? AND ?`;

        const [[currentRows], [previousRows]] = await Promise.all([
            pool.query(sql, [currentWeek.start, currentWeek.end]),
            pool.query(sql, [previousWeek.start, previousWeek.end])
        ]);

        const currentAmount = currentRows[0].totalAmount || 0;
        const previousAmount = previousRows[0].totalAmount || 0;
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
        const currentMonth = getCurrentMonthBounds();
        const previousMonth = getPreviousMonthBounds();
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
        const currentMonth = getCurrentMonthBounds();
        const previousMonth = getPreviousMonthBounds();
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
        const currentMonth = getCurrentMonthBounds();
        const previousMonth = getPreviousMonthBounds();

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

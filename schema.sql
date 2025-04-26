-- Database: loan_management

CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nic VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    telephone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    principal_amount DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL, -- Annual interest rate (e.g., 10.00 for 10%)
    loan_term_days INT NOT NULL,      -- Total duration of the loan in days
    installment_frequency_days INT NOT NULL, -- Number of days between installments
    total_amount_due DECIMAL(10, 2), -- Calculated total amount including interest
    installment_amount DECIMAL(10, 2), -- Calculated amount per installment
    status ENUM('active', 'fully_paid') DEFAULT 'active', -- Added status column
    next_payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

CREATE TABLE installments (
    installment_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL, -- Add this column to store the expected amount for the installment
    payment_date DATE,
    paid_amount DECIMAL(10, 2),
    status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id),
    UNIQUE KEY unique_installment (loan_id, installment_number)
);

CREATE TABLE payment_history (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    installment_id INT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount_paid DECIMAL(10, 2) NOT NULL,
    recorded_by_admin INT, -- Optional: To track which admin recorded the payment
    FOREIGN KEY (installment_id) REFERENCES installments(installment_id),
    FOREIGN KEY (recorded_by_admin) REFERENCES admins(admin_id)
);
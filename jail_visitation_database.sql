-- Drop existing tables if they exist
-- Drop existing tables if they exist
DROP TABLE IF EXISTS scanned_visitors;
DROP TABLE IF EXISTS visitors;
DROP TABLE IF EXISTS denied_visitors;
DROP TABLE IF EXISTS pdls;

-- Create PDLs table
CREATE TABLE pdls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  dorm_number VARCHAR(50) NOT NULL,
  criminal_case_no VARCHAR(100),
  offense_charge VARCHAR(255),
  court_branch VARCHAR(255),
  arrest_date DATE,
  commitment_date DATE,
  first_time_offender TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Visitors table
CREATE TABLE visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pdl_id INT NOT NULL,
  visitor_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  address VARCHAR(255) NOT NULL,
  valid_id VARCHAR(255) NOT NULL,
  date_of_application DATE NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  time_in DATETIME DEFAULT NULL,
  time_out DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pdl_id) REFERENCES pdls(id) ON DELETE CASCADE
);

-- Create Denied Visitors table with user-specified columns
CREATE TABLE denied_visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_name VARCHAR(255) NOT NULL,
  pdl_name VARCHAR(255) NOT NULL,
  dorm VARCHAR(50) NOT NULL,
  time_in DATETIME NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Scanned Visitors table
CREATE TABLE scanned_visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_name VARCHAR(255) NOT NULL,
  pdl_name VARCHAR(255) NOT NULL,
  dorm VARCHAR(50) NOT NULL,
  time_in DATETIME NOT NULL,
  time_out DATETIME DEFAULT NULL,
  scan_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Optional: Insert sample data into pdls table
INSERT INTO pdls (last_name, first_name, middle_name, dorm_number, criminal_case_no, offense_charge, court_branch, arrest_date, commitment_date, first_time_offender) VALUES
('Doe', 'John', 'A', 'D1', 'CC123', 'Theft', 'Branch 1', '2025-01-01', '2025-01-15', 1),
('Smith', 'Jane', 'B', 'D2', 'CC456', 'Fraud', 'Branch 2', '2025-02-01', '2025-02-15', 0);

-- Optional: Insert sample data into visitors table
INSERT INTO visitors (pdl_id, visitor_id, name, relationship, age, address, valid_id, date_of_application, contact_number) VALUES
(1, 'VIS-1001', 'Alice Johnson', 'Friend', 30, '123 Main St', 'ID12345', '2025-05-01', '555-1234'),
(1, 'VIS-1002', 'Bob Williams', 'Brother', 40, '456 Oak Ave', 'ID67890', '2025-05-02', '555-5678');

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

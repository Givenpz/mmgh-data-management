-- SQL init script for MMGH Project

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  full_name VARCHAR,
  role VARCHAR DEFAULT 'pending',
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR NOT NULL,
  table_name VARCHAR,
  record_id VARCHAR,
  details TEXT,
  ip_address VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  dob DATE,
  gender VARCHAR,
  phone VARCHAR,
  address TEXT,
  emergency_contact VARCHAR,
  blood_group VARCHAR,
  status VARCHAR,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR PRIMARY KEY,
  patient_id VARCHAR,
  patient_name VARCHAR,
  doctor VARCHAR,
  date DATE,
  time VARCHAR,
  reason TEXT,
  status VARCHAR,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS records (
  id VARCHAR PRIMARY KEY,
  patient_id VARCHAR,
  patient_name VARCHAR,
  doctor VARCHAR,
  date DATE,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  vitals TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR,
  department VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  join_date DATE,
  status VARCHAR,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Optional: insert admin user (password: hashed version of 'admin123')
-- INSERT INTO users (username, email, password, full_name, role, status, approved_at) 
-- VALUES ('admin', 'admin@mmgh.local', 'hashed_password', 'System Administrator', 'admin', 'approved', CURRENT_TIMESTAMP);

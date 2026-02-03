-- SQL init script for MMGH Project

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
  status VARCHAR
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
  notes TEXT
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
  notes TEXT
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
  status VARCHAR
);

-- Optional: insert demo data (commented)
-- INSERT INTO patients (id, first_name, last_name) VALUES ('MMGH-P-1001','John','Mwila');

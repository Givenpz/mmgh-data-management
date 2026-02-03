require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve the frontend file
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'hospital-management.html'));
});

// Static for assets if any
app.use('/static', express.static(path.join(__dirname, 'static')));

// GET all data
app.get('/api/data', async (req, res) => {
  try {
    const patients = (await db.query('SELECT * FROM patients ORDER BY id')).rows;
    const appointments = (await db.query('SELECT * FROM appointments ORDER BY id')).rows;
    const records = (await db.query('SELECT * FROM records ORDER BY id')).rows;
    const staff = (await db.query('SELECT * FROM staff ORDER BY id')).rows;
    res.json({ patients, appointments, records, staff });
  } catch (err) {
    console.error('Error fetching data', err);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Bulk replace (overwrite) - used by frontend save fallback
app.post('/api/bulk', async (req, res) => {
  const { patients = [], appointments = [], records = [], staff = [] } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE appointments, records, staff, patients RESTART IDENTITY CASCADE');

    for (const p of patients) {
      await client.query(
        `INSERT INTO patients(id, first_name, last_name, dob, gender, phone, address, emergency_contact, blood_group, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p.id, p.firstName, p.lastName, p.dob, p.gender, p.phone, p.address, p.emergencyContact, p.bloodGroup, p.status]
      );
    }

    for (const a of appointments) {
      await client.query(
        `INSERT INTO appointments(id, patient_id, patient_name, doctor, date, time, reason, status, notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [a.id, a.patientId || a.patient_id, a.patientName || a.patient_name, a.doctor, a.date, a.time, a.reason, a.status, a.notes]
      );
    }

    for (const r of records) {
      await client.query(
        `INSERT INTO records(id, patient_id, patient_name, doctor, date, diagnosis, treatment, prescription, vitals, notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [r.id, r.patientId || r.patient_id, r.patientName || r.patient_name, r.doctor, r.date, r.diagnosis, r.treatment, r.prescription, r.vitals, r.notes]
      );
    }

    for (const s of staff) {
      await client.query(
        `INSERT INTO staff(id, first_name, last_name, role, department, phone, email, address, join_date, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [s.id, s.firstName, s.lastName, s.role, s.department, s.phone, s.email, s.address, s.joinDate || s.join_date, s.status]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk save error', err);
    res.status(500).json({ error: 'Bulk save failed' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

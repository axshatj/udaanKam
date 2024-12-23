import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper functions for validation
function isValidPhoneNumber(phone) {
  return /^\d{10}$/.test(phone);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
let db;

async function setupDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      contact_number TEXT,
      status TEXT CHECK(status IN ('New', 'Active', 'Inactive')) DEFAULT 'New',
      assigned_kam TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      name TEXT NOT NULL,
      role TEXT,
      phone_number TEXT,
      email TEXT,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      date TEXT,
      type TEXT CHECK(type IN ('Call', 'Visit', 'Order')),
      notes TEXT,
      follow_up_required BOOLEAN,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
    );
  `);
}

setupDatabase();

// API Routes

// Create a new restaurant lead
app.post('/api/restaurants', async (req, res) => {
  const { name, address, contact_number, status, assigned_kam } = req.body;
  
  if (!name || !address || !contact_number || !status || !assigned_kam) {
    return res.status(400).json({ error: "Restaurant name is required" });
  }
  
  if (contact_number && !isValidPhoneNumber(contact_number)) {
    return res.status(400).json({ error: "Invalid phone number. Must be 10 digits." });
  }

  try {
    const result = await db.run(
      'INSERT INTO restaurants (name, address, contact_number, status, assigned_kam) VALUES (?, ?, ?, ?, ?)',
      [name, address, contact_number, status, assigned_kam]
    );
    res.json({ id: result.lastID, message: 'Restaurant lead created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all restaurant leads
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await db.all('SELECT * FROM restaurants');
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a contact to a restaurant
app.post('/api/contacts', async (req, res) => {
  const { restaurant_id, name, role, phone_number, email } = req.body;
  
  if (!restaurant_id || !name || !role || !phone_number || !email) {
    return res.status(400).json({ error: "Restaurant ID and contact name are required" });
  }
  
  if (phone_number && !isValidPhoneNumber(phone_number)) {
    return res.status(400).json({ error: "Invalid phone number. Must be 10 digits." });
  }
  
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    const result = await db.run(
      'INSERT INTO contacts (restaurant_id, name, role, phone_number, email) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, name, role, phone_number, email]
    );
    res.json({ id: result.lastID, message: 'Contact added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contacts for a restaurant
app.get('/api/contacts/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const contacts = await db.all('SELECT * FROM contacts WHERE restaurant_id = ?', restaurantId);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an interaction
app.post('/api/interactions', async (req, res) => {
  const { restaurant_id, date, type, notes, follow_up_required } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO interactions (restaurant_id, date, type, notes, follow_up_required) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, date, type, notes, follow_up_required]
    );
    res.json({ id: result.lastID, message: 'Interaction logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent interactions
app.get('/api/interactions/recent', async (req, res) => {
  try {
    const interactions = await db.all('SELECT i.*, r.name as restaurant_name FROM interactions i JOIN restaurants r ON i.restaurant_id = r.id ORDER BY i.date DESC LIMIT 10');
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search restaurants
app.get('/api/restaurants/search', async (req, res) => {
  const { query } = req.query;
  try {
    const restaurants = await db.all(
      `SELECT r.*, 
              (SELECT COUNT(*) FROM interactions WHERE restaurant_id = r.id) as interaction_count
       FROM restaurants r
       WHERE r.name LIKE ? OR r.address LIKE ? OR r.contact_number LIKE ? OR r.assigned_kam LIKE ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's pending calls
app.get('/api/interactions/pending-calls', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const pendingCalls = await db.all(`
      SELECT i.*, r.name as restaurant_name 
      FROM interactions i 
      JOIN restaurants r ON i.restaurant_id = r.id 
      WHERE i.date = ? AND i.type = 'Call' AND i.follow_up_required = 1
    `, today);
    res.json(pendingCalls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all leads with interaction counts
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await db.all(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM interactions WHERE restaurant_id = r.id) as interaction_count
      FROM restaurants r
    `);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Use connection string from environment, or fallback to a local postgress db for dev
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Prevent unhandled pg client error crashes (e.g. idle connection timeouts)
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message || err);
});

const initSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Staff'
      );

      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        "customerName" TEXT NOT NULL,
        phone TEXT NOT NULL,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        "totalAmount" REAL NOT NULL,
        "advancePaid" REAL NOT NULL,
        "themeId" INTEGER,
        notes TEXT,
        status TEXT DEFAULT 'Booked',
        FOREIGN KEY("themeId") REFERENCES themes(id)
      );

      CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        notes TEXT,
        viewed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS booking_decorations (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        theme_id INTEGER REFERENCES themes(id),
        custom_image TEXT,
        label TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS booking_payments (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recorded_by TEXT
      );

      ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS recorded_by TEXT;
      ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS theme_media (
        id SERIAL PRIMARY KEY,
        theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entity_id TEXT,
        entity_type TEXT,
        performed_by TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('PostgreSQL tables created or already exist.');

    // Seed initial data
    const res = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@classichall.com']);
    if (res.rowCount === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Super Admin', 'admin@classichall.com', hash, 'Admin']
      );
      console.log('Seeded Admin User (admin@classichall.com / admin123)');
    }

    const themeRes = await pool.query('SELECT COUNT(*) as count FROM themes');
    if (parseInt(themeRes.rows[0].count) === 0) {
      await pool.query('INSERT INTO themes (name, description, image_url) VALUES ($1, $2, $3)',
        ['Royal Heritage', 'A luxurious Indian wedding hall decoration with rich red and gold fabrics.', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop']);
      await pool.query('INSERT INTO themes (name, description, image_url) VALUES ($1, $2, $3)',
        ['Modern Minimalist', 'Clean, modern elegant white and glass decoration with subtle fairy lights.', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop']);
      await pool.query('INSERT INTO themes (name, description, image_url) VALUES ($1, $2, $3)',
        ['Floral Elegance', 'A beautiful stage heavily decorated with pastel pink and white roses.', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop']);
      await pool.query('INSERT INTO themes (name, description, image_url) VALUES ($1, $2, $3)',
        ['Golden Glamour', 'Stunning evening banquet setup with warm golden lighting.', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop']);
      console.log('Seeded Default Themes');
    }

  } catch (err) {
    console.error('Error initializing schema:', err);
  }
};

// Only run init if we have a connection string
if (connectionString) {
  initSchema();
} else {
  console.log('No DATABASE_URL provided. Skipping schema initialization.');
}

module.exports = pool;

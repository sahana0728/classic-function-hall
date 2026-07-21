const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve uploaded theme images if needed (though now we proxy to vite public folder)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Function Hall Backend is running.' });
});

// ── Serve Built Frontend (Production) ──
// After all API routes, serve the Vite build output as static files.
// This allows a single deployment (e.g., Render) to serve both API + frontend.
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA catch-all: any non-API route returns index.html for client-side routing
app.use((req, res) => {
    // Don't catch API routes (they should 404 normally)
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

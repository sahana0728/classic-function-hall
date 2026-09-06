const express = require('express');
const db = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer config for theme media uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype.split('/')[1]);
        if (ext || mime) cb(null, true);
        else cb(new Error('Only images and videos are allowed'));
    }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_function_hall_key_123';

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Helper: Create an audit log
const createAuditLog = async (action, entityId, entityType, performedBy, details = {}) => {
    try {
        await db.query(
            'INSERT INTO audit_logs (action, entity_id, entity_type, performed_by, details) VALUES ($1, $2, $3, $4, $5)',
            [action, entityId, entityType, performedBy, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Audit log failed:', err);
    }
};

// Event dates remain the calendar dates. Each booking's actual possession window
// starts at 4 PM on the day before startDate and ends at 4 PM on endDate.
// Strict inequalities allow consecutive bookings to hand over at the same 4 PM.
const checkAvailability = async (startDate, endDate, excludeBookingId = null) => {
    let query = `
      SELECT id, "customerName", "startDate", "endDate" FROM bookings 
      WHERE status != 'Cancelled' AND
        "endDate"::date > $1::date - INTERVAL '1 day'
        AND 
        "startDate"::date - INTERVAL '1 day' < $2::date
    `;
    const params = [startDate, endDate];
    if (excludeBookingId) {
        query += ` AND id != $3`;
        params.push(excludeBookingId);
    }
    const { rows } = await db.query(query, params);
    return rows;
};

const optionalAmount = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : NaN;
};

const validatePhone = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
};

// --- THEMES ---
// Helper: attach media array to each theme
async function attachThemeMedia(themes) {
    if (themes.length === 0) return themes;
    const ids = themes.map(t => t.id);
    const { rows: media } = await db.query(
        `SELECT id, theme_id as "themeId", media_url as "mediaUrl", sort_order as "sortOrder"
         FROM theme_media WHERE theme_id = ANY($1) ORDER BY sort_order, id`,
        [ids]
    );
    const mediaMap = {};
    media.forEach(m => {
        if (!mediaMap[m.themeId]) mediaMap[m.themeId] = [];
        mediaMap[m.themeId].push(m);
    });
    return themes.map(t => ({ ...t, media: mediaMap[t.id] || [] }));
}

router.get('/themes', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, image_url as "imageUrl" FROM themes');
        const withMedia = await attachThemeMedia(rows);
        res.json(withMedia);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/themes', authenticate, upload.array('media', 20), async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { name, description } = req.body;
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }

        // First uploaded file becomes cover image
        const files = req.files || [];
        const coverUrl = files.length > 0 ? `/uploads/${files[0].filename}` : (req.body.image_url || '');

        const { rows } = await db.query(
            'INSERT INTO themes (name, description, image_url) VALUES ($1, $2, $3) RETURNING id',
            [name, description, coverUrl]
        );
        const themeId = rows[0].id;

        // Insert all files into theme_media
        for (let i = 0; i < files.length; i++) {
            await db.query(
                'INSERT INTO theme_media (theme_id, media_url, sort_order) VALUES ($1, $2, $3)',
                [themeId, `/uploads/${files[i].filename}`, i]
            );
        }

        res.status(201).json({ id: themeId, name, description, imageUrl: coverUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/themes/:id', authenticate, upload.array('media', 20), async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const files = req.files || [];

        // Update theme name/description
        await db.query('UPDATE themes SET name = $1, description = $2 WHERE id = $3', [name, description, id]);

        // If new files uploaded, add them to theme_media and update cover
        if (files.length > 0) {
            // Get current max sort order
            const { rows: maxRows } = await db.query(
                'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM theme_media WHERE theme_id = $1', [id]
            );
            let sortOrder = maxRows[0].max_order + 1;

            for (const file of files) {
                await db.query(
                    'INSERT INTO theme_media (theme_id, media_url, sort_order) VALUES ($1, $2, $3)',
                    [id, `/uploads/${file.filename}`, sortOrder++]
                );
            }

            // Update cover image to first media item if none exists
            const { rows: coverCheck } = await db.query('SELECT image_url FROM themes WHERE id = $1', [id]);
            if (!coverCheck[0]?.image_url || coverCheck[0].image_url === '') {
                await db.query('UPDATE themes SET image_url = $1 WHERE id = $2', [`/uploads/${files[0].filename}`, id]);
            }
        }

        const { rows } = await db.query('SELECT id, name, description, image_url as "imageUrl" FROM themes WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Theme not found' });
        const withMedia = await attachThemeMedia(rows);
        res.json(withMedia[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add media to existing theme
router.post('/themes/:id/media', authenticate, upload.array('media', 20), async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files || [];
        if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

        const { rows: maxRows } = await db.query(
            'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM theme_media WHERE theme_id = $1', [id]
        );
        let sortOrder = maxRows[0].max_order + 1;
        const inserted = [];

        for (const file of files) {
            const { rows } = await db.query(
                'INSERT INTO theme_media (theme_id, media_url, sort_order) VALUES ($1, $2, $3) RETURNING id, media_url as "mediaUrl"',
                [id, `/uploads/${file.filename}`, sortOrder++]
            );
            inserted.push(rows[0]);
        }

        res.status(201).json({ added: inserted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a single media item
router.delete('/themes/:id/media/:mediaId', authenticate, async (req, res) => {
    try {
        const { id, mediaId } = req.params;
        await db.query('DELETE FROM theme_media WHERE id = $1 AND theme_id = $2', [mediaId, id]);
        res.json({ message: 'Media removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete entire theme (only if not used in upcoming bookings)
router.delete('/themes/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const themeId = parseInt(req.params.id, 10);
        const today = new Date().toISOString().split('T')[0];

        // Check if theme is used in any upcoming/current bookings (via bookings table)
        const bookingCheck = await db.query(
            `SELECT "customerName", "endDate" FROM bookings 
             WHERE "themeId" = $1 AND "endDate"::date >= $2::date`,
            [themeId, today]
        );

        // Check if theme is used in decorations of upcoming bookings
        const decoCheck = await db.query(
            `SELECT b."customerName", b."endDate" FROM booking_decorations bd
             JOIN bookings b ON bd.booking_id = b.id
             WHERE bd.theme_id = $1 AND b."endDate"::date >= $2::date`,
            [themeId, today]
        );

        const activeBookings = [...bookingCheck.rows, ...decoCheck.rows];
        if (activeBookings.length > 0) {
            const names = [...new Set(activeBookings.map(b => b.customerName))].join(', ');
            return res.status(409).json({
                error: `This theme is being used in upcoming booking(s): ${names}. Please remove it from the booking first before deleting.`
            });
        }

        // Safe to delete — only used in past bookings or not used at all
        await db.query('UPDATE booking_decorations SET theme_id = NULL WHERE theme_id = $1', [themeId]);
        await db.query('UPDATE bookings SET "themeId" = NULL WHERE "themeId" = $1', [themeId]);
        await db.query('DELETE FROM themes WHERE id = $1', [themeId]);
        
        await createAuditLog('DELETE_THEME', themeId.toString(), 'theme', req.user.email, { themeId });
        res.json({ message: 'Theme deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/users', authenticate, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { rows } = await db.query('SELECT id, name, email, role FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/users', authenticate, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hash, role || 'Staff']
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        if (password && password.trim() !== "") {
            const hash = await bcrypt.hash(password, 10);
            await db.query(
                'UPDATE users SET name = $1, email = $2, password_hash = $3, role = $4 WHERE id = $5',
                [name, email, hash, role || 'Staff', id]
            );
        } else {
            // Do not update password if none provided
            await db.query(
                'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4',
                [name, email, role || 'Staff', id]
            );
        }

        const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- BOOKINGS ---
router.get('/bookings', authenticate, async (req, res) => {
    try {
        const { rows } = await db.query(`
      SELECT b.*, t.name as "themeName", t.image_url as "themeImage" 
      FROM bookings b 
      LEFT JOIN themes t ON b."themeId" = t.id
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/bookings/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(`
      SELECT b.*, t.name as "themeName", t.image_url as "themeImage"
      FROM bookings b
      LEFT JOIN themes t ON b."themeId" = t.id
      WHERE b.id = $1
    `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const booking = rows[0];

        // Fetch decorations for this booking
        const decoResult = await db.query(`
      SELECT bd.id, bd.theme_id as "themeId", bd.custom_image as "customImage", bd.label, bd.notes,
             t.name as "themeName", t.image_url as "themeImage"
      FROM booking_decorations bd
      LEFT JOIN themes t ON bd.theme_id = t.id
      WHERE bd.booking_id = $1
      ORDER BY bd.id
    `, [id]);

        // Fetch payments for this booking
        const payResult = await db.query(`
          SELECT id, amount, payment_date, recorded_by
          FROM booking_payments
          WHERE booking_id = $1
          ORDER BY payment_date ASC
        `, [id]);

        res.json({
            ...booking,
            totalAmount: booking.totalAmount == null ? null : Number(booking.totalAmount),
            advancePaid: booking.advancePaid == null ? null : Number(booking.advancePaid),
            balanceLeft: booking.totalAmount == null
                ? null
                : Number(booking.totalAmount) - Number(booking.advancePaid || 0),
            decorations: decoResult.rows,
            payments: payResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bookings', authenticate, async (req, res) => {
    try {
        const { customerName, phone, occasion, startDate, endDate, totalAmount, advancePaid, themeId, notes } = req.body;
        const address = req.body.address?.trim() || null;
        const normalizedOccasion = occasion?.trim() || null;
        const normalizedTotal = optionalAmount(totalAmount);
        const normalizedAdvance = optionalAmount(advancePaid);

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter a valid 10-digit mobile number.' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }

        if (Number.isNaN(normalizedTotal) || normalizedTotal < 0 || Number.isNaN(normalizedAdvance) || normalizedAdvance < 0) {
            return res.status(400).json({ error: 'Payment amounts must be valid non-negative numbers.' });
        }

        if (normalizedTotal !== null && normalizedAdvance !== null && normalizedAdvance > normalizedTotal) {
            return res.status(400).json({ error: 'Advance amount cannot be greater than the total amount.' });
        }

        // Validate overlap
        const overlaps = await checkAvailability(startDate, endDate);
        if (overlaps.length > 0) {
            return res.status(409).json({ 
                error: 'The hall access window (4 PM the previous day to 4 PM on the end date) overlaps with an existing booking.',
                conflicts: overlaps 
            });
        }

        const id = Date.now().toString();

        await db.query(`
      INSERT INTO bookings (id, "customerName", phone, address, occasion, "startDate", "endDate", "totalAmount", "advancePaid", "themeId", notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Booked')
    `, [id, customerName, phone, address, normalizedOccasion, startDate, endDate, normalizedTotal, normalizedAdvance, themeId || null, notes]);

        if (normalizedAdvance !== null && normalizedAdvance > 0) {
            await db.query(
                `INSERT INTO booking_payments (booking_id, amount, recorded_by) VALUES ($1, $2, $3)`,
                [id, normalizedAdvance, req.user.name || req.user.email]
            );
        }

        await createAuditLog('CREATE_BOOKING', id, 'booking', req.user.email, { customerName, startDate, endDate, address, occasion: normalizedOccasion });

        res.json({ id, message: 'Booking created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add payment installment
router.post('/bookings/:id/payments', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        console.log(`Attempting to add payment: bookingId=${id}, amount=${amount}`);
        
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            console.log(`Invalid amount: ${amount}`);
            return res.status(400).json({ error: 'Payment amount must be a valid positive number' });
        }

        const { rows } = await db.query('SELECT "advancePaid", "totalAmount" FROM bookings WHERE id = $1', [id]);
        if (rows.length === 0) {
            console.log(`Booking not found: ${id}`);
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        const booking = rows[0];
        const newAdvancePaid = Number(booking.advancePaid || 0) + numericAmount;
        
        if (booking.totalAmount != null && newAdvancePaid > Number(booking.totalAmount)) {
             console.log(`Payment exceeds total: newTotal=${newAdvancePaid}, limit=${booking.totalAmount}`);
             return res.status(400).json({ error: 'Payment exceeds total amount' });
        }

        console.log(`Inserting payment record...`);
        const userName = req.user.name || req.user.email;
        await db.query('INSERT INTO booking_payments (booking_id, amount, recorded_by) VALUES ($1, $2, $3)', [id, numericAmount, userName]);
        console.log(`Updating booking advancePaid...`);
        await db.query('UPDATE bookings SET "advancePaid" = $1 WHERE id = $2', [newAdvancePaid, id]);
        
        await createAuditLog('ADD_PAYMENT', id, 'booking', req.user.email, { amount: numericAmount, totalPaid: newAdvancePaid });
        console.log(`Payment added successfully`);
        res.json({ message: 'Payment added successfully' });
    } catch (err) {
        console.error(`Detailed error in add payment:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Update general booking details
router.put('/bookings/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, phone, startDate, endDate, notes, status } = req.body;
        const address = req.body.address?.trim() || null;
        const occasion = req.body.occasion?.trim() || null;
        const normalizedTotal = optionalAmount(req.body.totalAmount);

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter a valid 10-digit mobile number.' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }

        if (Number.isNaN(normalizedTotal) || normalizedTotal < 0) {
            return res.status(400).json({ error: 'Total amount must be a valid non-negative number.' });
        }

        // Check if there's any overlaps, excluding current booking
        const overlaps = await checkAvailability(startDate, endDate, id);
        if (overlaps.length > 0 && status !== 'Cancelled') {
            return res.status(409).json({ 
                error: 'The selected dates overlap with an existing booking.',
                conflicts: overlaps 
            });
        }

        // Fetch current booking to validate advancePaid vs new totalAmount
        const currentBookingQuery = await db.query('SELECT "advancePaid" FROM bookings WHERE id = $1', [id]);
        if (currentBookingQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const currentBooking = currentBookingQuery.rows[0];
        if (normalizedTotal !== null && normalizedTotal < Number(currentBooking.advancePaid || 0)) {
            return res.status(400).json({ error: `Total amount cannot be less than the already paid amount of ₹${currentBooking.advancePaid.toLocaleString()}` });
        }

        await db.query(`
            UPDATE bookings 
            SET "customerName" = $1, phone = $2, address = $3, occasion = $4,
                "startDate" = $5, "endDate" = $6, "totalAmount" = $7, notes = $8, status = $9
            WHERE id = $10
        `, [customerName, phone, address, occasion, startDate, endDate, normalizedTotal, notes, status || 'Booked', id]);

        await createAuditLog('UPDATE_BOOKING', id, 'booking', req.user.email, { customerName, startDate, endDate, totalAmount: normalizedTotal, address, occasion, status });

        res.json({ message: 'Booking updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update booking notes only
router.patch('/bookings/:id/notes', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const { rowCount } = await db.query(
            'UPDATE bookings SET notes = $1 WHERE id = $2',
            [notes, id]
        );
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        await createAuditLog('UPDATE_BOOKING_NOTES', id, 'booking', req.user.email, { newNotes: notes });
        res.json({ message: 'Notes updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BOOKING DECORATIONS ---
// Add decoration (from theme catalog, specific media, or custom upload)
router.post('/bookings/:id/decorations', authenticate, upload.single('media'), async (req, res) => {
    try {
        const { id } = req.params;
        const { themeId, label, notes, mediaUrl } = req.body;
        // If mediaUrl is passed (individual image pick), store it in custom_image
        const customImage = req.file ? `/uploads/${req.file.filename}` : (mediaUrl || null);

        const { rows } = await db.query(
            `INSERT INTO booking_decorations (booking_id, theme_id, custom_image, label, notes) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [id, themeId || null, customImage, label || null, notes || null]
        );
        
        await createAuditLog('ADD_DECORATION', id, 'booking', req.user.email, { label: label || 'Custom Decoration' });

        res.status(201).json({ id: rows[0].id, message: 'Decoration added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove decoration
router.delete('/bookings/:id/decorations/:decorationId', authenticate, async (req, res) => {
    try {
        const { id, decorationId } = req.params;
        
        // Fetch decoration to log the label being deleted
        const decoRes = await db.query('SELECT label FROM booking_decorations WHERE id = $1 AND booking_id = $2', [decorationId, id]);
        const deletedLabel = decoRes.rows[0]?.label || 'Unknown Decoration';

        await db.query(
            'DELETE FROM booking_decorations WHERE id = $1 AND booking_id = $2',
            [decorationId, id]
        );

        await createAuditLog('DELETE_DECORATION', id, 'booking', req.user.email, { label: deletedLabel });

        res.json({ message: 'Decoration removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an entire booking and all owned records atomically. The explicit child
// deletes also support older production databases created before cascade rules.
router.delete('/bookings/:id', authenticate, async (req, res) => {
    let client;
    try {
        client = await db.connect();
        const { id } = req.params;
        await client.query('BEGIN');
        const bookingResult = await client.query('SELECT "customerName" FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (bookingResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Booking not found' });
        }
        await client.query('DELETE FROM booking_payments WHERE booking_id = $1', [id]);
        await client.query('DELETE FROM booking_decorations WHERE booking_id = $1', [id]);
        const result = await client.query('DELETE FROM bookings WHERE id = $1 RETURNING "customerName"', [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Booking not found' });
        }
        await client.query('COMMIT');
        await createAuditLog('DELETE_BOOKING', id, 'booking', req.user.email, { customerName: result.rows[0].customerName });
        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        res.status(500).json({ error: err.message });
    } finally {
        client?.release();
    }
});

// --- ENQUIRIES ---
router.get('/enquiries', authenticate, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM enquiries');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/enquiries/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Mark enquiry as viewed/read
        await db.query('UPDATE enquiries SET viewed = TRUE WHERE id = $1', [id]);
        const { rows } = await db.query('SELECT * FROM enquiries WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/enquiries', authenticate, async (req, res) => {
    try {
        const { name, phone, startDate, endDate, notes } = req.body;

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter a valid 10-digit mobile number.' });
        }

        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }

        const id = Date.now().toString();

        await db.query(`
      INSERT INTO enquiries (id, name, phone, "startDate", "endDate", notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, name, phone, startDate, endDate, notes]);

        await createAuditLog('CREATE_ENQUIRY', id, 'enquiry', req.user.email, { name, startDate, endDate });

        res.json({ id, message: 'Enquiry created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/enquiries/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM enquiries WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }
        await createAuditLog('DELETE_ENQUIRY', id, 'enquiry', req.user.email, { name: result.rows[0].name });
        res.json({ message: 'Enquiry deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Convert Enquiry to Booking
router.post('/enquiries/:id/convert', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { totalAmount, advancePaid, themeId } = req.body;
        const normalizedTotal = optionalAmount(totalAmount);
        const normalizedAdvance = optionalAmount(advancePaid);

        if (Number.isNaN(normalizedTotal) || normalizedTotal < 0 || Number.isNaN(normalizedAdvance) || normalizedAdvance < 0) {
            return res.status(400).json({ error: 'Payment amounts must be valid non-negative numbers.' });
        }
        if (normalizedTotal !== null && normalizedAdvance !== null && normalizedAdvance > normalizedTotal) {
            return res.status(400).json({ error: 'Advance amount cannot be greater than the total amount.' });
        }

        // Fetch the enquiry
        const { rows: enquiries } = await db.query('SELECT * FROM enquiries WHERE id = $1', [id]);
        if (enquiries.length === 0) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }

        const enquiry = enquiries[0];
        
        // Validate overlap
        const overlaps = await checkAvailability(enquiry.startDate, enquiry.endDate);
        if (overlaps.length > 0) {
            return res.status(409).json({ 
                error: 'Cannot convert: The hall access window overlaps with an existing booking.',
                conflicts: overlaps 
            });
        }

        const bookingId = Date.now().toString();

        // Create booking from enquiry data
        await db.query(`
      INSERT INTO bookings (id, "customerName", phone, "startDate", "endDate", "totalAmount", "advancePaid", "themeId", notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Booked')
    `, [bookingId, enquiry.name, enquiry.phone, enquiry.startDate, enquiry.endDate, normalizedTotal, normalizedAdvance, themeId || null, enquiry.notes]);

        // Delete the enquiry
        await db.query('DELETE FROM enquiries WHERE id = $1', [id]);

        await createAuditLog('CONVERT_ENQUIRY', bookingId, 'booking', req.user.email, { enquiryId: id, customerName: enquiry.name });

        res.json({ id: bookingId, message: 'Enquiry converted to booking successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CALENDAR DATA ---
router.get('/calendar', authenticate, async (req, res) => {
    try {
        const bookings = await db.query(`
      SELECT id, "customerName" as title, "startDate", "endDate",
             'booked' as type 
      FROM bookings
    `);

        const enquiries = await db.query(`
      SELECT id, name as title, "startDate", "endDate",
             'enquiry' as type 
      FROM enquiries
    `);

        res.json([...bookings.rows, ...enquiries.rows]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Public themes for portfolio gallery
router.get('/public/themes', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, description, image_url as "imageUrl" FROM themes');
        const withMedia = await attachThemeMedia(rows);
        res.json(withMedia);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public calendar — shows only date ranges with type, NO customer names
router.get('/public/calendar', async (req, res) => {
    try {
        const bookings = await db.query(`
          SELECT "startDate", "endDate",
                 'booked' as type 
          FROM bookings
        `);
        const enquiries = await db.query(`
          SELECT "startDate", "endDate",
                 'enquiry' as type 
          FROM enquiries
        `);
        // Return only dates + type, no names or IDs
        const events = [
            ...bookings.rows.map(b => ({ startDate: b.startDate, endDate: b.endDate, type: b.type })),
            ...enquiries.rows.map(e => ({ startDate: e.startDate, endDate: e.endDate, type: e.type })),
        ];
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Public enquiry submission
router.post('/public/enquiry', async (req, res) => {
    try {
        const { name, phone, startDate, endDate, notes } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }
        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone number. Please enter a valid 10-digit mobile number.' });
        }
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date.' });
        }
        const id = Date.now().toString();
        await db.query(
            'INSERT INTO enquiries (id, name, phone, "startDate", "endDate", notes) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, name, phone, startDate || '', endDate || '', notes || '']
        );
        res.status(201).json({ id, message: 'Enquiry submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUDIT LOGS ---
router.get('/audit-logs/:entityType/:entityId', authenticate, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const { rows } = await db.query(
            'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
            [entityType, entityId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

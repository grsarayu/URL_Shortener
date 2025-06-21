const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files like index.html

// --- MongoDB Connection ---
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('FATAL ERROR: MONGO_URI is not defined.');
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// --- Mongoose Schema & Model ---
const linkSchema = new mongoose.Schema({
    shortCode: { type: String, required: true, unique: true },
    longUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    clicks: { type: Number, default: 0 }
});

const Link = mongoose.model('Link', linkSchema);

// --- API Endpoints ---

// Shorten URL
app.post('/shorten', async (req, res) => {
    const { longUrl, customCode } = req.body;

    if (!longUrl) {
        return res.status(400).json({ error: 'longUrl is required' });
    }

    try {
        let shortCode = customCode;

        if (shortCode) {
            // Check if custom code already exists
            const existing = await Link.findOne({ shortCode });
            if (existing) {
                return res.status(400).json({ error: 'Custom code already taken.' });
            }
        } else {
            // Generate a unique random short code
            let isUnique = false;
            while (!isUnique) {
                shortCode = Math.random().toString(36).substring(2, 8);
                const existing = await Link.findOne({ shortCode });
                if (!existing) {
                    isUnique = true;
                }
            }
        }

        const newLink = new Link({ longUrl, shortCode });
        await newLink.save();

        const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
        res.status(201).json({ shortUrl });

    } catch (error) {
        console.error('Error creating short link:', error);
        res.status(500).json({ error: 'Server error, please try again.' });
    }
});

// Redirect short URL
app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    // Ignore requests for static files
    if (shortCode === 'index.html' || shortCode === 'style.css' || shortCode === 'script.js' || shortCode === 'favicon.ico') {
        return res.sendFile(path.join(__dirname, shortCode));
    }

    try {
        const link = await Link.findOne({ shortCode });

        if (link) {
            link.clicks++;
            await link.save();
            return res.redirect(link.longUrl);
        } else {
            return res.status(404).sendFile(path.join(__dirname, '404.html'));
        }
    } catch (error) {
        console.error('Error finding short link:', error);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use Render's port or 3000 for local dev

// Define the path for our persistent data store
// On Render, this will be a persistent disk. Locally, it's just 'links.json'.
const dataDir = '/var/data';
const DB_PATH = process.env.RENDER ? path.join(dataDir, 'links.json') : path.join(__dirname, 'links.json');

// On Render, ensure the database file exists on startup.
// The persistent disk might be empty on first boot.
if (process.env.RENDER && !fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files

// Function to read the database
const readDb = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, return an empty object
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
};

// Function to write to the database
const writeDb = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// API Endpoint to shorten a URL
app.post('/shorten', (req, res) => {
    const { longUrl, customCode } = req.body;

    if (!longUrl) {
        return res.status(400).json({ error: 'longUrl is required' });
    }

    const db = readDb();
    let shortCode = customCode;

    if (shortCode) {
        if (db[shortCode]) {
            return res.status(400).json({ error: 'Custom code already exists' });
        }
    } else {
        // Generate a random short code
        do {
            shortCode = Math.random().toString(36).substring(2, 8);
        } while (db[shortCode]);
    }

    db[shortCode] = {
        longUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
    };

    writeDb(db);

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    res.status(201).json({ shortUrl });
});

// Redirect Endpoint
app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const db = readDb();

    if (db[shortCode]) {
        db[shortCode].clicks++;
        writeDb(db);
        res.redirect(db[shortCode].longUrl);
    } else {
        res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 
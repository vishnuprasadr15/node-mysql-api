require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT;
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET
const refreshTokens = []; // In-memory storage for refresh tokens (you might use a database instead)


// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // Use your MySQL username
    password: '',  // Use your MySQL password
    database: 'test_api'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// CRUD Endpoints

// Create a new user
app.post('/users', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err, results) => {

        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ message: 'User created', userId: results.insertId });
        }
    });
});

// Middleware for verifying JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.user = user;
        next();
    });
};

// Read all users
app.get('/users', authenticateToken, (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Read a single user
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// Update a user
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const { username, email, password } = req.body;
    db.query('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?', [username, email, password], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.json({ message: 'User updated' });
        }
    });
});

// Delete a user
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.json({ message: 'User deleted' });
        }
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = results[0];

        // Compare hashed password
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT bearer and refresh token
        const payload = { userId: user.id };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour
        const refreshToken = jwt.sign(payload, refreshTokenSecret, { expiresIn: '30d' }); // Refresh token expires in 30 days

        refreshTokens.push(refreshToken); // Store the refresh token (use a database in production)

        res.json({ message: 'Login successful', token, refreshToken });
    });
});

// Refresh token endpoint
app.post('/refresh-token', (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(401).json({ message: 'No refresh token provided' });
    if (!refreshTokens.includes(token)) return res.status(403).json({ message: 'Invalid refresh token' });

    jwt.verify(token, refreshTokenSecret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid refresh token' });

        const newAccessToken = jwt.sign({ userId: user.userId }, jwtSecret, { expiresIn: '1h' }); // Generate new access token
        res.json({ token: newAccessToken });
    });
});

// get userid from jwt payload passed from bearer token. use it to fetch user data
app.get('/user', authenticateToken, (req, res) => {
    const userId = req.user.userId; // Extract user ID from the JWT payload

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(results[0]); // Return the details of the user
    });
});

// Protected route example
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'This is a protected route', userId: req.user.userId });
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

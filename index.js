const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000; // Change this to your desired port number
const secretKey = 'your-secret-key'; // Change this to a strong secret key

// Middleware to parse JSON requests
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'node_auth'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.message);
        return;
    }
    console.log('Database connected');
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token not provided' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}
app.get('/', (req, res) => {
    res.send("Welcome to my page!");
});
// User Registration Logic
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username is already taken
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: 'Password hashing error' });
            }

            // Insert user into the database
            db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error' });
                }
                res.status(201).json({ message: 'Registration successful' });
            });
        });
    });
});

// User Login Logic
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Check if the user exists
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Authentication failed' });
        }

        // Compare the hashed password
        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: 'Password comparison error' });
            }
            if (!isMatch) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

            // Generate and send a JWT token
            const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
            res.status(200).json({ token });
        });
    });
});

// Protected Route
app.get('/profile', verifyToken, (req, res) => {
    // This route is protected; user is authenticated
    res.status(200).json({ message: 'Authenticated user profile' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

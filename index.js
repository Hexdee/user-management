const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
require("dotenv").config()

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Database Configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

// Set up routes
app.get('/', (req, res) => {
    res.send('Welcome to the User Management App');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// User registration
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) throw err;

        // Store the user in the database
        const user = { name, email, password: hashedPassword };
        db.query('INSERT INTO users SET ?', user, (error, results) => {
            if (error) throw error;
            res.status(201).json({ message: 'User registered successfully.' });
        });
    });
});

// User login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Check if the user exists
    db.query('SELECT * FROM users WHERE email = ?', email, (error, results) => {
        if (error) throw error;

        if (results.length === 0) {
            res.status(401).json({ message: 'Authentication failed.' });
        } else {
            const user = results[0];

            // Check if the password matches
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;

                if (isMatch) {
                    // Generate a JWT token
                    const token = jwt.sign({ id: user.id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });
                    res.json({ token });
                } else {
                    res.status(401).json({ message: 'Authentication failed.' });
                }
            });
        }
    });
});

// Profile endpoint
app.get('/profile', (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        res.status(401).json({ message: 'Authentication failed.' });
    } else {
        // Verify the token
        jwt.verify(token, 'your_secret_key', (err, decoded) => {
            if (err) {
                res.status(401).json({ message: 'Authentication failed.' });
            } else {
                // Get the user profile from the database
                db.query('SELECT id, name, email FROM users WHERE id = ?', decoded.id, (error, results) => {
                    if (error) throw error;

                    if (results.length === 0) {
                        res.status(404).json({ message: 'User not found.' });
                    } else {
                        const user = results[0];
                        res.json(user);
                    }
                });
            }
        });
    }
});


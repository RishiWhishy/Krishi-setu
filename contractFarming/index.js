const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 5000;
const secretKey = 'your_secret_key'; // Use a strong secret key

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'dps123',
  database: 'sgt'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// API Endpoint to Register User
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (role !== 'Farmer' && role !== 'contractor') {
    return res.status(400).json({ error: 'Invalid role. Role must be either Farmer or contractor.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, role], (err) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API Endpoint to Login User
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate JWT Token
      const token = jwt.sign({ username: user.username, role: user.role }, secretKey, { expiresIn: '1h' });

      res.status(200).json({ message: 'Login successful', token, role: user.role });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API Endpoint to List Crops
app.get('/listings', (req, res) => {
  const sql = 'SELECT * FROM listings';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching listings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(200).json(results);
  });
});

// API Endpoint to Buy Crop
app.post('/buy-crop/:id', (req, res) => {
  const cropId = req.params.id;
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, secretKey);

    db.beginTransaction(err => {
      if (err) {
        console.error('Error starting transaction:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Check if crop exists in listings table
      const checkSql = 'SELECT * FROM listings WHERE id = ?';
      db.query(checkSql, [cropId], (checkErr, checkResult) => {
        if (checkErr) {
          console.error('Error checking crop:', checkErr);
          return db.rollback(() => {
            res.status(500).json({ error: 'Database error', details: checkErr.message });
          });
        }

        if (checkResult.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ error: 'Crop not found' });
          });
        }

        // Insert transaction into transactions table
        const transactionSql = 'INSERT INTO transactions (username, crop_id) VALUES (?, ?)';
        db.query(transactionSql, [decoded.username, cropId], (transactionErr) => {
          if (transactionErr) {
            console.error('Error inserting transaction:', transactionErr);
            return db.rollback(() => {
              res.status(500).json({ error: 'Database erro74574574r', details: transactionErr.message });
            });
          }

          // Delete crop from listings table
          const deleteSql = 'DELETE FROM listings WHERE id = ?';
          db.query(deleteSql, [cropId], (deleteErr, deleteResult) => {
            if (deleteErr) {
              console.error('Error deleting crop:', deleteErr);
              return db.rollback(() => {
                res.status(500).json({ error: 'Database error', details: deleteErr.message });
              });
            }

            db.commit(commitErr => {
              if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                return db.rollback(() => {
                  res.status(500).json({ error: 'Database error', details: commitErr.message });
                });
              }

              res.status(200).json({ message: 'Crop bought successfully' });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ error: 'Unauthorized', details: error.message });
  }
});

app.post('/list-crop', (req, res) => {
  const { username, cropName, yieldAmount, price } = req.body;

  if (!username || !cropName || !yieldAmount || !price) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sql = 'INSERT INTO listings (username, crop_name, yield, price) VALUES (?, ?, ?, ?)';
  db.query(sql, [username, cropName, yieldAmount, price], (err, result) => {
    if (err) {
      console.error('Error inserting crop listing:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.status(201).json({ message: 'Crop listed successfully' });
  });
});

app.post('/submit-rating', (req, res) => {
  const { username, cropName, rating } = req.body;

  if (!username || !cropName || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = 'INSERT INTO ratings (username, cropName, rating) VALUES (?, ?, ?)';
  db.query(sql, [username, cropName, rating], (err, result) => {
    if (err) {
      console.error('Error inserting rating:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.status(201).json({ message: 'Rating submitted successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
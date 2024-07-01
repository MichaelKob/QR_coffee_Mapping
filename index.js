require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const winston = require('winston');
const scrapeParks = require('./scrapeParks');
const app = express();
const port = 3001;

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use(cors());
app.use(express.json());

const cache = {};

app.get('/search', async (req, res) => {
  const location = req.query.location;
  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  if (cache[location]) {
    logger.info(`Serving from cache for location: ${location}`);
    return res.json({ results: cache[location] });
  }

  try {
    const parks = await scrapeParks();
    const topResults = parks.slice(0, 10);

    // Cache the results
    cache[location] = topResults;

    res.json({ results: topResults });
  } catch (error) {
    logger.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

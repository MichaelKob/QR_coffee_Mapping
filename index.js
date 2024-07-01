require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const winston = require('winston');
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

app.post('/search', async (req, res) => {
  const location = req.body.location;
  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  try {
    // Use Google Maps Places API to search for public places to enjoy coffee
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=public+places+to+hang+out+and+drink+coffee+in+${encodeURIComponent(location)}&key=${apiKey}`;
    const { data } = await axios.get(searchUrl);

    // Extract names of locations from search results
    const locationNames = data.results.map(result => result.name);

    // Limit results to top 10
    const topResults = locationNames.slice(0, 10).map(name => ({ locationName: name }));

    res.json({ results: topResults });
  } catch (error) {
    logger.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

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

app.get('/search', async (req, res) => {
  const location = req.query.location;
  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=public+places+to+hang+out+and+drink+coffee+in+${encodeURIComponent(location)}&key=${apiKey}`;

  const makeRequest = async (url, retries = 5) => {
    try {
      const { data } = await axios.get(url);
      return data;
    } catch (error) {
      if (error.response && error.response.status === 429 && retries > 0) {
        const delay = Math.pow(2, 5 - retries) * 1000; // Increased exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(url, retries - 1);
      } else {
        throw error;
      }
    }
  };

  try {
    const data = await makeRequest(searchUrl);

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

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
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

  try {
    // Hardcoded list of park names
    const parkNames = [
      "Barretto Point Park",
      "Bronx Park",
      "Claremont Park",
      "Concrete Plant Park",
      "Crotona Park",
      "Ferry Point Park",
      "Franz Sigel Park",
      "Joyce Kilmer Park",
      "Macombs Dam Park",
      "Mill Pond Park",
      "Pelham Bay Park",
      "Rev. T. Wendell Foster Park And Recreation Center",
      "Soundview Park",
      "St. James Park",
      "St. Mary's Park",
      "Van Cortlandt Park",
      "Williamsbridge Oval"
    ];

    // Limit results to top 10
    const topResults = parkNames.slice(0, 10).map(name => ({ locationName: name }));

    res.json({ results: topResults });
  } catch (error) {
    logger.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

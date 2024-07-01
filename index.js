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

app.post('/process', async (req, res) => {
  const { websiteContent } = req.body;
  if (!websiteContent) {
    return res.status(400).json({ error: 'Website content is required' });
  }

  const chatgptApiKey = process.env.CHATGPT_API_KEY;
  const chatgptUrl = 'https://api.openai.com/v1/chat/completions';

  // Retry mechanism with exponential backoff and jitter
  const makeRequest = async (retryCount = 0) => {
    try {
      const response = await axios.post(
        chatgptUrl,
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: `Extract the names of the top 10 places to enjoy coffee from the following content:\n\n${websiteContent}\n\nNames:` }],
          max_tokens: 150,
          n: 1,
          stop: ["\n"],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chatgptApiKey}`,
          },
        }
      );

      const suggestions = response.data.choices[0].message.content.trim().split('\n').slice(0, 10);
      const googleMapsLinks = suggestions.map(suggestion => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suggestion)}`);
      const results = suggestions.map((suggestion, index) => ({ name: suggestion, link: googleMapsLinks[index] }));

      // Send the response back to the client
      return res.json({ results });
    } catch (error) {
      if (error.response && error.response.status === 429 && retryCount < 5) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        logger.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
        setTimeout(() => makeRequest(retryCount + 1), delay);
      } else {
        logger.error('Error processing website content:', error);
        return res.status(500).json({ error: 'Failed to process website content' });
      }
    }
  };

  makeRequest();
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

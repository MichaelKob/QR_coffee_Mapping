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
    const searchQuery = `best parks, beaches, and lakes to enjoy coffee in ${location}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

    const response = await axios.get(searchUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    const results = [];
    $('a').each((index, element) => {
      const title = $(element).find('h3').text();
      const description = $(element).find('.VwiC3b').text(); // Extracting description
      if (title && !title.includes('Yelp')) {
        // Extracting the actual location name
        const locationName = $(element).find('.BNeawe.vvjwJb.AP7Wnd').text() || $(element).find('.BNeawe.deIvCb.AP7Wnd').text() || $(element).find('.BNeawe.tAd8D.AP7Wnd').text() || $(element).find('.BNeawe.iBp4i.AP7Wnd').text() || title; // Use more specific selectors for location name
        results.push({ locationName });
      }
    });

    // Deduplicate results based on locationName
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => r.locationName === result.locationName)
    );

    // Limit results to top 10
    const topResults = uniqueResults.slice(0, 10);

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

      res.json({ results });
    } catch (error) {
      if (error.response && error.response.status === 429 && retryCount < 5) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        logger.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
        setTimeout(() => makeRequest(retryCount + 1), delay);
      } else {
        logger.error('Error processing website content:', error);
        res.status(500).json({ error: 'Failed to process website content' });
      }
    }
  };

  makeRequest();
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

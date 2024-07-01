require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/search', async (req, res) => {
  const location = req.query.location;
  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  try {
    const searchQuery = `best parks, beaches, and lakes to enjoy coffee in ${location} site:tripadvisor.com`;
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
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.post('/process', async (req, res) => {
  const { websiteContent } = req.body;
  if (!websiteContent) {
    return res.status(400).json({ error: 'Website content is required' });
  }

  try {
    const chatgptApiKey = process.env.CHATGPT_API_KEY;
    const chatgptUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

    const response = await axios.post(
      chatgptUrl,
      {
        prompt: `Extract the names of the top 10 places to enjoy coffee from the following content:\n\n${websiteContent}\n\nNames:`,
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

    const suggestions = response.data.choices[0].text.trim().split('\n').slice(0, 10);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error processing website content:', error);
    res.status(500).json({ error: 'Failed to process website content' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

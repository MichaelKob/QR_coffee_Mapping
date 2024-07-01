const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());

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
      const link = $(element).attr('href');
      const description = $(element).find('.VwiC3b').text(); // Extracting description
      if (title && link && !title.includes('Yelp') && !link.includes('yelp.com')) {
        // Extracting the actual location name and Google Maps link
        const locationName = title;
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;
        // Ensure the link is a direct Google Maps link
        if (googleMapsLink.includes('google.com/maps')) {
          results.push({ locationName, googleMapsLink, description });
        }
      }
    });

    // Deduplicate results based on locationName and googleMapsLink
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => r.locationName === result.locationName && r.googleMapsLink === result.googleMapsLink)
    );

    // Limit results to top 10
    const topResults = uniqueResults.slice(0, 10);

    res.json({ results: topResults });
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

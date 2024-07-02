const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeParks(location) {
  try {
    // Construct the URL based on the user's inputted location
    const url = `https://en.wikipedia.org/wiki/Category:Parks_in_${encodeURIComponent(location)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const parks = [];

    $('div.mw-category-group ul li a').each((index, element) => {
      const parkName = $(element).text().trim();
      if (parkName) {
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName + ' ' + location)}`;
        parks.push({ name: parkName, link: googleMapsLink });
      }
    });

    return parks;
  } catch (error) {
    console.error('Error scraping parks:', error);
    return [];
  }
}

module.exports = scrapeParks;

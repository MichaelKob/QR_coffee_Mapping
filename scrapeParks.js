const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeParks(location) {
  try {
    // URL of the San Francisco Travel article
    const url = 'https://www.sftravel.com/article/san-francisco-parks-where-to-enjoy-great-outdoors';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const parks = [];

    $('h2').each((index, element) => {
      const parkName = $(element).text().trim();
      const parkDescription = $(element).next('p').text().trim();
      if (parkName && parkDescription) {
        parks.push({ name: parkName, description: parkDescription });
      }
    });

    return parks;
  } catch (error) {
    console.error('Error scraping parks:', error);
    return [];
  }
}

module.exports = scrapeParks;

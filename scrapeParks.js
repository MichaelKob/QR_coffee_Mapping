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

    // If no parks are found, try an alternative URL or search query
    if (parks.length === 0) {
      const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' parks')}`;
      const { data: searchData } = await axios.get(searchUrl);
      const $$ = cheerio.load(searchData);

      $$('div.mw-search-result-heading a').each((index, element) => {
        const parkName = $$(element).text().trim();
        if (parkName) {
          const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName + ' ' + location)}`;
          parks.push({ name: parkName, link: googleMapsLink });
        }
      });

      // Additional fallback: Check for search results with "List of parks in [location]"
      if (parks.length === 0) {
        const listSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent('List of parks in ' + location)}`;
        const { data: listSearchData } = await axios.get(listSearchUrl);
        const $$$ = cheerio.load(listSearchData);

        $$$('div.mw-search-result-heading a').each((index, element) => {
          const parkName = $$$(element).text().trim();
          if (parkName) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName + ' ' + location)}`;
            parks.push({ name: parkName, link: googleMapsLink });
          }
        });

        // Final fallback: Directly search for parks in the location
        if (parks.length === 0) {
          const directSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' public parks')}`;
          const { data: directSearchData } = await axios.get(directSearchUrl);
          const $$$$ = cheerio.load(directSearchData);

          $$$$('div.mw-search-result-heading a').each((index, element) => {
            const parkName = $$$$(element).text().trim();
            if (parkName) {
              const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName + ' ' + location)}`;
              parks.push({ name: parkName, link: googleMapsLink });
            }
          });
        }
      }
    }

    return parks;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`No parks category page found for location: ${location}`);
      return { error: `No parks category page found for location: ${location}` };
    } else {
      console.error('Error scraping parks:', error);
      return { error: 'Failed to fetch parks data' };
    }
  }
}

module.exports = scrapeParks;

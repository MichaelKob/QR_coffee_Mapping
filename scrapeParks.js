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

      // Parse search results to find relevant pages with lists of parks
      const searchResults = [];
      $$('div.mw-search-result-heading a').each((index, element) => {
        const pageTitle = $$(element).text().trim();
        const pageLink = `https://en.wikipedia.org${$$(element).attr('href')}`;
        if (pageTitle.toLowerCase().includes('list of parks') || pageTitle.toLowerCase().includes('parks in')) {
          searchResults.push(pageLink);
        }
      });

      // Follow links to extract park names
      for (const pageLink of searchResults) {
        const { data: pageData } = await axios.get(pageLink);
        const $$$ = cheerio.load(pageData);

        $$$('div.mw-category-group ul li a').each((index, element) => {
          const parkName = $$$(element).text().trim();
          if (parkName) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName + ' ' + location)}`;
            parks.push({ name: parkName, link: googleMapsLink });
          }
        });

        if (parks.length > 0) break; // Stop if parks are found
      }

      // Additional fallback: Directly search for parks in the location
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

        // Additional fallback: Directly search for "public parks in [location]"
        if (parks.length === 0) {
          const finalSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent('public parks in ' + location)}`;
          const { data: finalSearchData } = await axios.get(finalSearchUrl);
          const $$$$$ = cheerio.load(finalSearchData);

          $$$$$('div.mw-search-result-heading a').each((index, element) => {
            const parkName = $$$$$(element).text().trim();
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

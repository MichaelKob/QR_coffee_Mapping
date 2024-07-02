const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeParks(location) {
  try {
    // Construct the URL based on the user's inputted location
    const url = `https://en.wikipedia.org/wiki/Category:Parks_in_${encodeURIComponent(location)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const places = [];

    $('div.mw-category-group ul li a').each((index, element) => {
      const placeName = $(element).text().trim();
      if (placeName) {
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
        places.push({ name: placeName, link: googleMapsLink });
      }
    });

    // If no places are found, try an alternative URL or search query
    if (places.length === 0) {
      const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' parks beaches lakes')}`;
      const { data: searchData } = await axios.get(searchUrl);
      const $$ = cheerio.load(searchData);

      // Parse search results to find relevant pages with lists of places
      const searchResults = [];
      $$('div.mw-search-result-heading a').each((index, element) => {
        const pageTitle = $$(element).text().trim();
        const pageLink = `https://en.wikipedia.org${$$(element).attr('href')}`;
        if (pageTitle.toLowerCase().includes('list of') || pageTitle.toLowerCase().includes('parks in') || pageTitle.toLowerCase().includes('beaches in') || pageTitle.toLowerCase().includes('lakes in')) {
          searchResults.push(pageLink);
        }
      });

      // Follow links to extract place names
      for (const pageLink of searchResults) {
        const { data: pageData } = await axios.get(pageLink);
        const $$$ = cheerio.load(pageData);

        $$$('div.mw-category-group ul li a').each((index, element) => {
          const placeName = $$$(element).text().trim();
          if (placeName) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
            places.push({ name: placeName, link: googleMapsLink });
          }
        });

        if (places.length > 0) break; // Stop if places are found
      }

      // Additional fallback: Directly search for places in the location
      if (places.length === 0) {
        const directSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' public parks beaches lakes')}`;
        const { data: directSearchData } = await axios.get(directSearchUrl);
        const $$$$ = cheerio.load(directSearchData);

        $$$$('div.mw-search-result-heading a').each((index, element) => {
          const placeName = $$$$(element).text().trim();
          if (placeName) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
            places.push({ name: placeName, link: googleMapsLink });
          }
        });

        // Additional fallback: Directly search for "public parks beaches lakes in [location]"
        if (places.length === 0) {
          const finalSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent('public parks beaches lakes in ' + location)}`;
          const { data: finalSearchData } = await axios.get(finalSearchUrl);
          const $$$$$ = cheerio.load(finalSearchData);

          $$$$$('div.mw-search-result-heading a').each((index, element) => {
            const placeName = $$$$$(element).text().trim();
            if (placeName) {
              const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
              places.push({ name: placeName, link: googleMapsLink });
            }
          });
        }
      }
    }

    return places;
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

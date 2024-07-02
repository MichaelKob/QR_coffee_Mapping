const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeParks(location) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    const { data: geocodeData } = await axios.get(geocodeUrl);
    if (!geocodeData.results || geocodeData.results.length === 0 || !geocodeData.results[0].geometry) {
      console.error(`Geocoding API returned no results or no geometry data for location: ${location}`, geocodeData);
      return { error: `Geocoding API returned no results or no geometry data for location: ${location}` };
    }
    const cityBounds = geocodeData.results[0].geometry.bounds;

    const filterPlacesWithinCityBounds = (places, cityBounds) => {
      return places.filter(place => {
        const { lat, lng } = place.location;
        return (
          lat >= cityBounds.southwest.lat &&
          lat <= cityBounds.northeast.lat &&
          lng >= cityBounds.southwest.lng &&
          lng <= cityBounds.northeast.lng
        );
      });
    };

    // Construct a more general search URL based on the user's inputted location
    const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' parks beaches lakes')}`;
    const { data: searchData } = await axios.get(searchUrl);
    const $ = cheerio.load(searchData);

    const places = [];

    // Parse search results to find relevant pages with lists of places
    const searchResults = [];
    $('div.mw-search-result-heading a').each((index, element) => {
      const pageTitle = $(element).text().trim();
      const pageLink = `https://en.wikipedia.org${$(element).attr('href')}`;
      if (pageTitle.toLowerCase().includes('list of') || pageTitle.toLowerCase().includes('parks in') || pageTitle.toLowerCase().includes('beaches in') || pageTitle.toLowerCase().includes('lakes in')) {
        searchResults.push(pageLink);
      }
    });

    // Follow links to extract place names
    for (const pageLink of searchResults) {
      const { data: pageData } = await axios.get(pageLink);
      const $$ = cheerio.load(pageData);

      $$('div.mw-category-group ul li a').each((index, element) => {
        const placeName = $$(element).text().trim();
        if (placeName && !placeName.toLowerCase().includes('list of') && !placeName.toLowerCase().includes('department') && !placeName.toLowerCase().includes('state')) {
          const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
          places.push({ name: placeName, link: googleMapsLink });
        }
      });

      if (places.length > 0) {
        const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
        return filteredPlaces;
      }
    }

    // Additional fallback: Directly search for places in the location
    if (places.length === 0) {
      const directSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' public parks beaches lakes')}`;
      const { data: directSearchData } = await axios.get(directSearchUrl);
      const $$$ = cheerio.load(directSearchData);

      $$$('div.mw-search-result-heading a').each((index, element) => {
        const placeName = $(element).text().trim();
        if (placeName && !placeName.toLowerCase().includes('list of') && !placeName.toLowerCase().includes('department') && !placeName.toLowerCase().includes('state')) {
          const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
          places.push({ name: placeName, link: googleMapsLink });
        }
      });

      if (places.length > 0) {
        const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
        return filteredPlaces;
      }

      // Additional fallback: Directly search for "public parks beaches lakes in [location]"
      if (places.length === 0) {
        const finalSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent('public parks beaches lakes in ' + location)}`;
        const { data: finalSearchData } = await axios.get(finalSearchUrl);
        const $$$$ = cheerio.load(finalSearchData);

        $$$$('div.mw-search-result-heading a').each((index, element) => {
          const placeName = $(element).text().trim();
          if (placeName && !placeName.toLowerCase().includes('list of') && !placeName.toLowerCase().includes('department') && !placeName.toLowerCase().includes('state')) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
            places.push({ name: placeName, link: googleMapsLink });
          }
        });

        if (places.length > 0) {
          const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
          return filteredPlaces;
        }
      }
    }

    // Final fallback: Use Google Maps Places API to search for public places to enjoy coffee
    if (places.length === 0) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const googleSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=public+parks+beaches+lakes+in+${encodeURIComponent(location)}&key=${apiKey}`;
      const { data: googleData } = await axios.get(googleSearchUrl);

      googleData.results.forEach(result => {
        const placeName = result.name;
        const placeLocation = result.geometry.location;
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
        places.push({ name: placeName, link: googleMapsLink, location: placeLocation });
      });
    }

    const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);

    return filteredPlaces;
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

const axios = require('axios');
const cheerio = require('cheerio');
const Bottleneck = require('bottleneck');
const cache = new Map();

const limiter = new Bottleneck({
  minTime: 2000, // Minimum time between requests in milliseconds
  maxConcurrent: 1, // Maximum number of concurrent requests
});

async function scrapeParks(location) {
  console.log(`Starting scrapeParks for location: ${location}`);
  try {
    if (cache.has(location)) {
      console.log(`Serving from cache for location: ${location}`);
      return cache.get(location);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    console.log(`Requesting geocode data for location: ${location}`);
    const { data: geocodeData } = await limiter.schedule(() => axios.get(geocodeUrl));
    console.log('Geocode Data:', JSON.stringify(geocodeData, null, 2));
    if (!geocodeData.results || geocodeData.results.length === 0 || !geocodeData.results[0].geometry) {
      console.error(`Geocoding API returned no results or no geometry data for location: ${location}`, geocodeData);
      console.log('Full Geocoding API response:', JSON.stringify(geocodeData, null, 2));
      return { error: `Geocoding API returned no results or no geometry data for location: ${location}` };
    }
    const cityBounds = geocodeData.results[0].geometry.bounds;

    const filterPlacesWithinCityBounds = (places, cityBounds) => {
      if (!cityBounds) {
        console.warn('City bounds are not defined.');
        return places; // If city bounds are not defined, return all places
      }
      return places.filter(place => {
        if (!place.location) {
          console.warn(`Place ${place.name} does not have location data.`);
          return false; // Exclude places without location data
        }
        const { lat, lng } = place.location;
        return (
          lat >= cityBounds.southwest.lat &&
          lat <= cityBounds.northeast.lat &&
          lng >= cityBounds.southwest.lng &&
          lng <= cityBounds.northeast.lng
        );
      });
    };

    // Construct a more specific search URL based on the user's inputted location
    const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' public parks beaches lakes outdoor spaces')}`;
    console.log(`Requesting search data from Wikipedia for location: ${location}`);
    const { data: searchData } = await limiter.schedule(() => axios.get(searchUrl));
    console.log('Search Data:', searchData);
    const $ = cheerio.load(searchData);

    const places = [];

    // Parse search results to find relevant pages with lists of places
    const searchResults = [];
    $('div.mw-search-result-heading a').each((index, element) => {
      const pageTitle = $(element).text().trim();
      const pageLink = `https://en.wikipedia.org${$(element).attr('href')}`;
      if (pageTitle.toLowerCase().includes(location.toLowerCase()) && (pageTitle.toLowerCase().includes('parks') || pageTitle.toLowerCase().includes('public places') || pageTitle.toLowerCase().includes('recreational areas') || pageTitle.toLowerCase().includes('outdoor spaces'))) {
        searchResults.push(pageLink);
      }
    });
    console.log('Search Results:', searchResults);

    // Follow links to extract place names and fetch location data
    for (const pageLink of searchResults) {
      console.log(`Requesting page data from Wikipedia for link: ${pageLink}`);
      const { data: pageData } = await limiter.schedule(() => axios.get(pageLink));
      const $$ = cheerio.load(pageData);

      const placePromises = $$('div.mw-category-group ul li a, div.mw-parser-output ul li a').map(async (index, element) => {
        const placeName = $$(element).text().trim();
        if (
          placeName &&
          placeName.length > 2 &&
          !placeName.match(/^\[\d+\]$/) &&
          !placeName.toLowerCase().includes('list of') &&
          !placeName.toLowerCase().includes('department') &&
          !placeName.toLowerCase().includes('state') &&
          !placeName.toLowerCase().includes('portal') &&
          !placeName.toLowerCase().includes('kml') &&
          !placeName.toLowerCase().includes('gpx') &&
          !placeName.toLowerCase().includes('coordinates') &&
          !placeName.toLowerCase().includes('nudity') &&
          !placeName.toLowerCase().includes('episode') &&
          !placeName.toLowerCase().includes('film') &&
          !placeName.toLowerCase().includes('olympics') &&
          !placeName.toLowerCase().includes('committee') &&
          !placeName.toLowerCase().includes('amusement') &&
          !placeName.toLowerCase().includes('theme park') &&
          !placeName.toLowerCase().includes('metro') &&
          !placeName.toLowerCase().includes('multistorey car park') &&
          !placeName.toLowerCase().includes('beaches') &&
          !placeName.toLowerCase().includes('nude') &&
          !placeName.toLowerCase().includes('clothing-optional') &&
          !placeName.toLowerCase().includes('recreation') &&
          !placeName.toLowerCase().includes('recreational') &&
          !placeName.toLowerCase().includes('nude recreation') &&
          !placeName.toLowerCase().includes('airport') &&
          !placeName.toLowerCase().includes('premium outlets') &&
          !placeName.toLowerCase().includes('ferry terminal') &&
          !placeName.toLowerCase().includes('convention center') &&
          !placeName.toLowerCase().includes('shopping') &&
          !placeName.toLowerCase().includes('mall') &&
          !placeName.toLowerCase().includes('stadium') &&
          !placeName.toLowerCase().includes('arena') &&
          !placeName.toLowerCase().includes('theater') &&
          !placeName.toLowerCase().includes('cinema') &&
          !placeName.toLowerCase().includes('zoo') &&
          !placeName.toLowerCase().includes('entertainment district') &&
          !placeName.toLowerCase().includes('sports complex') &&
          !placeName.toLowerCase().includes('industrial park') &&
          !placeName.toLowerCase().includes('business park') &&
          placeName.toLowerCase() !== location.toLowerCase() &&
          !placeName.toLowerCase().includes('clothing-optional activities') &&
          !placeName.toLowerCase().includes('lake keowee')
        ) {
          const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
          const geocodePlaceUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName + ' ' + location)}&key=${apiKey}`;
          const { data: placeGeocodeData } = await limiter.schedule(() => axios.get(geocodePlaceUrl));
          if (placeGeocodeData.results && placeGeocodeData.results.length > 0 && placeGeocodeData.results[0].geometry) {
            const placeLocation = placeGeocodeData.results[0].geometry.location;
            return { name: placeName, link: googleMapsLink, location: placeLocation };
          } else {
            return { name: placeName, link: googleMapsLink };
          }
        }
      }).get();

      const extractedPlaces = await Promise.all(placePromises);
      places.push(...extractedPlaces.filter(Boolean));

      console.log('Extracted Places:', places);

      if (places.length > 0) {
        const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
        console.log('Filtered Places:', filteredPlaces);
        cache.set(location, filteredPlaces);
        console.log(`Caching results for location: ${location}`);
        return filteredPlaces;
      }
    }

    // Additional fallback: Directly search for places in the location
    if (places.length === 0) {
      const directSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(location + ' public parks beaches lakes outdoor spaces')}`;
      console.log(`Requesting direct search data from Wikipedia for location: ${location}`);
      const { data: directSearchData } = await limiter.schedule(() => axios.get(directSearchUrl));
      const $$$ = cheerio.load(directSearchData);

      $$$('div.mw-search-result-heading a').each(async (index, element) => {
        const placeName = $(element).text().trim();
        if (placeName && placeName.length > 2 && !placeName.match(/^\[\d+\]$/) && !placeName.toLowerCase().includes('list of') && !placeName.toLowerCase().includes('department') && !placeName.toLowerCase().includes('state')) {
          const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
          const geocodePlaceUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName + ' ' + location)}&key=${apiKey}`;
          const { data: placeGeocodeData } = await limiter.schedule(() => axios.get(geocodePlaceUrl));
          if (placeGeocodeData.results && placeGeocodeData.results.length > 0 && placeGeocodeData.results[0].geometry) {
            const placeLocation = placeGeocodeData.results[0].geometry.location;
            places.push({ name: placeName, link: googleMapsLink, location: placeLocation });
          } else {
            places.push({ name: placeName, link: googleMapsLink });
          }
        }
      });

      if (places.length > 0) {
        const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
        console.log('Filtered Places:', filteredPlaces);
        cache.set(location, filteredPlaces);
        console.log(`Caching results for location: ${location}`);
        return filteredPlaces;
      }

      // Additional fallback: Directly search for "public parks beaches lakes in [location]"
      if (places.length === 0) {
        const finalSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent('public parks beaches lakes in ' + location)}`;
        const { data: finalSearchData } = await limiter.schedule(() => axios.get(finalSearchUrl));
        const $$$$ = cheerio.load(finalSearchData);

        $$$$('div.mw-search-result-heading a').each(async (index, element) => {
          const placeName = $(element).text().trim();
          if (placeName && placeName.length > 2 && !placeName.match(/^\[\d+\]$/) && !placeName.toLowerCase().includes('list of') && !placeName.toLowerCase().includes('department') && !placeName.toLowerCase().includes('state')) {
            const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
            const geocodePlaceUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName + ' ' + location)}&key=${apiKey}`;
            const { data: placeGeocodeData } = await limiter.schedule(() => axios.get(geocodePlaceUrl));
            if (placeGeocodeData.results && placeGeocodeData.results.length > 0 && placeGeocodeData.results[0].geometry) {
              const placeLocation = placeGeocodeData.results[0].geometry.location;
              places.push({ name: placeName, link: googleMapsLink, location: placeLocation });
            } else {
              places.push({ name: placeName, link: googleMapsLink });
            }
          }
        });

        if (places.length > 0) {
          const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
          console.log('Filtered Places:', filteredPlaces);
          cache.set(location, filteredPlaces);
          return filteredPlaces;
        }
      }
    }

    // Final fallback: Use Google Maps Places API to search for public places to enjoy coffee
    if (places.length === 0) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const googleSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=public+parks+beaches+lakes+in+${encodeURIComponent(location)}&key=${apiKey}`;
      const { data: googleData } = await axios.get(googleSearchUrl);
      console.log('Google Data:', googleData);

      googleData.results.forEach(result => {
        const placeName = result.name;
        const placeLocation = result.geometry.location;
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + location)}`;
        places.push({ name: placeName, link: googleMapsLink, location: placeLocation });
      });
    }

    const filteredPlaces = filterPlacesWithinCityBounds(places, cityBounds);
    cache.set(location, filteredPlaces);

    return filteredPlaces;
  } catch (error) {
    console.error('Error scraping parks:', error);
    if (error.response) {
      if (error.response.status === 404) {
        console.error(`No parks category page found for location: ${location}`);
        return { error: `No parks category page found for location: ${location}` };
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded. Please try again later.');
        return { error: 'Rate limit exceeded. Please try again later.' };
      } else {
        console.error('Error scraping parks:', error.response.data);
        return { error: `Failed to fetch parks data: ${error.response.data}` };
      }
    } else {
      console.error('Error scraping parks:', error.message);
      return { error: `Failed to fetch parks data: ${error.message}` };
    }
  }
}
module.exports = scrapeParks;

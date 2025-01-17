import React, { useState, useCallback } from 'react';
import { ChakraProvider, Box, Text, Spinner } from '@chakra-ui/react';
import { LoadScript } from '@react-google-maps/api';
import LocationInput from './LocationInput';
import './App.css';
import debounce from 'lodash.debounce';

const libraries = ['places'];

function App() {
  const [coffeeSpots, setCoffeeSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoffeeSpots = async (location) => {
    try {
      const url = `https://find-coffee-places-09fui5rv.devinapps.com/search?location=${encodeURIComponent(location)}`;
      console.log('Fetching coffee spots with URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.results.map(result => ({
        locationName: result.name,
        googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name)}`,
        description: result.description
      }));
    } catch (error) {
      console.error('Error fetching coffee spots:', error);
      setError(error.message || 'Failed to fetch coffee spots. Please try again later.');
      return [];
    }
  };

  const handleLocationSubmit = useCallback(debounce(async (location) => {
    console.log('Location submitted:', location);
    setLoading(true);
    setError(null);
    const spots = await fetchCoffeeSpots(location);
    setCoffeeSpots(spots);
    setLoading(false);
  }, 1000), []); // 1000ms debounce delay

  return (
    <ChakraProvider>
      <LoadScript googleMapsApiKey="AIzaSyC1VZovf-APD8GfC-8a7kAx28U8Ure-RDI" libraries={libraries}>
        <Box className="App" display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={4}>
          <header className="App-header">
            <Text fontSize="3xl" mb={6}>
              Find Public Places to Enjoy Coffee
            </Text>
            <LocationInput onLocationSubmit={handleLocationSubmit} />
            <Box mt={6} width="100%" maxWidth="600px">
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Spinner size="xl" />
                </Box>
              ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Text color="red.500">{error}</Text>
                </Box>
              ) : (
                coffeeSpots.length > 0 && (
                  <Box>
                    <Text fontSize="2xl" mb={4}>
                      Suggested Places:
                    </Text>
                    <ul>
                      {coffeeSpots.map((spot, index) => (
                        <li key={index} style={{ marginBottom: '1rem' }}>
                          <span style={{ fontSize: '1.2rem', color: '#000' }}>
                            <a href={spot.googleMapsLink} target="_blank" rel="noopener noreferrer">
                              {spot.locationName}
                            </a>
                          </span>
                          <p>{spot.description}</p>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )
              )}
            </Box>
          </header>
        </Box>
      </LoadScript>
    </ChakraProvider>
  );
}

export default App;

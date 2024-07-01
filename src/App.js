import React, { useState } from 'react';
import { ChakraProvider, Box, Text, Spinner } from '@chakra-ui/react';
import { LoadScript } from '@react-google-maps/api';
import LocationInput from './LocationInput';
import './App.css';

const libraries = ['places'];

function App() {
  const [coffeeSpots, setCoffeeSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationSubmit = async (location) => {
    setLoading(true);
    setError(null);
    const spots = await fetchCoffeeSpots(location);
    setCoffeeSpots(spots);
    setLoading(false);
  };

  const fetchCoffeeSpots = async (location) => {
    try {
      const response = await fetch(`https://find-coffee-spots-wh4w4z73.devinapps.com/search?location=${encodeURIComponent(location)}`);
      const data = await response.json();
      return data.results.map(result => ({
        locationName: result.locationName,
        googleMapsLink: result.googleMapsLink,
        description: result.description
      }));
    } catch (error) {
      console.error('Error fetching coffee spots:', error);
      setError('Failed to fetch coffee spots. Please try again later.');
      return [];
    }
  };

  return (
    <ChakraProvider>
      <LoadScript googleMapsApiKey="AIzaSyDXJtwF2zxznMRB1PwzwVkJfQCLXr21nWQ" libraries={libraries}>
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
                          <a href={spot.googleMapsLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.2rem', color: '#3182ce' }}>
                            {spot.locationName}
                          </a>
                          <p style={{ fontSize: '1rem', color: '#4a5568' }}>{spot.description}</p>
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

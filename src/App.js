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
      const websiteContent = data.results.map(result => result.description).join('\n');
      const suggestions = await processWebsiteContent(websiteContent);
      return suggestions.map(suggestion => ({
        locationName: suggestion,
        googleMapsLink: '',
        description: ''
      }));
    } catch (error) {
      console.error('Error fetching coffee spots:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      setError('Failed to fetch coffee spots. Please try again later.');
      return [];
    }
  };

  const processWebsiteContent = async (websiteContent) => {
    try {
      const response = await fetch('https://find-coffee-spots-wh4w4z73.devinapps.com/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ websiteContent })
      });
      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Error processing website content:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      setError('Failed to process website content. Please try again later.');
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
                          <span style={{ fontSize: '1.2rem', color: '#000' }}>
                            {spot.locationName}
                          </span>
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

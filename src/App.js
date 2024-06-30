import React, { useState } from 'react';
import { ChakraProvider, Box, Text } from '@chakra-ui/react';
import LocationInput from './LocationInput';
import './App.css';

function App() {
  const [coffeeSpots, setCoffeeSpots] = useState([]);

  const handleLocationSubmit = async (location) => {
    const spots = await fetchCoffeeSpots(location);
    setCoffeeSpots(spots);
  };

  const fetchCoffeeSpots = async (location) => {
    try {
      const response = await fetch(`http://localhost:3001/search?location=${encodeURIComponent(location)}`);
      const data = await response.json();
      return data.results.map(result => ({
        title: result.title,
        link: result.link,
        description: result.description
      }));
    } catch (error) {
      console.error('Error fetching coffee spots:', error);
      return [];
    }
  };

  return (
    <ChakraProvider>
      <Box className="App">
        <header className="App-header">
          <Text fontSize="2xl" mb={4}>
            Find Public Places to Enjoy Coffee
          </Text>
          <LocationInput onLocationSubmit={handleLocationSubmit} />
          <Box mt={4}>
            {coffeeSpots.length > 0 && (
              <Box>
                <Text fontSize="xl" mb={2}>
                  Suggested Places:
                </Text>
                <ul>
                  {coffeeSpots.map((spot, index) => (
                    <li key={index}>
                      <a href={spot.link} target="_blank" rel="noopener noreferrer">
                        {spot.title}
                      </a>
                      <p>{spot.description}</p>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        </header>
      </Box>
    </ChakraProvider>
  );
}

export default App;

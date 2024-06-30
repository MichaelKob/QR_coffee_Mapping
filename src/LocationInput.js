import React, { useState } from 'react';
import { Box, Input, Button } from '@chakra-ui/react';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';

const libraries = ['places'];

const LocationInput = ({ onLocationSubmit }) => {
  const [location, setLocation] = useState('');

  const handleInputChange = (event) => {
    setLocation(event.target.value);
  };

  const handleSubmit = () => {
    onLocationSubmit(location);
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyDXJtwF2zxznMRB1PwzwVkJfQCLXr21nWQ" libraries={libraries}>
      <Box display="flex" alignItems="center" justifyContent="center" p={4}>
        <StandaloneSearchBox>
          <Input
            placeholder="Enter your location"
            value={location}
            onChange={handleInputChange}
            mr={2}
          />
        </StandaloneSearchBox>
        <Button onClick={handleSubmit} colorScheme="teal">
          Find Coffee Spots
        </Button>
      </Box>
    </LoadScript>
  );
};

export default LocationInput;

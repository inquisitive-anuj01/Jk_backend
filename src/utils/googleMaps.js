import axios from "axios";

export const getDistanceAndDuration = async (origin, destination, apiKey) => {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${origin.lat},${origin.lng}`,
          destinations: `${destination.lat},${destination.lng}`,
          key: apiKey,
          units: "metric",
        },
      }
    );

    if (response.data.status !== "OK") {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== "OK") {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    return {
      distance: element.distance.value / 1000, // Convert to km
      duration: Math.ceil(element.duration.value / 60), // Convert to minutes
    };
  } catch (error) {
    console.error("Google Maps API Error:", error.message);
    throw new Error("Failed to calculate route distance and duration");
  }
};

export const geocodeAddress = async (address, apiKey) => {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: address,
          key: apiKey,
        },
      }
    );

    if (response.data.status !== "OK") {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    const formattedAddress = response.data.results[0].formatted_address;

    return {
      address: formattedAddress,
      coordinates: {
        lat: location.lat,
        lng: location.lng,
      },
    };
  } catch (error) {
    console.error("Geocoding Error:", error.message);
    throw new Error("Failed to geocode address");
  }
};

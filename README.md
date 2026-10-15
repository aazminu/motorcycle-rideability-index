# Motorcycle Rideability Index

This project is a simple weather-based application that calculates the rideability index for motorcycles based on current weather conditions. 
It uses an Express.js server and PouchDB for data storage.

## Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aazminu/motorcycle-rideability-index.git
   cd motorcycle-rideability-index

# API Documentation

# Get Weather Data 
   Endpoint: /api/weather/:zipCode
   Method: GET
   Description: Retrieves weather data and calculates the rideability score for the given zip code.
   Example Request: GET /api/weather/98052
   Example Response:
   {
     "location": "Redmond",
     "temperature": 18,
     "humidity": 60,
     "weather": "clear sky",
     "precipitation": 0,
     "visibility": 10,
     "wind": 3.1,
     "rideabilityScore": 9
   }

# Get All Entries
   Endpoint: /api/searches
   Method: GET
   Description: Retrieves all search entries.
   Example Response, comes in an Array of Json Obj:
  {
    "_id": "1",
    "zipCode": "98052",
    "location": "Redmond",
    "temperature": 18,
    "humidity": 60,
    "weather": "clear sky",
    "precipitation": 0,
    "visibility": 10,
    "wind": 3.1,
    "rideabilityScore": 9
  }


# Create New Entry 
   Endpoint: /api/searches
   Method: POST
   Description: Creates a new search entry in the database.
   Example Request Body:
   {
     "zipCode": "98052",
     "location": "Redmond",
     "temperature": 18,
     "humidity": 60,
     "weather": "clear sky",
     "precipitation": 0,
     "visibility": 10,
     "wind": 3.1
   }
   Example Response:
   {
     "_id": "1",
     "zipCode": "98052",
     "location": "Redmond",
     "temperature": 18,
     "humidity": 60,
     "weather": "clear sky",
     "precipitation": 0,
     "visibility": 10,
     "wind": 3.1,
     "rideabilityScore": 9
   }

# Update Search Entry 
   Endpoint: /api/searches/:id
   Method: PUT
   Description: Updates an existing search entry.
   Example Request: PUT /api/searches/1
   Body: {
  "location": "New Location"
   }
   Example Response: 
   {
  "_id": "1",
  "zipCode": "98052",
  "location": "New Location",
  "temperature": 18,
  "humidity": 60,
  "weather": "clear sky",
  "precipitation": 0,
  "visibility": 10,
  "wind": 3.1,
  "rideabilityScore": 9
   }

# Delete Search 
   Endpoint: /api/searches/:id
   Method: DELETE
   Description: Deletes a search entry from the database.
   Example Response:
   {
  "message": "Search entry deleted successfully"
   }





   

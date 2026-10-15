
//Event Listener for score button 
document.getElementById('get-score-button').addEventListener('click', async () => {
    const zip = document.getElementById('zip-input').value;
    const errorMessage = document.getElementById('error-message');
  
    // error message if there is no zip code
    if (!zip) {
      errorMessage.textContent = 'Please enter a zip code.';
      return;
    }
    //resets error message
    errorMessage.textContent = '';

    
    try {
      //calls the APi  with a get method and the provided zip, utilizes the fetch method. 
      const response = await fetch(`http://localhost:5001/api/weather/${zip}`, { method: 'GET' });
      
      //if there is no real response 
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      // create an entry to save 
      const searchEntry = await response.json();
      

      //updates DOM with the data from the entry 
      document.getElementById('results-location').textContent = searchEntry.location || 'unknown';
      document.getElementById('temperature').textContent = searchEntry.temperature;
      document.getElementById('humidity').textContent = searchEntry.humidity;
      document.getElementById('weather-description').textContent = searchEntry.weather;
      document.getElementById('precipitation').textContent = searchEntry.precipitation;
      document.getElementById('visibility').textContent = searchEntry.visibility;
      document.getElementById('wind').textContent = searchEntry.wind;
      document.getElementById('rideability-score').textContent = searchEntry.rideabilityScore;
  
      //switches to results page 
      showResults();

      // If data is not properly sent back 
    } catch (error) {
      errorMessage.textContent = 'Error fetching weather data.';
      console.error('Error fetching weather data:', error);
    }
  });
  
  function updateRecentsView() {
    
  // retrieves recent searches from API
    fetch(`http://localhost:5001/api/searches`)

      .then(response => response.json())
      .then(searches => {
        //Clears recents Container 
        const recentsContainer = document.getElementById('recents-container');
        recentsContainer.innerHTML = '';
  
        if (searches.length === 0) {
          recentsContainer.innerHTML = '<p>No recent searches.</p>';
          return;
        }
        
        //for each returned search creates a new element 
        searches.forEach(search => {
          const searchDiv = document.createElement('div');
          searchDiv.classList.add('recent-search');
  
          searchDiv.innerHTML = `
            <h3>${search.location} (${search.zipCode})</h3>
            <p><strong>Temperature:</strong> ${search.temperature} °C</p>
            <p><strong>Humidity:</strong> ${search.humidity} %</p>
            <p><strong>Weather:</strong> ${search.weather}</p>
            <p><strong>Precipitation:</strong> ${search.precipitation} mm</p>
            <p><strong>Visibility:</strong> ${search.visibility} km</p>
            <p><strong>Wind Speed:</strong> ${search.wind} m/s</p>
            <p><strong>Rideability Score:</strong> ${search.rideabilityScore}</p>
            <button onclick="deleteSearch('${search._id}')">Delete</button>
            <button onclick="editSearch('${search._id}', '${search.location}')">Edit</button>
          `;
          //appends it to the search div
          recentsContainer.appendChild(searchDiv);
        });
      })
      //error in loading searches 
      .catch(error => {
        console.error('Error loading recent searches:', error);
      });
  }
  
  //deletes a search based off the ID 
  function deleteSearch(id) {
    fetch(`http://localhost:5001/api/searches/${id}`, { method: 'DELETE' })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to delete search');
        }
        updateRecentsView();
      })
      .catch(error => {
        console.error('Error deleting search:', error);
      });
  }
  
  //allows location to be edited 
  function editSearch(id, location) {
    const newLocation = prompt(`Edit location for ${location}:`, location);
    if (newLocation) {
      fetch(`http://localhost:5001/api/searches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: newLocation })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to update search');
          }
          updateRecentsView();
        })
        .catch(error => {
          console.error('Error updating search:', error);
        });
    }
  }
  
  //updates recent view and then shows it. 
  document.querySelector('a[onclick="showRecents()"]').addEventListener('click', () => {
    updateRecentsView();
    showRecents();
  });
  
  function showResults() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('results-view').style.display = 'block';
    document.getElementById('recents-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
  }
  
  function showRecents() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('results-view').style.display = 'none';
    document.getElementById('recents-view').style.display = 'block';
    document.getElementById('about-view').style.display = 'none';
  }
  
  function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('results-view').style.display = 'none';
    document.getElementById('recents-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
  }
  function showAbout() {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('results-view').style.display = 'none';
    document.getElementById('recents-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'block';
}
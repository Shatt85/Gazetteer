// ---------------------------------------------------------
// GLOBAL DECLARATIONS
// ---------------------------------------------------------

var map;
var countryData = null;
var countryBordersData = null;
var userMarker = null;

// tile layers
var streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
});

var satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
});

// LayerGroups for cities and airports
var cityLayerGroup = L.layerGroup();
var airportLayerGroup = L.layerGroup();
    
// Marker Clusters for better visualization
var cityClusterGroup = L.markerClusterGroup();
var airportClusterGroup = L.markerClusterGroup();

var basemaps = {
    "Streets": streets,
    "Satellite": satellite,
};

var overlays = {
    "Cities": cityClusterGroup,
    "Airports": airportClusterGroup
}

// Handle errors for AJAX or other operations
function handleError(error) {
    console.error('Error:', error.message);
}

// Initialise map and add controls once DOM is ready
$(document).ready(function () {
    console.log('Document ready');
    map = L.map("map", {
        layers: [streets],
    }).setView([54.5, -4], 6);

    layerControl = L.control.layers(basemaps, overlays).addTo(map);

    function toggleMarkers(markerArray) {
        markerArray.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            } else {
                marker.addTo(map);
            }
        });
    }

    // Global marker arrays for each data type
    let cityMarkers = [];
    let volcanoMarkers = [];
    let airportMarkers = [];

   // Function to clear markers
   function clearCityAndAirportMarkers() {
    cityMarkers.forEach(marker => marker.remove());
    airportMarkers.forEach(marker => marker.remove());
    cityMarkers = [];
    airportMarkers = [];
    }
    
    // Function to clear volcano markers only
    function clearVolcanoMarkers() {
        volcanoMarkers.forEach(marker => marker.remove());
        volcanoMarkers = [];
    }

    //button for country info
    L.easyButton("fa-info", function (btn, map) {
        var selectedCountry = $('#selectedCountry').val() || $('#selectedCountryCopy').val();
        if (selectedCountry) {
            $('#selectedCountry').val(selectedCountry); // First hidden input 
            $('#selectedCountryCopy').val(selectedCountry); // Second hidden input
            fetchCountryInfo(selectedCountry).then(showCountryInfoModal);
        } else {
            alert("Please select a country first.");
        }
    }).addTo(map);

    // Button for weather info
    L.easyButton("fa-solid fa-cloud-sun-rain", function (btn, map) {
        var selectedCountry = $('#selectedCountry').val() || $('#selectedCountryCopy').val();
        if (selectedCountry) {
            $('#selectedCountry').val(selectedCountry); // First hidden input 
            $('#selectedCountryCopy').val(selectedCountry); // Second hidden input
            fetchCountryInfo(selectedCountry)
                .then(function (countryInfo) {
                    if (!countryInfo.capital) {
                        throw new Error('Capital city not found in country info');
                    }
                    var capitalCity = countryInfo.capital;
                    return fetchWeatherInfo(capitalCity);
                })
                .then(showWeatherInfoModal)
                .catch(function (error) {
                    console.error('Error:', error);
                    alert('Error fetching information: ' + error.message);
                });
        } else {
            alert("Please select a country first.");
        }
    }).addTo(map);

    // Button for news info
    L.easyButton('fa-newspaper', function (btn, map) {
        var selectedCountry = $('#selectedCountry').val() || $('#selectedCountryCopy').val();
        if (selectedCountry) {
            $('#selectedCountry').val(selectedCountry); // First hidden input 
            $('#selectedCountryCopy').val(selectedCountry); // Second hidden input
            fetchNews(selectedCountry);
        } else {
            alert('Please select a country first.');
        }
    }).addTo(map);
    
    // Easy Button for currency info
    L.easyButton('fa-coins', function () {
        var selectedCountryCode = $('#countrySelect').val() || $('#selectedCountryCopy').val(); // Get the selected country code
    
        if (!selectedCountryCode) {
            alert("Please select a country first.");
            return;
        }
    
        fetchCurrencyInfo(selectedCountryCode);
    }).addTo(map);
    

    // Button for volcano info
    L.easyButton("fa-solid fa-volcano", function (btn, map) {
        var selectedCountryName = $('#countrySelect option:selected').text(); // Get the country name (visible text)


        if (!selectedCountryName) {
            alert("Please select a country first.");
            return;
        }

        // Clear existing city and airport markers (but leave volcano markers intact)
        clearCityAndAirportMarkers();

        // Clear volcano markers before fetching new data for the selected country
        clearVolcanoMarkers();  // Only clear volcano markers

        // Fetch new volcano data and add new markers
        fetchVolcanoInfo(selectedCountryName);
    }).addTo(map);

    //load borders before populating the dropdown information
    loadCountryBorders().then(() => {
        populateDropDown();
    }).catch(handleError);

    // Handle country selection
    $('#countrySelect').on('change', function () {
        var selectedCountry = this.value;
        if (selectedCountry) {
            $('#selectedCountry').val(selectedCountry); // Set the hidden input for the selected country
            $('#selectedCountryCopy').val(selectedCountry); // Set the second hidden input
    
            // Load and apply borders for the selected country (ISO3)
            loadCountryBorders(selectedCountry).then((data) => {
                applyCountryBorder(map, data.features);
            }).catch(handleError);
        }
    
        if (selectedCountry) {
            // Clear previous markers for cities and airports
            cityClusterGroup.clearLayers();
            airportClusterGroup.clearLayers();
    
            // Fetch and display new data (cities, airports)
            fetchCityInfo(selectedCountry);
            fetchAirportsInfo(selectedCountry);
        }
    });

    // Load borders based on the ISO3 code (for country selection)
    function loadCountryBorders(selectedCountry) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: 'libs/php/borders.php',  // Use the borders.php script for ISO3
                data: { selectedCountry: selectedCountry },
                success: function (data) {
                    if (data.status.code === "200") {
                        countryBordersData = data; // Store the fetched data
                        resolve(data);
                    } else {
                        reject(new Error(data.status.description));
                    }
                },
                error: function (xhr, status, error) {
                    reject(new Error('Failed to load country borders: ' + status));
                }
            });
        });
    }

    //function to populate the dropdown menu with a list of countries
    function populateDropDown() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'libs/php/main.php',
                method: 'GET',
                dataType: 'json',   
                success: function (response) {
                    response.data.forEach(function (country) {
                        var option = $('<option>', {
                            value: country.iso_a3,
                            text: country.name
                        });
                        $('#countrySelect').append(option);
                    });
                    resolve();
                },
                error: function () {
                    console.error('Error fetching country data.');
                    reject();
                }
            });
        });
    }

    // Function to retrieve country information from countryInfo.php
    function fetchCountryInfo(countryCode) {
        console.log('Fetching country info for:', countryCode);

        // Fetch country information
        const countryInfoPromise = $.ajax({
            url: 'libs/php/countryInfo.php',
            method: 'GET',
            data: { countryCode: countryCode },
            dataType: 'json'
        });

        // Fetch flag URL
        const flagPromise = $.ajax({
            url: 'libs/php/getFlag.php',
            method: 'GET',
            data: { countryCodeIso3: countryCode },
            dataType: 'json'
        });

        // Wait for both promises to complete
        return Promise.all([countryInfoPromise, flagPromise])
            .then(([countryInfoResponse, flagResponse]) => {
                console.log('Country info response:', countryInfoResponse);
                console.log('Flag response:', flagResponse);

                if (countryInfoResponse.status.code === 200 && flagResponse.status.code === 200) {
                    return { ...countryInfoResponse.data, flagUrl: flagResponse.flagUrl };
                } else {
                    throw new Error('Error fetching country info or flag data');
                }
            })
            .catch((error) => {
                console.error('Error fetching country info or flag:', error);
                throw error;
            });
    }


    function showCountryInfoModal(data) {
        console.log('Showing country info modal...');
        if (data) {
            $('#countryName').text(data.countryName);
            $('#capital').text(data.capital);
            $('#population').text(data.population);
            $('#areaInSqKm').text(`${data.areaInSqKm} sq km`);
            $('#currencyCode').text(data.currencyCode);
            
            // Update flag in the modal title
            if (data.flagUrl) {
                $('#infoFlag').attr('src', data.flagUrl).removeClass('d-none');
            }

            // Show the modal
            $('#countryInfoModal').modal('show');
        }
    }


// Dropdown change event handler to fetch and show country info
$('#selectedCountry').on('change', function() {
    var selectedCountryCode = $(this).val();
    
    // Fetch country info and show it in the modal
    fetchCountryInfo(selectedCountryCode)
        .then(showCountryInfoModal)
        .catch(function (error) {
            console.error(error);
            alert('Failed to fetch country information.');
        });
});

    $('#selectedCountry').on('change', function() {
        var selectedCountryCode = $(this).val();
        var countryName = '';
    
        countryBorders.features.forEach(function(feature) {
            if (feature.properties.iso_a3 === selectedCountryCode) {
                countryName = feature.properties.name;
            }
        });
    
        $('#selectedCountryName').val(countryName);
    });
    
    // Function to fetch weather info
    function fetchWeatherInfo(location) {
        console.log('Fetching weather info for:', location);
        return $.ajax({
            url: 'libs/php/weather.php',
            method: 'GET',
            data: { location: location },
            dataType: 'json'
        }).then(function (response) {
            console.log('Weather fetch response:', response);
            if (response.status.code === 200) {
                return response;
            } else {
                throw new Error('Weather fetch error: ' + response.status.description);
            }
        }).fail(function (xhr, status, error) {
            throw new Error('Error fetching weather: ' + status + ' ' + error);
        });
    }
    
    // Function to show the weather info modal
    function showWeatherInfoModal(data) {
        console.log('Showing weather info modal...');
        if (data && data.currentWeather && data.currentWeather.main && data.forecast && data.forecast.list) {
            const currentIcon = data.currentWeather.weather[0].icon; // Get the current weather icon code
            const currentIconUrl = `https://openweathermap.org/img/wn/${currentIcon}@2x.png`; // Construct the URL for the icon
    
            $('#currentTemperature').html(`${data.currentWeather.main.temp} °C`);
            $('#currentConditions').html(`
                ${data.currentWeather.weather[0].description} 
                <img src="${currentIconUrl}" alt="Weather Icon" class="weather-icon">
            `);
            $('#currentHumidity').text(`${data.currentWeather.main.humidity} %`);
            $('#currentWindSpeed').text(`${data.currentWeather.wind.speed} m/s`);
    
            const forecastTable = $('#weatherForecast');
            forecastTable.empty(); // Clear previous forecast data
    
            data.forecast.list.forEach(function (forecast, index) {
                if (index % 8 === 0) { // Show one forecast per day
                    const forecastIcon = forecast.weather[0].icon; // Get the forecast weather icon code
                    const forecastIconUrl = `https://openweathermap.org/img/wn/${forecastIcon}@2x.png`; // Construct the URL
    
                    forecastTable.append(`
                        <tr>
                            <td>${forecast.dt_txt}</td>
                            <td>${forecast.main.temp} °C</td>
                            <td>
                                ${forecast.weather[0].description} 
                                <img src="${forecastIconUrl}" alt="Weather Icon" class="weather-icon">
                            </td>
                        </tr>
                    `);
                }
            });
    
            $('#weatherInfoModal').modal('show');
        } else {
            alert('Error fetching weather information. Please try again.');
            console.error('Invalid data structure:', data);
        }
    }
    
    function fetchNews(countryCode) {
        $.ajax({
            url: "libs/php/news.php",
            type: "GET",
            data: { countryCode: countryCode },
            dataType: "json", // Expect JSON response
            success: function (articles) {
                if (!Array.isArray(articles)) {
                    console.error("Unexpected data format:", articles);
                    alert("Error fetching news: Unexpected response format.");
                    return;
                }
                updateNewsModal(articles);
            },
            error: function (xhr, status, error) {
                console.error("AJAX error:", status, error);
                console.error("Response:", xhr.responseText); // Log the full response
                alert("Failed to fetch news.");
            },
        });
    }
    
    function updateNewsModal(articles) {
        const newsList = document.getElementById('newsList');
        newsList.innerHTML = ''; // Clear existing content
    
        articles.forEach((article) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';
            listItem.innerHTML = `
                <h6>${article.title}</h6>
                <p><strong>Source:</strong> ${article.source || 'Unknown'} | <strong>Published:</strong> ${new Date(article.published_at).toLocaleString()}</p>
                <p>${article.description || article.snippet || 'No description available.'}</p>
                ${article.image_url ? `<img src="${article.image_url}" alt="Article image" class="img-fluid mb-2">` : ''}
                <a href="${article.url}" target="_blank">Read more</a>
            `;
            newsList.appendChild(listItem);
        });
    
        $('#newsInfoModal').modal('show'); // Show the modal
    }
    
    function fetchCurrencyInfo(countryCode) {
        $.ajax({
            url: "libs/php/currency.php", // Call the PHP script
            type: "GET",
            data: { countryCode: countryCode },
            dataType: "json",
            success: function (data) {
                console.log("Currency Info:", data);
    
                if (data.error) {
                    console.error("Error:", data.error);
                    alert("Error fetching currency info: " + data.error);
                    return;
                }
    
                // Populate the modal with currency info
                $('#currency').text(data.currencyCode);
                $('#currencyName').text(data.currencyName || "Unknown Currency");
                $('#currencyConverter').html(`
                    <strong>Exchange Rate (GBP to ${data.currencyCode}):</strong> ${data.exchangeRate}
                    <br>
                    <label for="amount">Amount (GBP):</label>
                    <input type="number" id="amount" class="form-control mb-2" placeholder="Enter amount">
                    <button id="convertButton" class="btn btn-primary btn-sm">Convert</button>
                    <p id="convertedAmount" class="mt-2"></p>
                `);
    
                // Add event listener for conversion
                $('#convertButton').off('click').on('click', function () {
                    var amount = parseFloat($('#amount').val());
                    if (!isNaN(amount) && amount > 0) {
                        var converted = amount * data.exchangeRate;
                        $('#convertedAmount').html(`<strong>Converted Amount:</strong> ${converted.toFixed(2)} ${data.currencyCode}`);
                    } else {
                        alert("Please enter a valid amount.");
                    }
                });
    
                // Show the modal
                $('#currencyInfoModal').modal('show');
            },
            error: function (xhr, status, error) {
                console.error("AJAX error:", status, error);
                alert("Failed to fetch currency data.");
            }
        });
    }    
    
    
    function fetchAirportsInfo(countryCode) {
        console.log('Fetching airport info for:', countryCode);
    
        // Clear previous markers from the cluster group
        airportClusterGroup.clearLayers();
    
        return $.ajax({
            url: 'libs/php/airports.php',
            method: 'GET',
            data: { selectedCountry: countryCode },
            dataType: 'json',
        }).then(function(response) {
            console.log('Airport Data:', response);
    
            if (response.status.code === 200) {
                addAirportMarkers(response.features);
            } else {
                console.error('Error fetching airport info:', response.status.description);
            }
        }).fail(function(xhr, status, error) {
            console.error('Error fetching airport info:', error);
        });
    }
    
    function addAirportMarkers(airportsData) {
        airportsData.forEach(function(port) {
            const lat = port.geometry.coordinates[1]; // Latitude
            const lon = port.geometry.coordinates[0]; // Longitude
            const airportName = port.properties.name || 'N/A';
            const airportType = port.properties.type || 'N/A';
            const gpsCode = port.properties.gps_code || 'N/A';
    
            // Create marker
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'custom-airport-icon',
                    html: '<i class="fa-solid fa-plane-departure" style="color: #007bff; font-size: 20px;"></i>',
                    iconSize: [30, 30], // Adjust marker size as needed
                    iconAnchor: [15, 15], // Anchor the icon at its center
                }),
            }).bindPopup(`
                <b>${airportName}</b><br>
                Type: ${airportType}<br>
                GPS Code: ${gpsCode}
            `);
    
            airportClusterGroup.addLayer(marker); // Add marker to the cluster group
        });
        map.fitBounds(airportClusterGroup.getBounds());
    }
    


    // Function to fetch volcano information for the selected country
    function fetchVolcanoInfo(countryName) {
        console.log('Fetching volcano data from PHP for country code:', countryName);

        return $.ajax({
            url: 'libs/php/volcanoData.php',
            method: 'GET',
            dataType: 'json',
            data: { country: countryName }, 
        })
        .then(function (response) {
            console.log('Volcano data fetch response from PHP:', response);

            if (response && response.length > 0) {
                addVolcanoMarkers(response);  // Add markers for the volcanoes in the selected country
            } else {
                alert('No volcano information available for the selected country.');
            }
        })
        .fail(function (xhr, status, error) {
            console.error('Error fetching volcano data from PHP:', error);
        });
    }

    // Function to add volcano markers to the map
    function addVolcanoMarkers(volcanoes) {
        volcanoes.forEach(function (volcano) {
            const lat = volcano.latitude;
            const lon = volcano.longitude;
            const volcanoName = volcano.vName || 'Unknown';
            const subregion = volcano.subregion || 'Unknown';
            const elevation = volcano.elevation_m || 'Unknown';

            // Create a custom marker with a volcano icon
            const volcanoIcon = L.icon({
                iconUrl: '/project1/libs/resources/volcano.png', 
                iconSize: [25, 25],  // Adjust size if needed
            });

            const marker = L.marker([lat, lon], { icon: volcanoIcon }).addTo(map);

            // When marker is clicked, show the modal with volcano info
            marker.on('click', function () {
                showVolcanoInfoModal({
                    vName: volcanoName,
                    subregion: subregion,
                    elevation_m: elevation,
                });
            });

            volcanoMarkers.push(marker); // Add the marker to the global array
        });
    }

    // Function to show the modal with volcano information
    function showVolcanoInfoModal(volcanoData) {
        $('#volcanoName').text(volcanoData.vName || 'Unknown');
        $('#volcanoSubregion').text(volcanoData.subregion || 'Unknown');
        $('#volcanoElevation').text(volcanoData.elevation_m ? volcanoData.elevation_m + ' meters' : 'Unknown');

        // Show the modal
        $('#volcanoInfoModal').modal('show');
    }
    function fetchCityInfo() {
        const selectedCountry = $('#selectedCountry').val() || $('#selectedCountryCopy').val(); // ISO3 code
        console.log(`Fetching top cities by population for country: ${selectedCountry}`);
    
        // Clear previous markers from the cluster group
        cityClusterGroup.clearLayers();
    
        $.ajax({
            url: './libs/php/cityData.php',
            type: 'GET',
            dataType: 'json',
            data: { countryCode: selectedCountry },
            success: function(data) {
                console.log("City Data received:", data);
    
                if (Array.isArray(data) && data.length) {
                    data.forEach(city => {
                        const { name, latitude, longitude, population, is_capital } = city;
    
                        // Create Wikipedia URL
                        const wikiUrl = `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
    
                        // Select the appropriate icon based on whether it is the capital
                        const iconUrl = is_capital ? './libs/resources/capital_logo.png' : './libs/resources/wiki_icon.png';
    
                        // Create marker
                        const marker = L.marker([latitude, longitude], {
                            icon: L.icon({
                                iconUrl: iconUrl,
                                iconSize: is_capital ? [35, 35] : [30, 30],
                            }),
                        }).bindPopup(`
                            <b>${name}</b><br>
                            Population: ${population}<br>
                            <a href="${wikiUrl}" target="_blank">Wikipedia Link</a>
                        `);
    
                        cityClusterGroup.addLayer(marker); // Add marker to the cluster group
                    });
                    map.fitBounds(cityClusterGroup.getBounds());
                } else {
                    console.log("No city data available.");
                }
            },
            error: function(error) {
                console.error("Error fetching city data:", error);
            },
        });
    }

    map.whenReady(function () {
        $('#preloader').fadeOut('slow', function () {
            $(this).remove();
        });
    });
    
    navigator.geolocation.getCurrentPosition(
        function (position) {
            console.log("Geolocation successful:", position);
            geolocation(position);
        },
        function (error) {
            console.error("Geolocation error:", error.message);
        }
    );
    
    // Geolocation function to reverse geocode and get the ISO2 code
    function geolocation(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;

        if (userMarker) {
            map.removeLayer(userMarker);
        }

        // Place user marker
        userMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup('You are here!')
            .openPopup();

        // Reverse geocode using OpenStreetMap Nominatim API
        $.getJSON(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`, function (data) {
            var iso2Code = data.address.country_code.toUpperCase(); // Get the ISO2 country code
            console.log('Country code from geolocation:', iso2Code);

            // Fetch borders based on the ISO2 code (for initial load)
            fetchBordersByIso2(iso2Code); // Call the function to fetch borders
        }).fail(function () {
            console.error('Failed to retrieve geolocation data.');
        });
    }
    
    // Fetch borders based on the ISO2 code (for initial load)
    function fetchBordersByIso2(iso2Code) {
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: 'libs/php/fetchBorderByIso2.php', 
            data: { iso2Code: iso2Code },
            success: function (response) {
                if (response.status.code === "200") {
                    applyCountryBorder(map, response.features); // Apply the borders to the map
                } else {
                    console.error('Borders not found for ISO2:', iso2Code);
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', status, error);
            }
        });
    }
    
    // Function to apply borders to the map
    function applyCountryBorder(map, features) {
        if (window.countryBorder && map.hasLayer(window.countryBorder)) {
            map.removeLayer(window.countryBorder);
        }

        window.countryBorder = L.geoJSON(features, {
            style: {
                color: "blue",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.0
            }
        }).addTo(map);

        if (window.countryBorder.getLayers().length > 0) {
            var bounds = window.countryBorder.getBounds();
            map.fitBounds(bounds);
        } else {
            console.error('No valid bounds found for the selected country.');
        }
    }
    
});
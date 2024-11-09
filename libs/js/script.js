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

var basemaps = {
    "Streets": streets,
    "Satellite": satellite
};

// Initialise map and add controls once DOM is ready
$(document).ready(function () {
    console.log('Document ready');
    map = L.map("map", {
        layers: [streets]
    }).setView([54.5, -4], 6);

    layerControl = L.control.layers(basemaps).addTo(map);

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

   // Function to clear all markers
function clearMarkers() {
    cityMarkers.forEach(marker => marker.remove());
    airportMarkers.forEach(marker => marker.remove());
    volcanoMarkers.forEach(marker => marker.remove());
    cityMarkers = [];
    airportMarkers = [];
    volcanoMarkers = [];
}

    //button for country info
    L.easyButton("fa-info", function (btn, map) {
        var selectedCountry = $('#selectedCountry').val();
        if (selectedCountry) {
            fetchCountryInfo(selectedCountry).then(showCountryInfoModal);
        } else {
            alert("Please select a country first.");
        }
    }).addTo(map);

    // Button for weather info
    L.easyButton("fa-solid fa-cloud-sun-rain", function (btn, map) {
        var selectedCountry = $('#selectedCountry').val();
        if (selectedCountry) {
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

    // Button for volcano info
    L.easyButton("fa-solid fa-volcano", function(btn, map) {
        var selectedCountryName = $('#countrySelect option:selected').text();  // Get the country name (the visible text)
        

        if (selectedCountryName) {
            if (volcanoMarkers.length > 0) {
                // Toggle existing markers
                toggleMarkers(volcanoMarkers);
            } else {
                // Fetch and add new markers
                fetchVolcanoInfo(selectedCountryName);
            }
        } else {
            alert("Please select a country first.");
        }

    }).addTo(map);


    //button for airport info
    L.easyButton("fa-solid fa-plane-departure", function (btn, map) {
        var selectedCountry = $('#selectedCountry').val();
        if (selectedCountry) {
            if (airportMarkers.length > 0) {
                // Toggle existing markers
                toggleMarkers(airportMarkers);
            } else {
                fetchAirportsInfo(selectedCountry).then(showAirportsInfoModal);
            } 
        } else {
            alert("Please select a country first.");
        }
    }).addTo(map);

    //button for city info
    L.easyButton("fa-solid fa-city", function(btn, map) {
        var selectedCountry = $('#countrySelect option:selected').text();
        if (selectedCountry) {
            if(cityMarkers.length > 0) {
                toggleMarkers(cityMarkers);
            } else {
            fetchCityInfo(selectedCountry);
            }
        } else {
            alert("Please select a country first.");
        }
    }).addTo(map);

    //load borders before populating the dropdown information
    loadCountryBorders().then(() => {
        populateDropDown();
    }).catch(handleError);

    $('#countrySelect').on('change', function () {
        var selectedCountry = this.value;
        if (selectedCountry) {
            $('#selectedCountry').val(selectedCountry);
            applyCountryBorder(map, selectedCountry);
        }
    });

    //function to retrieve country border information
    function loadCountryBorders(selectedCountry) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: 'libs/php/borders.php',
                //data: { selectedCountry: selectedCountry },
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
                    // Return combined data with country info and flag URL
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
            $('#currentTemperature').text(data.currentWeather.main.temp + ' °C');
            $('#currentConditions').text(data.currentWeather.weather[0].description);
            $('#currentHumidity').text(data.currentWeather.main.humidity + ' %');
            $('#currentWindSpeed').text(data.currentWeather.wind.speed + ' m/s');
    
            const forecastTable = $('#weatherForecast');
            forecastTable.empty(); // Clear previous forecast data
    
            data.forecast.list.forEach(function (forecast, index) {
                if (index % 8 === 0) { // Show one forecast per day
                    forecastTable.append(
                        `<tr>
                            <td>${forecast.dt_txt}</td>
                            <td>${forecast.main.temp} °C</td>
                            <td>${forecast.weather[0].description}</td>
                        </tr>`
                    );
                }
            });
    
            $('#weatherInfoModal').modal('show');
        } else {
            alert('Error fetching weather information. Please try again.');
            console.error('Invalid data structure:', data);
        }
    }
    
    
    // Function to retrieve airport information from airports.php
    function fetchAirportsInfo(countryCode) {
        clearMarkers();
        console.log('Fetching airport info for:', countryCode);

        return $.ajax({
            url: 'libs/php/airports.php', // The PHP script that gets airports data
            method: 'GET',
            data: { selectedCountry: countryCode },
            dataType: 'json'
        }).then(function (response) {
            console.log('airport info fetch response:', response);

            if (response.status.code === 200) {
                // Add markers for each airport
                addAirportMarkers(response.features); // Pass the airports data to the function that adds markers
            } else {
                throw new Error('Error fetching airport info: ' + response.status.description);
            }
        }).fail(function (xhr, status, error) {
            console.error('Error fetching airport info:', error);
        });
    }

    // Function to add markers for airports on the map
    function addAirportMarkers(airportsData) {

        // Remove existing markers if any
        if (airportMarkers.length > 0) {
            toggleMarkers(airportMarkers);
            return;
        }

        airportsData.forEach(function (port) {
            const lat = port.geometry.coordinates[1]; // Latitude from the GeoJSON structure
            const lon = port.geometry.coordinates[0]; // Longitude from the GeoJSON structure
            const airportName = port.properties.name || 'N/A';
            const airportType = port.properties.type || 'N/A';
            const gpsCode = port.properties.gps_code || 'N/A';

            // Create a Leaflet marker
            const marker = L.marker([lat, lon]).addTo(map);

            // Attach a click event listener to the marker to show the modal
            marker.on('click', function () {
                populateAirportsModal({
                    airportName: airportName,
                    airportType: airportType,
                    gpsCode: gpsCode
                });
            });

            // Add the marker to the array for toggling
            airportMarkers.push(marker);

        });
    }

    // Function to display the fetched airport information in a modal
    function showAirportsInfoModal(airportsData) {
        console.log('Showing airport info modal...');

        if (airportsData && airportsData.length > 0) {
            let airportsTableBody = $('#airportsTable tbody');
            airportsTableBody.empty(); // Clear existing data

            // Populate table with fetched data (airport names as links)
            airportsData.forEach(function(port, index) {
                const airportName = port.properties.name; // Get the port name
                airportsTableBody.append(`
                    <tr>
                        <td><a href="#" class="airport-link" data-index="${index}">${airportName}</a></td>
                    </tr>
                `);
            });

            // Show the modal with the list of airports
            $('#airportsInfoModal').modal('show');

            // Add click event listeners to airport links
            $('.airport-link').click(function(e) {
                e.preventDefault();
                const index = $(this).data('index');
                const selectedAirport = airportsData[index]; // Get the corresponding port data

                // Move the map to the airport marker
                const lat = selectedAirport.geometry.coordinates[1];
                const lon = selectedAirport.geometry.coordinates[0];
                map.setView([lat, lon], 10); // Adjust zoom level as needed

                // Show the airport modal (with the table structure you provided)
                populateAirportsModal({
                    airportName: selectedAirport.properties.name,
                    airportType: selectedAirport.properties.type || 'N/A',
                    gpsCode: selectedAirport.properties.gps_code || 'N/A',
                });
            });
        }
    }

    // Function to populate the modal with airport information
    function populateAirportsModal(portData) {
        $('#airportName').text(portData.airportName);
        $('#airportType').text(portData.airportType);
        $('#gpsCode').text(portData.gpsCode);

        // Show the modal
        $('#airportsInfoModal').modal('show');
    }


    function fetchVolcanoInfo(countryName) {
        clearMarkers();
        console.log('Fetching volcano data from PHP for country:', countryName);
         
        return $.ajax({
            url: 'libs/php/volcanoData.php',  // PHP script
            method: 'GET',
            dataType: 'json',
            data: { country: countryName },  // Pass the country name as a query parameter
        }).then(function(response) {
            console.log('Volcano data fetch response from PHP:', response);

            if (response && response.length > 0) {
                addVolcanoMarkers(response);  // Add markers for the filtered volcanoes
            } else {
               alert('No volcano information available for the selected country.');
            }
        }).fail(function(xhr, status, error) {
            console.error('Error fetching volcano data from PHP:', error);
        });
    }

    function addVolcanoMarkers(volcanoes) {

        if (volcanoMarkers.length > 0) {
            toggleMarkers(volcanoMarkers);
            return;
        }

        volcanoes.forEach(function(volcano) {
            const lat = volcano.latitude;
            const lon = volcano.longitude;
            const volcanoName = volcano.vName || 'Unknown';
            const subregion = volcano.subregion || 'Unknown';
            const elevation = volcano.elevation_m || 'Unknown';
    
            // Create a custom marker with volcano icon
            const volcanoIcon = L.icon({
                iconUrl: '/project1/libs/resources/volcano.png',  // Path to your volcano icon
                iconSize: [25, 25],  // Adjust size if needed
            });
    
            const marker = L.marker([lat, lon], { icon: volcanoIcon }).addTo(map);
    
            // When marker is clicked, show the modal with volcano info
            marker.on('click', function() {
                showVolcanoInfoModal({
                    vName: volcanoName,
                    subregion: subregion,
                    elevation_m: elevation,
                });
            });

            volcanoMarkers.push(marker);
        });
    }
    
    function showVolcanoInfoModal(volcanoData) {
        $('#volcanoName').text(volcanoData.vName || 'Unknown');
        $('#volcanoSubregion').text(volcanoData.subregion || 'Unknown');
        $('#volcanoElevation').text(volcanoData.elevation_m ? volcanoData.elevation_m + ' meters' : 'Unknown');
    
        // Show the modal
        $('#volcanoInfoModal').modal('show');
    }

    function fetchCityInfo() {
        clearMarkers();
        const selectedCountry = $('#selectedCountry').val(); // Get the ISO3 code directly from the dropdown
        console.log(`Fetching top cities by population for country: ${selectedCountry}`);

        if (cityMarkers.length > 0) {
            // If markers already exist, just toggle them instead of fetching data again
            toggleMarkers(cityMarkers);
            return;
        }
    
        $.ajax({
            url: './libs/php/cityData.php',
            type: 'GET',
            dataType: 'json',
            data: { countryCode: selectedCountry }, // Pass the ISO3 code directly
            success: function(data) {
                console.log("Data received:", data); // Log the entire response
        
                // Directly use the data since it's an array
                if (Array.isArray(data) && data.length) {
                    // Populate markers and modal content
                    let modalContent = "<h3>Largest Cities by Population</h3><ul>";
                    data.forEach(city => {
                        const { name, latitude, longitude, population, is_capital } = city;

                        // Create Wikipedia URL
                        const wikiUrl = `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;

                        // Select the appropriate icon based on whether it is the capital
                        const iconUrl = is_capital ? './libs/resources/capital_logo.png' : './libs/resources/wiki_icon.png';

                        // Add marker for each city
                        const marker = L.marker([latitude, longitude], {
                            icon: L.icon({
                                iconUrl: iconUrl, // Use star icon for capital, wiki icon for others
                                iconSize: is_capital ? [35, 35] : [30, 30] // Slightly larger for the capital
                            })
                        }).addTo(map);
                            
                        marker.bindPopup(`
                            <b>${name}</b><br>
                            Population: ${population}<br>
                            <a href="${wikiUrl}" target="_blank">Wikipedia Link</a>
                        `);

                        cityMarkers.push(marker);  // Store the marker in the array
                        
                        // Append city info to modal content
                        modalContent += `<li><b>${name}</b> - Population: ${population}</li>`;
                    });

                modalContent += "</ul>";
                
                // Show modal with all city data
                $('#cityInfoModal .modal-body').html(modalContent);
                $('#cityInfoModal').modal('show');

                } else {
                    console.log("No city data available.");
                }
            },
            error: function (error) {
                console.error("Error fetching city data from PHP:", error);
            }
        });
    }

    function applyCountryBorder(map, selectedCountry) {
        console.log('Applying border for:', selectedCountry);
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: 'libs/php/borders.php',
            data: { selectedCountry: selectedCountry },
            success: function (response) {
                if (window.countryBorder && map.hasLayer(window.countryBorder)) {
                    map.removeLayer(window.countryBorder);
                }

                window.countryBorder = L.geoJSON(response.features, {
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
                    fetchCountryInfo(selectedCountry);
                } else {
                    console.error('No valid bounds found for the selected country.');
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', status, error);
            }
        });
    }

    $(window).on('load', function () {
        $('#preloader').fadeOut('slow', function () {
            $(this).remove();
        });
    });

    map.whenReady(function () {
        $('#preloader').fadeOut('slow', function () {
            $(this).remove();
        });
    });

    $('#selectedCountry').on('change', function () {
        const country = $(this).val();
        fetchCityInfo(country);
    });
    

    //var userMarker = null;

    function geolocation(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;

        if (userMarker) {
            map.removeLayer(userMarker);
        }
        userMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup('You are here!')
            .openPopup();

        map.setView([lat, lng], 10);

        $.getJSON(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`, function (data) {
            var countryCode = data.address.country_code.toUpperCase();
            console.log('Country code from geolocation:', countryCode);
            var iso3Code = getIso3FromIso2(countryCode);
            if (iso3Code) {
                $('#countrySelect').val(iso3Code).trigger('change');
                applyCountryBorder(map, iso3Code);
            } //else {
                //console.error('Failed to retrieve ISO3 code for country.');
            //}
        }).fail(function () {
            console.error('Failed to retrieve geolocation data.');
        });
    }

    function handleError(error) {
        console.error('Error:', error.message);
    }

    function getIso3FromIso2(iso2Code) {
        if (!countryBordersData) {
            console.error('Country borders data not available.');
            return null;
        }
        for (var i = 0; i < countryBordersData.features.length; i++) {
            if (countryBordersData.features[i].properties.iso_a2 === iso2Code) {
                return countryBordersData.features[i].properties.iso_a3;
            }
        }
        return null;
    }

    loadCountryBorders().then(() => {
        var defaultCountry = $('#selectedCountry').val();
        if (defaultCountry) {
            applyCountryBorder(map, defaultCountry);
        }
        // Check the user's location but do not adjust the map's view
    navigator.geolocation.getCurrentPosition(
        geolocation,
        handleError,
        { enableHighAccuracy: true }
    );
    }).catch(handleError);

    // Define geolocation function to avoid resetting the map view
    function geolocation(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // Place marker or perform other actions without updating the map's view
        const userMarker = L.marker([userLat, userLng]).addTo(map);
        userMarker.bindPopup("Your location").openPopup();
    }
});
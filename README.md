Gazetteer
This project is a web application that provides detailed information on countries worldwide, including major cities, airports, and volcanoes, displayed on an interactive map. The app also retrieves additional country data such as capital cities, population, and other demographic information, along with a flag displayed for the selected country.

Table of Contents
Features
Technologies Used
Usage
Future Improvements
License

World Map
Country Information: Displays essential information for each country, including the capital, population, and area.
Markers: Shows markers for major cities, airports, and volcanoes within a selected country.
City Details with Wikipedia Links: Provides a list of major cities and includes a link to their Wikipedia page.
Flag Display: Shows the country’s flag next to the title in the information modal.
Easy Buttons: Toggles to display and hide volcano, city, and airport markers.
Technologies Used
Frontend: HTML, CSS, JavaScript, jQuery, Bootstrap, Leaflet.js
Backend: PHP
APIs:
API Ninjas City API: Retrieves information on the largest cities by population.
FlagsAPI: Displays a high-quality flag for the selected country.
Port-API: Provides information on all airports in a country
Volcanoes.usgs.org volcano API: provides any relevant volcano information for a country
openweathermap API: provides current and forecast weather for a country
Data Source: countryBorders.geo.json file, used for country code conversion and boundary data.

Usage
Select a Country: Use the dropdown menu to select a country.
View Country Information: Displays information about the selected country, including capital, population, area, currency, and flag.
Explore on Map:
Major cities, airports, and volcanoes are marked on the map.
Click on a marker to view details about the city, airport, or volcano.
Wikipedia Links: City markers include a link to the Wikipedia page for that city.
Toggle Markers: Use the Easy Buttons to show or hide markers for cities, airports, and volcanoes.
Modal View: Click the information buttons to open modals displaying details about the selected country.

Future Improvements
Enhanced City and Volcano Data: Add more details and images for major landmarks in each city or volcano.
Error Handling: Improve error messages and loading indicators for better user feedback.

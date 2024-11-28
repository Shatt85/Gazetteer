<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true);

header('Content-Type: application/json');

// API URL to fetch volcano data
$apiUrl = 'https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesGVP';

// Fetch the data from the API
$response = file_get_contents($apiUrl);

// Validate API response
if ($response === FALSE) {
    echo json_encode(['status' => 'error', 'message' => 'Unable to fetch volcano data']);
    exit();
}

// Decode the JSON response
$volcanoData = json_decode($response, true);

// Handle JSON decode errors
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['status' => 'error', 'message' => 'Error decoding JSON data']);
    exit();
}

// Filter the data by country name if provided (via AJAX)
if (isset($_GET['country'])) {
    $country = $_GET['country']; 
    error_log("Country received: $country");
    
    $filteredData = array_filter($volcanoData, function ($volcano) use ($country) {
        return strcasecmp($volcano['country'], $country) === 0;  // Case-insensitive comparison
    });

    // Send the filtered volcano data as a JSON response
    echo json_encode(array_values($filteredData));
} else {
    // If no country is provided, return all volcanoes
    echo json_encode($volcanoData);
}

exit();

?>

<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true);

header('Content-Type: application/json');

$countryCode = $_GET['selectedCountry'] ?? ''; // Get selected country from AJAX request

if (!$countryCode) {
    echo json_encode(['status' => ['code' => 400, 'name' => 'Bad Request', 'description' => 'No country code provided']]);
    exit;
}

// Load country borders geojson to find the bounding box for the selected country
$borderData = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

$boundingBox = null;
foreach ($borderData['features'] as $feature) {
    if ($feature['properties']['iso_a3'] === $countryCode) {
        $coordinates = $feature['geometry']['coordinates'];
        $boundingBox = calculateBoundingBox($coordinates);
        break;
    }
}

if (!$boundingBox) {
    echo json_encode(['status' => ['code' => 404, 'name' => 'Not Found', 'description' => 'Country not found']]);
    exit;
}

// Extract bounding box values
$minLon = $boundingBox['xmin'];
$minLat = $boundingBox['ymin'];
$maxLon = $boundingBox['xmax'];
$maxLat = $boundingBox['ymax'];

// Construct the API URL with bounding box values
$apiUrl = "https://port-api.com/port/bbox/$minLon/$minLat/$maxLon/$maxLat";

$response = file_get_contents($apiUrl);

if ($response === FALSE) {
    echo json_encode(['status' => ['code' => 500, 'name' => 'Internal Server Error', 'description' => 'Failed to fetch data from Port API']]);
    exit;
}

$portsData = json_decode($response, true);

if ($portsData === NULL) {
    echo json_encode(['status' => ['code' => 500, 'name' => 'Internal Server Error', 'description' => 'Failed to decode JSON response from Port API']]);
    exit;
}

// Return the GeoJSON format with airport features
$result = [
    'type' => 'FeatureCollection',
    'features' => $portsData['features'] ?? [], // Using 'features' from the API response
    'status' => [
        'code' => 200,
        'name' => 'OK',
        'description' => 'Success',
        'executedIn' => intval((microtime(true) - $executionStartTime) * 1000) . " ms"
    ]
];

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($result);

// Function to calculate the bounding box from GeoJSON coordinates
function calculateBoundingBox($coordinates) {
    $minLon = $minLat = PHP_FLOAT_MAX;
    $maxLon = $maxLat = -PHP_FLOAT_MAX;

    foreach ($coordinates as $polygon) {
        foreach ($polygon as $ring) {
            foreach ($ring as $coordinate) {
                $lon = $coordinate[0];
                $lat = $coordinate[1];

                if ($lon < $minLon) $minLon = $lon;
                if ($lon > $maxLon) $maxLon = $lon;
                if ($lat < $minLat) $minLat = $lat;
                if ($lat > $maxLat) $maxLat = $lat;
            }
        }
    }

    return [
        'xmin' => $minLon,
        'ymin' => $minLat,
        'xmax' => $maxLon,
        'ymax' => $maxLat
    ];
}

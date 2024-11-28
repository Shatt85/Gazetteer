<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true);

header('Content-Type: application/json');

$countryCode = $_GET['countryCode'] ?? null;

if (!$countryCode) {
    echo json_encode(['error' => 'Missing countryCode parameter']);
    exit;
}

$jsonFile = __DIR__ . '/../resources/countryBorders.geo.json';

// Decode the geoJSON file
$geoJson = json_decode(file_get_contents($jsonFile), true);

$iso2Code = null;

// Find ISO2 code for the given ISO3 code
foreach ($geoJson['features'] as $feature) {
    if ($feature['properties']['iso_a3'] === $countryCode) {
        $iso2Code = strtolower($feature['properties']['iso_a2']); // Convert to lowercase for API compatibility
        break;
    }
}

if (!$iso2Code) {
    echo json_encode(['error' => 'Invalid or unsupported countryCode']);
    exit;
}

// Thenewsapi endpoint
$apiToken = 'DmUOsXnqQXMA8jotP1g6kPjxnSHE4Z51paB9pcQl';
$newsApiUrl = "https://api.thenewsapi.com/v1/news/top?api_token=$apiToken&locale=$iso2Code&limit=5";

$response = file_get_contents($newsApiUrl);

if ($response === false) {
    echo json_encode(['error' => 'Failed to fetch news data from the News API.']);
    exit;
}

$data = json_decode($response, true);

if (!isset($data['data'])) {
    echo json_encode(['error' => 'Unexpected response structure from the News API.']);
    exit;
}

echo json_encode($data['data']);
?>
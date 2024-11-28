<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true);

header('Content-Type: application/json');

// Get the ISO2 country code from the AJAX request
$iso2Code = $_GET['iso2Code'] ?? ''; // Using iso2Code as the parameter

if (empty($iso2Code)) {
    // Return an error if the ISO2 code is missing
    echo json_encode([
        'status' => [
            'code' => '400',
            'name' => 'bad_request',
            'description' => 'ISO2 code is missing'
        ]
    ]);
    exit;
}

$borderData = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

// Look for the feature with the matching ISO2 code
$features = [];
foreach ($borderData['features'] as $feature) {
    if (isset($feature['properties']['iso_a2']) && $feature['properties']['iso_a2'] === strtoupper($iso2Code)) {
        $features[] = $feature; // Collect matching features
    }
}

if (empty($features)) {
    // If no matching border is found
    echo json_encode([
        'status' => [
            'code' => '404',
            'name' => 'not_found',
            'description' => 'Borders not found for the given ISO2 code'
        ]
    ]);
    exit;
}

// Return the borders for the country
$output = [
    'type' => 'FeatureCollection',
    'features' => $features,
    'status' => [
        'code' => "200",
        'name' => "ok",
        'description' => "success",
        'executedIn' => intval((microtime(true) - $executionStartTime) * 1000) . " ms"
    ]
];

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($output);
?>

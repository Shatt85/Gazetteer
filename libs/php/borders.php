<?php

$executionStartTime = microtime(true);

// Get the country code from the AJAX request
$countryCode = $_GET['selectedCountry'] ?? ''; // Use the null coalescing operator to provide a default empty value

$borderData = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

$features = [];

foreach ($borderData['features'] as $feature) {
    if ($feature['properties']['iso_a3'] === $countryCode) { // Filter by country code
        $features[] = $feature; // Collect the matching feature
        break; // Assuming each country code only appears once, we can break after finding it
    }
}

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
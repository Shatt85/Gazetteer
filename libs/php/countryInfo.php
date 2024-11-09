<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

$executionStartTime = microtime(true);

header('Content-Type: application/json');

$countryBorders = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

$countryCodeIso3 = $_GET['countryCode'] ?? '';

if (!$countryCodeIso3) {
    echo json_encode([
        'status' => [
            'code' => 400,
            'name' => 'Bad Request',
            'description' => 'No country code provided',
        ],
    ]);
    exit;
}

function convertIso3ToIso2($countryBorders, $iso3) {
    foreach ($countryBorders['features'] as $country) {
        if ($country['properties']['iso_a3'] === $iso3) {
            return $country['properties']['iso_a2'];
        }
    }
    return '';
}

$countryCodeIso2 = convertIso3ToIso2($countryBorders, $countryCodeIso3);

if (!$countryCodeIso2) {
    echo json_encode([
        'status' => [
            'code' => 400,
            'name' => 'Bad Request',
            'description' => 'Invalid country code provided',
        ],
    ]);
    exit;
}

// Fetch country information from GeoNames API
$apiUrl = "http://api.geonames.org/countryInfoJSON?formatted=true&country={$countryCodeIso2}&username=taylos56";

$response = file_get_contents($apiUrl);

if ($response === FALSE) {
    echo json_encode([
        'status' => [
            'code' => 500,
            'name' => 'Internal Server Error',
            'description' => 'Failed to fetch data from GeoNames API',
        ],
    ]);
    exit;
}

$data = json_decode($response, true);

if ($data === NULL) {
    echo json_encode([
        'status' => [
            'code' => 500,
            'name' => 'Internal Server Error',
            'description' => 'Failed to decode JSON response from GeoNames API',
        ],
    ]);
    exit;
}

if (!isset($data['geonames']) || count($data['geonames']) === 0) {
    echo json_encode([
        'status' => [
            'code' => 404,
            'name' => 'Not Found',
            'description' => 'No country information found for the provided country code',
        ],
    ]);
    exit;
}

$countryInfo = $data['geonames'][0];

$result = [
    'data' => [
        'countryName' => $countryInfo['countryName'] ?? 'N/A',
        'capital' => $countryInfo['capital'] ?? 'N/A',
        'population' => $countryInfo['population'] ?? 'N/A',
        'areaInSqKm' => $countryInfo['areaInSqKm'] ?? 'N/A',
        'currencyCode' => $countryInfo['currencyCode'] ?? 'N/A',
    ],
    'status' => [
        'code' => 200,
        'name' => 'OK',
        'description' => 'Success',
    ],
];

echo json_encode($result);

?>
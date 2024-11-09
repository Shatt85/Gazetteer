<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header('Content-Type: application/json');

$countryBorders = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

$countryCodeIso3 = $_GET['countryCodeIso3'] ?? '';

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

function getIso2FromIso3($countryBorders, $iso3) {
    foreach ($countryBorders['features'] as $country) {
        if ($country['properties']['iso_a3'] === $iso3) {
            return $country['properties']['iso_a2'];
        }
    }
    return '';
}

$countryCodeIso2 = getIso2FromIso3($countryBorders, $countryCodeIso3);

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

$flagUrl = "https://flagsapi.com/{$countryCodeIso2}/shiny/64.png";

$result = [
    'flagUrl' => $flagUrl,
    'status' => [
        'code' => 200,
        'name' => 'OK',
        'description' => 'Success',
    ],
];

echo json_encode($result);

?>
<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

header('Content-Type: application/json');

$location = $_GET['location'] ?? '';

if (!$location) {
    echo json_encode([
        'status' => [
            'code' => 400,
            'name' => 'Bad Request',
            'description' => 'No location provided',
        ],
    ]);
    exit;
}

$apiKey = '2f9d02887db19e4b38cb1a3b1c571f36';
$baseUrl = 'https://api.openweathermap.org/data/2.5/';

// Fetch current weather
$currentWeatherUrl = $baseUrl . "weather?q={$location}&units=metric&appid={$apiKey}";
$currentWeatherResponse = file_get_contents($currentWeatherUrl);
$currentWeatherData = json_decode($currentWeatherResponse, true);

// Check if current weather data is valid
if (!$currentWeatherData || !isset($currentWeatherData['main'])) {
    echo json_encode([
        'status' => [
            'code' => 500,
            'name' => 'Internal Server Error',
            'description' => 'Failed to fetch current weather data from OpenWeather API',
        ],
    ]);
    exit;
}

// Fetch weather forecast
$forecastUrl = $baseUrl . "forecast?q={$location}&units=metric&appid={$apiKey}";
$forecastResponse = file_get_contents($forecastUrl);
$forecastData = json_decode($forecastResponse, true);

// Check if forecast data is valid
if (!$forecastData || !isset($forecastData['list'])) {
    echo json_encode([
        'status' => [
            'code' => 500,
            'name' => 'Internal Server Error',
            'description' => 'Failed to fetch weather forecast data from OpenWeather API',
        ],
    ]);
    exit;
}

$result = [
    'currentWeather' => $currentWeatherData,
    'forecast' => $forecastData,
    'status' => [
        'code' => 200,
        'name' => 'OK',
        'description' => 'Success',
    ],
];

echo json_encode($result);

?>
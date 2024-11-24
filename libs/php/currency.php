<?php

header('Content-Type: application/json');

if (!isset($_GET['countryCode']) || empty($_GET['countryCode'])) {
    echo json_encode(["error" => "Country code is required."]);
    exit;
}

$countryCode = strtoupper($_GET['countryCode']); // Assuming this is ISO3

// Simulate calling countryInfo.php internally
ob_start();
$_GET['countryCode'] = $countryCode; // Pass the country code as if it's an HTTP request
include __DIR__ . "/countryInfo.php"; // Adjust the path based on your folder structure
$countryInfoResponse = ob_get_clean();

if (!$countryInfoResponse) {
    echo json_encode(["error" => "Failed to fetch data from countryInfo.php."]);
    exit;
}

// Decode the JSON response
$countryInfoData = json_decode($countryInfoResponse, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["error" => "Failed to decode JSON from countryInfo.php: " . json_last_error_msg()]);
    exit;
}

if (!isset($countryInfoData['data']['currencyCode']) || empty($countryInfoData['data']['currencyCode'])) {
    echo json_encode(["error" => "Currency code not found for the country."]);
    exit;
}

$currencyCode = $countryInfoData['data']['currencyCode'];


// FreeCurrencyAPI integration
$apiKey = "fca_live_kFDscnpmklp6LKOTDHApzfd8OJNwC5gpyhtaZ7Gy";
$currenciesEndpoint = "https://api.freecurrencyapi.com/v1/currencies";
$ratesEndpoint = "https://api.freecurrencyapi.com/v1/latest";

// Fetch currency name
$currenciesQuery = $currenciesEndpoint . "?apikey=" . $apiKey . "&currencies=" . $currencyCode;
$currenciesResponse = @file_get_contents($currenciesQuery);

$currenciesData = json_decode($currenciesResponse, true);
$currencyName = $currenciesData['data'][$currencyCode]['name'] ?? "Unknown";

// Fetch exchange rates
$ratesQuery = $ratesEndpoint . "?apikey=" . $apiKey . "&base_currency=GBP&currencies=" . $currencyCode;
$ratesResponse = @file_get_contents($ratesQuery);

$ratesData = json_decode($ratesResponse, true);
$exchangeRate = $ratesData['data'][$currencyCode] ?? null;

echo json_encode([
    "currencyCode" => $currencyCode,
    "currencyName" => $currencyName,
    "exchangeRate" => $exchangeRate
]);
exit;

?>

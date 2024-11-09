<?php
header('Content-Type: application/json');

if (isset($_GET['countryCode'])) {
    $countryCode = strtoupper($_GET['countryCode']); // ISO3 code
    $jsonFile = '../resources/countryBorders.geo.json';
    $jsonData = file_get_contents($jsonFile);

    if ($jsonData) {
        $data = json_decode($jsonData, true);
        $iso2Code = null;

        // Loop through the features to find the matching ISO2 code
        foreach ($data['features'] as $feature) {
            if (isset($feature['properties']['iso_a3']) && $feature['properties']['iso_a3'] === $countryCode) {
                $iso2Code = $feature['properties']['iso_a2'];
                break;
            }
        }

        if ($iso2Code) {
            $apiUrl = "https://api.api-ninjas.com/v1/city?country=$iso2Code&limit=10";
            $apiKey = 'tAfoVDoQ7wFfN8l9G6HCqg==8yZ4Nv99posgyjGf';
            $options = [
                "http" => [
                    "header" => "X-Api-Key: $apiKey"
                ]
            ];
            $context = stream_context_create($options);
            $response = file_get_contents($apiUrl, false, $context);

            if ($response) {
                $cityData = json_decode($response, true);
                if (!empty($cityData)) {
                    echo json_encode($cityData);
                } else {
                    echo json_encode(["error" => "API returned no city data for the selected country."]);
                }
            } else {
                echo json_encode(["error" => "Failed to retrieve city data from the API."]);
            }
        } else {
            echo json_encode(["error" => "No ISO2 code found for country: $countryCode"]);
        }
    } else {
        echo json_encode(["error" => "Failed to load country borders data."]);
    }
} else {
    echo json_encode(["error" => "No country code provided."]);
}
?>



<?php
 
    ini_set('display_errors', 'On');
    error_reporting(E_ALL);
    ini_set('memory_limit', '1024M');

    $executionStartTime = microtime(true);

    // Get data from countryBorders file
    $countryData = json_decode(file_get_contents("../resources/countryBorders.geo.json"), true);

    // Create an array
    $countries = [];

    // Use a for each loop to extract the country name and ISO codes
    foreach ($countryData['features'] as $feature) {
        $country = [
            'name' => $feature['properties']['name'],
            'iso_a3' => $feature['properties']['iso_a3'],
            'iso_a2' => $feature['properties']['iso_a2']
        ];
        $countries[] = $country;
        sort($countries);
    }

    

     $output['status']['iso_a3'] = "200";
     $output['status']['name'] = "ok";
     $output['status']['description'] = "success";
     $output['status']['executedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
     $output['data'] = $countries;
 
     header('Content-Type: application/json; charset=UTF-8');

     echo json_encode($output);

?>
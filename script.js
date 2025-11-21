// Create map
var map = L.map('map').setView([22.5, 78.9], 5);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Pollution Hotspots
let hotspots = [
    { city: "Delhi", coords: [28.7041, 77.1025], aqi: 320 },
    { city: "Mumbai", coords: [19.0760, 72.8777], aqi: 150 },
    { city: "Bengaluru", coords: [12.9716, 77.5946], aqi: 90 },
    { city: "Mysuru", coords: [12.2958, 76.6394], aqi: 65 }
];

// Add hotspots on map
hotspots.forEach(h => {
    let color = h.aqi > 200 ? "red" : h.aqi > 100 ? "orange" : "green";

    L.circleMarker(h.coords, {
        radius: 10,
        color: color,
        fillOpacity: 0.8
    }).addTo(map)
    .bindPopup(`<b>${h.city}</b><br>AQI: ${h.aqi}`);
});

// Eco Route (static example)
let ecoRoute = [
    [12.2958, 76.6394],
    [12.6000, 76.9000],
    [12.9000, 77.2000],
    [12.9716, 77.5946]
];

L.polyline(ecoRoute, {
    color: 'green',
    weight: 5
}).addTo(map);

// EcoScore
function ecoScore(distance, traffic, aqi) {
    return (0.6 * traffic) + (0.3 * (aqi / 50)) + (0.1 * distance);
}

let distance = 147;
let traffic = 3;
let aqi = 85;

let score = ecoScore(distance, traffic, aqi);
let co2 = (50 - score) * 5;

document.getElementById("ecoscore").innerHTML = "EcoScore: " + score.toFixed(2);
document.getElementById("co2").innerHTML = "CO₂ Saved: " + co2.toFixed(1) + "g";

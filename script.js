// ------------- LOGIN / SIGNUP / LOGOUT ------------- //

function signupUser() {
    let name = document.getElementById("signupName").value;
    let email = document.getElementById("signupEmail").value;
    let password = document.getElementById("signupPassword").value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return false;
    }

    let user = { name, email, password };
    localStorage.setItem("EcoUser", JSON.stringify(user));

    alert("Account created successfully!");
    window.location.href = "login.html";
    return false;
}

function loginUser() {
    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    let savedUser = JSON.parse(localStorage.getItem("EcoUser"));

    if (!savedUser) {
        alert("No account found. Please sign up first.");
        return false;
    }

    if (savedUser.email === email && savedUser.password === password) {
        alert("Login successful!");
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid email or password.");
    }
    return false;
}

function logoutUser() {
    window.location.href = "login.html";
}

// ------------- MAP + ECO ROUTE LOGIC ------------- //

let map;
let allRouteLayers = [];

// Pre-defined demo locations (lat, lon)
const LOCATIONS = {
    mysuru_palace: { name: "Mysuru Palace", lat: 12.3052, lon: 76.6552, city: "Mysuru" },
    vvce: { name: "VVCE College, Mysuru", lat: 12.2958, lon: 76.6394, city: "Mysuru" },
    bengaluru_ksrtc: { name: "Bengaluru KSRTC Bus Stand", lat: 12.9634, lon: 77.5855, city: "Bengaluru" },
    bengaluru_majestic: { name: "Majestic, Bengaluru", lat: 12.9778, lon: 77.5713, city: "Bengaluru" }
};

// Approx AQI values for demo cities
const CITY_POLLUTION = {
    Mysuru: 70,
    Bengaluru: 120
};

function initEcoDashboard() {
    // create map centered between Mysuru & Bengaluru
    map = L.map("map").setView([12.6, 77.0], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);

    // default route: Mysuru Palace -> VVCE
    document.getElementById("startSelect").value = "mysuru_palace";
    document.getElementById("endSelect").value = "vvce";
    getEcoRoute();
}

async function getEcoRoute() {
    const startKey = document.getElementById("startSelect").value;
    const endKey = document.getElementById("endSelect").value;

    if (startKey === endKey) {
        alert("Start and destination must be different.");
        return;
    }

    const start = LOCATIONS[startKey];
    const end = LOCATIONS[endKey];

    // Build OSRM route API URL (free demo server)
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${start.lon},${start.lat};${end.lon},${end.lat}` +
        `?overview=full&geometries=geojson&alternatives=true`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes || data.routes.length === 0) {
            alert("No routes found.");
            return;
        }

        // Remove old routes
        allRouteLayers.forEach(layer => map.removeLayer(layer));
        allRouteLayers = [];

        let bestRoute = null;
        let bestScore = Infinity;
        let bestStats = null;

        let avgAqiSum = 0;

        data.routes.forEach((route, index) => {
            const distanceKm = route.distance / 1000;
            const durationMin = route.duration / 60;
            const trafficIndex = durationMin / distanceKm; // higher = more traffic

            const pollution =
                (CITY_POLLUTION[start.city] + CITY_POLLUTION[end.city]) / 2;

            const ecoScore = calculateEcoScore(distanceKm, trafficIndex, pollution);

            avgAqiSum += pollution;

            // draw route (gray by default)
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            const color = "#888";
            const layer = L.polyline(coords, {
                color,
                weight: 4,
                opacity: 0.7
            }).addTo(map);
            allRouteLayers.push(layer);

            if (ecoScore < bestScore) {
                bestScore = ecoScore;
                bestRoute = route;
                bestStats = { distanceKm, trafficIndex, pollution };
            }
        });

        // Highlight best route in green
        const bestCoords = bestRoute.geometry.coordinates.map(c => [c[1], c[0]]);
        const bestLayer = L.polyline(bestCoords, {
            color: "green",
            weight: 6,
            opacity: 0.9
        }).addTo(map);
        allRouteLayers.push(bestLayer);
        map.fitBounds(bestLayer.getBounds());

        const avgAqi = (avgAqiSum / data.routes.length).toFixed(1);

        // Update text on page
        document.getElementById("bestRouteName").innerText =
            `${LOCATIONS[startKey].name} → ${LOCATIONS[endKey].name}`;
        document.getElementById("bestDistance").innerText =
            bestStats.distanceKm.toFixed(2);
        document.getElementById("bestTraffic").innerText =
            bestStats.trafficIndex.toFixed(2);
        document.getElementById("bestPollution").innerText =
            bestStats.pollution.toFixed(0);
        document.getElementById("bestScore").innerText = bestScore.toFixed(2);

        // cards
        document.getElementById("avgAqi").innerText = avgAqi;
        document.getElementById("co2Level").innerText =
            (bestStats.distanceKm * 0.12).toFixed(1) + " kg (approx)";
        document.getElementById("ecoScoreCard").innerText =
            bestScore.toFixed(2);
        // simple idea: hotspots avoided = if pollution below 100
        document.getElementById("hotspots").innerText =
            bestStats.pollution < 100 ? "1" : "0";

    } catch (err) {
        console.error(err);
        alert("Error while fetching route. Try again.");
    }
}

// Eco score: lower = better
function calculateEcoScore(distanceKm, trafficIndex, pollution) {
    // normalize
    const d = distanceKm / 20;      // assume 20km as "long"
    const t = trafficIndex / 4;     // 4 min/km = heavy traffic
    const p = pollution / 200;      // 200 AQI = very polluted

    // weight traffic most, then pollution, then distance
    return 0.4 * t + 0.35 * p + 0.25 * d;
}

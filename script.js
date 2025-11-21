/************ CONFIG ************/
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://127.0.0.1:5000"
    : "https://your-deployed-backend.onrender.com"; // Change this when deployed

/************ UTILITIES ************/
function sanitizeInput(str) {
    if (!str) return '';
    return str.replace(/[<>\"']/g, '').trim().substring(0, 100);
}

function showMessage(msg, type = 'info') {
    // Remove existing messages
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = msg;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        border-radius: 8px; color: white; font-size: 14px; z-index: 9999;
        background: ${type === 'error' ? '#e53935' : type === 'success' ? '#43a047' : '#1976d2'};
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/************ AUTH FUNCTIONS ************/
function isLoggedIn() {
    return localStorage.getItem("EcoRouteUser") !== null;
}

function getCurrentUser() {
    const data = localStorage.getItem("EcoRouteUser");
    return data ? JSON.parse(data) : null;
}

// Simple hash function for demo (use bcrypt on real backend)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "ecoroute_salt_2024");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signupUser() {
    const name = sanitizeInput(document.getElementById("signupName").value);
    const email = sanitizeInput(document.getElementById("signupEmail").value);
    const password = document.getElementById("signupPassword").value.trim();

    if (!name || !email || !password) {
        showMessage("Please fill all fields.", "error");
        return false;
    }

    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", "error");
        return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showMessage("Please enter a valid email.", "error");
        return false;
    }

    try {
        const hashedPassword = await hashPassword(password);
        const user = { name, email, password: hashedPassword };
        localStorage.setItem("EcoRouteUser", JSON.stringify(user));
        showMessage("Account created successfully!", "success");
        setTimeout(() => window.location.href = "login.html", 1000);
    } catch (err) {
        showMessage("Error creating account.", "error");
    }
    return false;
}

async function loginUser() {
    const email = sanitizeInput(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value.trim();

    const saved = localStorage.getItem("EcoRouteUser");
    if (!saved) {
        showMessage("No user found. Please sign up first.", "error");
        return false;
    }

    try {
        const user = JSON.parse(saved);
        const hashedPassword = await hashPassword(password);
        
        if (email === user.email && hashedPassword === user.password) {
            showMessage("Login successful!", "success");
            setTimeout(() => window.location.href = "dashboard.html", 800);
        } else {
            showMessage("Invalid email or password.", "error");
        }
    } catch (err) {
        showMessage("Login error. Please try again.", "error");
    }
    return false;
}

function logoutUser() {
    showMessage("Logged out successfully.", "success");
    setTimeout(() => window.location.href = "login.html", 500);
}

/************ DASHBOARD INIT ************/
let map;
let routeLayers = [];
let isSearching = false;

function initDashboard() {
    // Auth guard - redirect if not logged in
    if (!isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    // Display user name if available
    const user = getCurrentUser();
    const header = document.querySelector('.dash-header h1');
    if (header && user?.name) {
        header.textContent = `Welcome, ${user.name}`;
    }

    initMap();
    loadPollutionSummary();

    const form = document.getElementById("routeForm");
    if (form) {
        form.addEventListener("submit", onRouteFormSubmit);
    }
}

/************ MAP + POLLUTION SUMMARY ************/
function initMap() {
    if (typeof L === "undefined") {
        console.error("Leaflet not loaded");
        return;
    }

    map = L.map('map').setView([22.5, 78.9], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);
}

async function loadPollutionSummary() {
    const aqiEl = document.getElementById("avgAqi");
    const ecoEl = document.getElementById("ecoScore");
    const hotEl = document.getElementById("hotspots");
    const locEl = document.getElementById("locations");

    if (!aqiEl) return;

    // Show loading state
    [aqiEl, ecoEl, hotEl, locEl].forEach(el => el.innerText = "...");

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(
            "https://api.openaq.org/v2/latest?country=IN&parameter=pm25&limit=50",
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const results = data.results || [];

        let total = 0, count = 0, hotspots = 0;

        results.forEach(r => {
            const measurements = r.measurements || [];
            const pm25 = measurements.find(m => m.parameter === 'pm25');
            if (pm25?.value != null) {
                total += pm25.value;
                count++;
                if (pm25.value > 150) hotspots++;
            }
        });

        const avg = count ? (total / count).toFixed(1) : "N/A";
        const eco = count ? Math.max(0, 100 - (avg / 3)).toFixed(1) : "N/A";

        aqiEl.innerText = avg;
        ecoEl.innerText = eco;
        hotEl.innerText = hotspots;
        locEl.innerText = count;

    } catch (err) {
        console.error("Pollution data error:", err);
        aqiEl.innerText = "N/A";
        ecoEl.innerText = "N/A";
        hotEl.innerText = "–";
        locEl.innerText = "–";
    }
}

/************ ROUTING ************/
async function onRouteFormSubmit(e) {
    e.preventDefault();
    
    if (isSearching) return;
    
    const fromInput = sanitizeInput(document.getElementById("fromInput").value);
    const toInput = sanitizeInput(document.getElementById("toInput").value);
    const btn = e.target.querySelector('button');

    if (!fromInput || !toInput) {
        showMessage("Please enter both From and To.", "error");
        return;
    }

    isSearching = true;
    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        // Add delay between geocode requests (Nominatim rate limit)
        const start = await geocodePlace(fromInput);
        await new Promise(r => setTimeout(r, 1100));
        const end = await geocodePlace(toInput);

        if (!start || !end) {
            showMessage("Could not locate one of the places. Try a different name.", "error");
            return;
        }

        btn.textContent = 'Finding routes...';
        const routes = await fetchRoutesFromBackend(start, end);
        
        if (!routes?.length) {
            showMessage("No routes found between these locations.", "error");
            return;
        }

        drawRoutesOnMap(routes, start, end);
        showMessage(`Found ${routes.length} routes!`, "success");

    } catch (err) {
        console.error("Route error:", err);
        showMessage("Error fetching routes. Is the backend running?", "error");
    } finally {
        isSearching = false;
        btn.disabled = false;
        btn.textContent = 'Find Route';
    }
}

async function geocodePlace(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const res = await fetch(url, {
        headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'EcoRoute/1.0'
        }
    });
    
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    
    const data = await res.json();
    if (!data?.length) return null;

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
    };
}

async function fetchRoutesFromBackend(start, end) {
    const params = new URLSearchParams({
        startLat: start.lat,
        startLon: start.lon,
        endLat: end.lat,
        endLon: end.lon
    });
    
    const res = await fetch(`${BACKEND_URL}/api/routes?${params}`);
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Backend error ${res.status}`);
    }
    
    const data = await res.json();
    return data.routes || [];
}

function drawRoutesOnMap(routes, start, end) {
    if (!map) return;

    // Clear old routes
    routeLayers.forEach(l => map.removeLayer(l));
    routeLayers = [];

    const bounds = [];
    const colorLabels = { green: '🟢 Eco-Best', yellow: '🟡 Medium', red: '🔴 High Emission' };

    routes.forEach((route, idx) => {
        const latlngs = route.coordinates.map(([lon, lat]) => [lat, lon]);
        
        const layer = L.polyline(latlngs, {
            color: route.color,
            weight: idx === 0 ? 6 : 4,
            opacity: idx === 0 ? 1 : 0.7
        }).addTo(map);

        layer.bindPopup(`
            <strong>${colorLabels[route.color] || route.color}</strong><br>
            📏 Distance: ${route.distanceKm} km<br>
            ⏱️ Time: ${route.durationMin} min<br>
            🌿 Est. CO₂: ${(route.distanceKm * 0.12).toFixed(1)} kg
        `);

        routeLayers.push(layer);
        latlngs.forEach(ll => bounds.push(ll));
    });

    // Custom markers
    const greenIcon = L.divIcon({ className: 'custom-marker', html: '🚀', iconSize: [25, 25] });
    const redIcon = L.divIcon({ className: 'custom-marker', html: '🏁', iconSize: [25, 25] });

    const startMarker = L.marker([start.lat, start.lon], { icon: greenIcon })
        .addTo(map).bindPopup(`<strong>Start:</strong><br>${start.displayName}`);
    const endMarker = L.marker([end.lat, end.lon], { icon: redIcon })
        .addTo(map).bindPopup(`<strong>End:</strong><br>${end.displayName}`);
    
    routeLayers.push(startMarker, endMarker);
    bounds.push([start.lat, start.lon], [end.lat, end.lon]);

    if (bounds.length) {
        map.fitBounds(bounds, { padding: [40, 40] });
    }
}

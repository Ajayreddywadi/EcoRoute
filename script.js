// ------------------- SIGNUP --------------------
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
}

// ------------------- LOGIN --------------------
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
}

// ------------------- LOGOUT --------------------
function logout() {
    window.location.href = "login.html";
}

// ---------------- API FOR DASHBOARD -------------------

async function loadDashboardData() {
    document.getElementById("aqi").innerText = "Loading...";
    document.getElementById("co2").innerText = "Loading...";
    document.getElementById("ecoScore").innerText = "Loading...";

    try {
        // Fetch pollution data from OpenAQ
        const response = await fetch("https://api.openaq.org/v2/latest?limit=10&page=1&offset=0&sort=desc&country=IN");
        const data = await response.json();

        let aqiSum = 0;
        let co2Sum = 0;
        let hotspotCount = 0;
        let count = 0;

        data.results.forEach(location => {
            location.measurements.forEach(m => {
                if (m.parameter === "pm25") {
                    aqiSum += m.value;
                    if (m.value > 150) hotspotCount++; // bad AQI
                }
                if (m.parameter === "co2") {
                    co2Sum += m.value;
                }
            });
            count++;
        });

        let avgAQI = (aqiSum / count).toFixed(2);
        let avgCO2 = co2Sum > 0 ? (co2Sum / count).toFixed(2) : "Unavailable";
        let ecoScore = (100 - avgAQI / 2).toFixed(2); // custom eco score formula

        document.getElementById("aqi").innerText = avgAQI;
        document.getElementById("co2").innerText = avgCO2;
        document.getElementById("ecoScore").innerText = ecoScore;
        document.getElementById("hotspots").innerText = hotspotCount;

    } catch (error) {
        console.log(error);
        document.getElementById("aqi").innerText = "Error";
        document.getElementById("co2").innerText = "Error";
        document.getElementById("ecoScore").innerText = "Error";
    }
}

// SIGNUP
function signupUser() {
    let user = {
        name: document.getElementById("signupName").value,
        email: document.getElementById("signupEmail").value,
        password: document.getElementById("signupPassword").value
    };

    localStorage.setItem("EcoRouteUser", JSON.stringify(user));

    alert("Account created!");
    window.location.href = "02_login.html";
    return false;
}

// LOGIN
function loginUser() {
    let savedUser = JSON.parse(localStorage.getItem("EcoRouteUser"));

    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    if (!savedUser) {
        alert("No account found! Please sign up.");
        return false;
    }

    if (email === savedUser.email && password === savedUser.password) {
        alert("Login successful!");
        window.location.href = "04_dashboard.html";
    } else {
        alert("Wrong email or password!");
    }

    return false;
}

// LOGOUT
function logoutUser() {
    alert("Logged out!");
    window.location.href = "02_login.html";
}

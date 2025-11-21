// SIGNUP FUNCTION
function signupUser() {
    let user = {
        name: document.getElementById("signupName").value,
        email: document.getElementById("signupEmail").value,
        password: document.getElementById("signupPassword").value
    };

    localStorage.setItem("EcoUser", JSON.stringify(user));

    alert("Account created successfully!");

    // CORRECT REDIRECT
    window.location.href = "login.html";

    return false;
}


// LOGIN FUNCTION
function loginUser() {
    let savedUser = JSON.parse(localStorage.getItem("EcoUser"));

    if (!savedUser) {
        alert("No user found. Please sign up.");
        return false;
    }

    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    if (email === savedUser.email && password === savedUser.password) {
        alert("Login successful!");
        window.location.href = "dashboard.html";
    } else {
        alert("Incorrect email or password!");
    }

    return false;
}

// LOGOUT FUNCTION
function logoutUser() {
    alert("Logged out!");
    window.location.href = "login.html";
}



const authSection = document.querySelector("#auth-section");
const driveApp = document.querySelector("#drive-app");

const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");

const toggleAuthButton = document.querySelector("#toggle-auth");
const authDescription = document.querySelector("#auth-description");
const authMessage = document.querySelector("#auth-message");

const userLabel = document.querySelector("#user-label");
const logoutButton = document.querySelector("#logout-button");

let isRegisterMode = false;


// --------------------
// SHOW AUTHENTICATION
// --------------------

function showAuth() {
    authSection.hidden = false;
    driveApp.hidden = true;
}


// --------------------
// SHOW DRIVE APPLICATION
// --------------------

function showDrive(user) {
    authSection.hidden = true;
    driveApp.hidden = false;

    userLabel.textContent = user.name;

    if (typeof loadFiles === "function") {
        loadFiles();
    }
}


// --------------------
// TOGGLE LOGIN / REGISTER
// --------------------

toggleAuthButton.addEventListener("click", function () {
    isRegisterMode = !isRegisterMode;

    loginForm.hidden = isRegisterMode;
    registerForm.hidden = !isRegisterMode;

    authDescription.textContent = isRegisterMode
        ? "Create your account."
        : "Sign in to access your files.";

    toggleAuthButton.textContent = isRegisterMode
        ? "Already have an account? Login"
        : "Create a new account";

    authMessage.textContent = "";
});


// --------------------
// LOGIN
// --------------------

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    authMessage.textContent = "Logging in...";

    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value;

    try {
        const data = await apiRequest("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        authMessage.textContent = "Login successful.";

        showDrive(data.user);

    } catch (error) {
        console.error("Login failed:", error);
        authMessage.textContent = error.message;
    }
});


// --------------------
// REGISTER
// --------------------

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    authMessage.textContent = "Creating account...";

    const name = document.querySelector("#register-name").value.trim();
    const email = document.querySelector("#register-email").value.trim();
    const password = document.querySelector("#register-password").value;

    try {
        await apiRequest("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        authMessage.textContent =
            "Account created. Please login.";

        registerForm.reset();

        isRegisterMode = false;
        registerForm.hidden = true;
        loginForm.hidden = false;

        authDescription.textContent =
            "Sign in to access your files.";

        toggleAuthButton.textContent =
            "Create a new account";

    } catch (error) {
        console.error("Registration failed:", error);
        authMessage.textContent = error.message;
    }
});


// --------------------
// LOGOUT
// --------------------

logoutButton.addEventListener("click", async function () {
    try {
        await apiRequest("/auth/logout", {
            method: "POST"
        });

        showAuth();

        loginForm.reset();
        registerForm.reset();

        authMessage.textContent = "You have logged out.";

    } catch (error) {
        console.error("Logout failed:", error);
        authMessage.textContent = error.message;
    }
});


// --------------------
// CHECK EXISTING SESSION
// --------------------

async function checkSession() {
    try {
        const data = await apiRequest("/auth/me");

        showDrive(data.user);

    } catch (error) {
        showAuth();
    }
}

checkSession();

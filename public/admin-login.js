// public/admin-login.js

document.addEventListener('DOMContentLoaded', () => {
    // Find the login form and add a submit event listener
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    // Add event listener for the show/hide password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }
});

// Function to handle the admin login process
async function handleAdminLogin(event) {
    // Prevent the default form submission (page reload)
    event.preventDefault();

    // Get email and password values from the input fields
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    // Get the element to display messages (errors or success)
    const messageEl = document.getElementById('message');
    messageEl.textContent = ''; // Clear previous messages

    try {
        // Send a POST request to the backend /api/login endpoint
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Indicate we're sending JSON
            },
            // Convert login credentials to a JSON string
            body: JSON.stringify({ email, password })
        });

        // Parse the JSON response from the server
        const result = await response.json();

        // Check if the request was successful (status code 2xx)
        if (response.ok) {
            // --- IMPORTANT CHECK: Verify if the user has the 'admin' role ---
            if (result.role !== 'admin') {
                // If the user is not an admin, show an error and stop
                messageEl.textContent = 'Access Denied: Not an authorized admin account.';
                messageEl.style.color = 'red';
                localStorage.clear(); // Clear any potentially saved (non-admin) data
                return; // Stop the login process
            }
            // -----------------------------------------------------------------

            // If login is successful AND user is an admin:
            // 1. Save authentication token, customer ID, and role in browser's local storage
            localStorage.setItem('token', result.token);
            localStorage.setItem('customerId', result.customerId);
            localStorage.setItem('role', result.role);

            // 2. Redirect the admin to the admin dashboard
            window.location.href = 'admin.html';

        } else {
            // If the server responded with an error (e.g., invalid credentials)
            messageEl.textContent = `Error: ${result.message}`; // Display the error from the server
            messageEl.style.color = 'red';
        }

    } catch (error) {
        // Handle network errors (e.g., server is down)
        console.error('Admin Login Fetch Error:', error);
        messageEl.textContent = 'Could not connect to the server. Please try again later.';
        messageEl.style.color = 'red';
    }
}

// Optional: Include showToast if you prefer it over the messageEl
// function showToast(message, type = 'error') { ... }
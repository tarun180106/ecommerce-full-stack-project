// public/script.js

document.getElementById('signup-form').addEventListener('submit', async function(event) {
    // Prevent the default form submission behavior (which would cause a page reload)
    event.preventDefault();

    // Get values from the form input fields
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;
    const adminCode = document.getElementById('adminCode').value; // Get the optional admin code

    // Get the element where messages will be displayed
    const messageEl = document.getElementById('message');
    messageEl.textContent = ''; // Clear previous messages

    try {
        // Send a POST request to the backend registration endpoint
        const response = await fetch('http://localhost:3000/api/register', { // Correct: Full server address
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Indicate we're sending JSON data
            },
            // Convert the user data into a JSON string for the request body
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                phone: phone,
                adminCode: adminCode // Send the admin code
            })
        });

        // Parse the JSON response from the server
        const result = await response.json();

        // Check if the request was successful (status code 2xx)
        if (response.ok) {
            messageEl.textContent = result.message; // Display success message from server
            messageEl.style.color = 'green';
            document.getElementById('signup-form').reset(); // Clear the form fields
            // Optionally, redirect to login after a short delay
            // setTimeout(() => {
            //     window.location.href = '/login.html';
            // }, 2000);
        } else {
            // If the server responded with an error (e.g., email already exists)
            messageEl.textContent = `Error: ${result.message}`; // Display error message from server
            messageEl.style.color = 'red';
        }

    } catch (error) {
        // Handle network errors (e.g., server is down)
        console.error('Signup Fetch Error:', error);
        messageEl.textContent = 'Could not connect to the server. Please try again later.';
        messageEl.style.color = 'red';
    }
});
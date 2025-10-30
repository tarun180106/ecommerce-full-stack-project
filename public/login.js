document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('message');

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('customerId', result.customerId);
            // The redirect now points to the new products page
            localStorage.setItem('role', result.role);
            window.location.href = 'index.html'; 
        } else {
            messageEl.textContent = `Error: ${result.message}`;
            messageEl.style.color = 'red';
        }

    } catch (error) {
        console.error('Login Fetch Error:', error);
        messageEl.textContent = 'Could not connect to the server.';
        messageEl.style.color = 'red';
    }
});
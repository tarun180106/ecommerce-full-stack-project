document.addEventListener('DOMContentLoaded', () => {
    fetchAllUsers();
});

async function fetchAllUsers() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect or show error if not logged in as admin
        document.getElementById('admin-user-list').innerHTML = '<tr><td colspan="6">Authentication Error. Please log in.</td></tr>';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || `HTTP error! Status: ${response.status}`);
        }

        const users = await response.json();
        const userList = document.getElementById('admin-user-list');
        userList.innerHTML = ''; // Clear previous content

        if (users.length === 0) {
            userList.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const registrationDate = new Date(user.created_at).toLocaleDateString();
            row.innerHTML = `
                <td>${user.customer_id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${registrationDate}</td>
                <td>${user.role}</td>
                `;
            userList.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        const userList = document.getElementById('admin-user-list');
        userList.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    }
}

// Include showToast function if needed for future actions
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
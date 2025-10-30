document.addEventListener('DOMContentLoaded', () => {
    fetchAllOrders();
});

async function fetchAllOrders() {
    const token = localStorage.getItem('token');
    const orderList = document.getElementById('admin-order-list'); 

    if (!token) {
        orderList.innerHTML = '<tr><td colspan="6">Authentication Error. Please log in as admin.</td></tr>';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/admin/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorResult = await response.json(); 
            throw new Error(errorResult.message || `HTTP error! Status: ${response.status}`);
        }

        const orders = await response.json();
        orderList.innerHTML = ''; 

        if (orders.length === 0) {
            orderList.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            const orderDate = new Date(order.order_date).toLocaleDateString();
            
            // Define status options dynamically
            const statusOptions = ['Order Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']
                .map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`)
                .join('');

            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${order.customer_name}</td>
                <td>${orderDate}</td>
                <td>₹${order.total_amount}</td>
                <td><select id="status-${order.order_id}">${statusOptions}</select></td>
                <td><button class="edit-btn nav-button" onclick="updateStatus(${order.order_id})">Update</button></td>
            `;
            orderList.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        orderList.innerHTML = `<tr><td colspan="6">Error loading orders: ${error.message}</td></tr>`;
    }
}

async function updateStatus(orderId) {
    const token = localStorage.getItem('token');
    const statusSelect = document.getElementById(`status-${orderId}`);
    const newStatus = statusSelect.value;

    if (!token) {
        showToast('Authentication error.', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message || 'Status updated!', 'success');
            // Optional: Visually confirm change or fetchAllOrders() again
        } else {
            showToast(`Error: ${result.message || 'Failed to update.'}`, 'error');
        }

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Server error during update.', 'error');
    }
}

// Function for toast notification (Must be included)
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
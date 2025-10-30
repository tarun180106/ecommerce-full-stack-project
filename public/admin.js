document.addEventListener('DOMContentLoaded', () => {
    // Fetch products when the admin page loads
    fetchAdminProducts();
});

// Function to fetch products from the API and display them in the table
async function fetchAdminProducts() {
    try {
        // Fetch product data from the general products endpoint
        const response = await fetch('http://localhost:3000/api/products?limit=999'); // Request all products
        // The backend sends an object like { products: [...], currentPage: ..., totalPages: ... }
        const data = await response.json(); 
        
        const productList = document.getElementById('admin-product-list');
        productList.innerHTML = ''; // Clear previous table rows

        // --- FIX IS HERE: Check if data.products exists and is an array ---
        if (data && Array.isArray(data.products)) {
            // Loop through the 'products' array within the received 'data' object
            data.products.forEach(product => {
                const row = document.createElement('tr');
                // Create table row HTML for each product
                row.innerHTML = `
                    <td>${product.product_id}</td>
                    <td>${product.name}</td>
                    <td>₹${product.mrp}</td>
                    <td>${product.quantity}</td>
                    <td>
                        <a href="edit-product.html?id=${product.product_id}" class="edit-btn nav-button">Edit</a>
                        <button class="remove-btn" onclick="deleteProduct(${product.product_id})">Delete</button>
                    </td>
                `;
                productList.appendChild(row); // Add the row to the table body
            });
        } else {
             // If data format is wrong, log an error and show a message in the table
             console.error("Received unexpected data format for admin products:", data);
             productList.innerHTML = '<tr><td colspan="4">Error loading products. Invalid data received.</td></tr>';
        }
        // --- END OF FIX ---

    } catch (error) {
        // Handle fetch errors (e.g., server down)
        console.error('Error fetching products:', error);
        const productList = document.getElementById('admin-product-list');
        if (productList) {
            productList.innerHTML = '<tr><td colspan="4">Could not fetch products. Server may be down.</td></tr>';
        }
    }
}

// Function to delete a product
async function deleteProduct(productId) {
    // Confirm deletion with the admin
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return; // Stop if the admin clicks "Cancel"
    }

    const token = localStorage.getItem('token'); // Get the admin's login token

    // Check if the token exists (admin is logged in)
    if (!token) {
        showToast('Authentication error. Please log in again.', 'error');
        return;
    }

    try {
        // Send DELETE request to the protected admin endpoint
        const response = await fetch(`http://localhost:3000/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` // IMPORTANT: Send the token for authorization
            }
        });

        const result = await response.json(); // Get the response message

        if (response.ok) {
            showToast('Product deleted successfully!');
            fetchAdminProducts(); // Refresh the product list in the table
        } else {
            // Show error message from the server (e.g., "Access denied")
            showToast(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        // Handle network or other errors during deletion
        console.error('Error deleting product:', error);
        showToast('Failed to delete product. Server error.', 'error');
    }
}

// Function to display toast notifications (Must be included)
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
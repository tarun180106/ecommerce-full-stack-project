document.addEventListener('DOMContentLoaded', () => {
    const customerId = localStorage.getItem('customerId');
    if (customerId) {
        fetchOrderHistory(customerId);
    } else {
        document.getElementById('order-list-container').innerHTML = 
            '<p>Please <a href="login.html">log in</a> to view your order history.</p>';
    }
});

// in public/orders.js

// in public/orders.js

async function fetchOrderHistory(customerId) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${customerId}`);
        const orders = await response.json();
        const container = document.getElementById('order-list-container');
        container.innerHTML = '';

        if (orders.length === 0) {
            container.innerHTML = '<p>You have not placed any orders yet.</p>';
            return;
        }

        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card'; // Use existing class

            const orderDate = new Date(order.order_date).toLocaleDateString();
            const statusClass = order.status ? order.status.toLowerCase().replace(/ /g, '-') : 'unknown'; // Handle potential missing status

            // Construct address line (ensure null safety)
            const addressLine = order.street_no ? 
                `${order.street_no}, ${order.city || ''}, ${order.state || ''}, ${order.zip_code || ''}` : 
                'Address not recorded.';

            // Construct tracking link
            const trackingLink = (order.tracking_number && order.tracking_number.trim() !== '') 
                ? `<a href="tracking.html?id=${order.tracking_number}" target="_blank" class="nav-button">Track Order</a>` 
                : '<span style="color: var(--grey-color);">Tracking N/A</span>'; // Less prominent error

            // Create HTML for each product item in the order
            let itemsHtml = '<div class="order-items-container">';
            order.items.forEach(item => {
                itemsHtml += `
                    <div class="order-product-item">
                        <img src="${item.image_url || 'images/placeholder.jpg'}" alt="${item.name}" class="order-item-image">
                        <div class="order-item-details">
                            <a href="product-detail.html?id=${item.product_id}">${item.name}</a>
                            <span>Qty: ${item.quantity}</span>
                            <span>Price: ₹${item.price_per_item}</span>
                        </div>
                        <a href="product-detail.html?id=${item.product_id}#review-form-container" class="nav-button write-review-btn">Write a review</a>
                    </div>
                `;
            });
            itemsHtml += '</div>';

            // --- NEW PROFESSIONAL CARD STRUCTURE ---
            orderCard.innerHTML = `
                <div class="order-card-header">
                    <div class="header-section">
                        <span>ORDER PLACED</span>
                        <span>${orderDate}</span>
                    </div>
                    <div class="header-section">
                        <span>TOTAL</span>
                        <span>₹${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div class="header-section">
                        <span>SHIP TO</span>
                        <span class="ship-to-address">${addressLine}</span>
                    </div>
                    <div class="header-section header-order-id">
                        <span>ORDER # ${order.order_id}</span>
                        <span>${trackingLink}</span> 
                    </div>
                </div>
                <div class="order-card-body">
                    <h3 class="order-status status-${statusClass}">${order.status || 'Status Unknown'}</h3>
                    ${itemsHtml}
                </div>
            `;
            // --- END OF NEW STRUCTURE ---

            container.appendChild(orderCard);
        });

    } catch (error) {
        console.error('Error fetching order history:', error);
        // Display a user-friendly error message
        document.getElementById('order-list-container').innerHTML = '<p>Could not load order history. Please try again later.</p>';
    }
}
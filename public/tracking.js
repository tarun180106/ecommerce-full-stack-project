document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const trackingNumber = params.get('id'); // Get the ID from the URL: /tracking.html?id=...

    if (trackingNumber) {
        document.getElementById('tracking-input-display').textContent = trackingNumber;
        fetchTrackingInfo(trackingNumber);
    } else {
        document.getElementById('tracking-info').innerHTML = '<p style="color: red;">No tracking number provided.</p>';
    }
});

async function fetchTrackingInfo(trackingNumber) {
    try {
        const response = await fetch(`http://localhost:3000/api/track/${trackingNumber}`);
        const data = await response.json();
        const infoContainer = document.getElementById('tracking-info');

        if (!response.ok) {
            infoContainer.innerHTML = `<p class="status-error">Order Not Found. Please check the tracking number.</p>`;
            return;
        }

        // Display the order status and details
        const orderDate = new Date(data.order_date).toLocaleDateString();
        const statusClass = data.status.toLowerCase().replace(/ /g, '-');

        let itemsListHTML = data.items.map(item => 
            `<li>${item.name} (x${item.quantity}) - ₹${(item.quantity * item.price_per_item).toFixed(2)}</li>`
        ).join('');

        infoContainer.innerHTML = `
            <div class="tracking-summary">
                <span class="tracking-number-display">Tracking # ${data.tracking_number}</span>
                <span class="order-date-display">Order Date: ${orderDate}</span>
            </div>
            
            <div class="tracking-status-box">
                <h2>Current Status: <span class="status-text status-${statusClass}">${data.status}</span></h2>
                <p>Total Paid: <strong>₹${data.total_amount}</strong></p>
            </div>

            <div class="tracking-details-section">
                <h3>Order Details (${data.items.length} items)</h3>
                <ul class="order-items-list">${itemsListHTML}</ul>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching tracking info:', error);
        document.getElementById('tracking-info').innerHTML = `<p class="status-error">Failed to connect to tracking service.</p>`;
    }
}
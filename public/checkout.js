document.addEventListener('DOMContentLoaded', () => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
        window.location.href = 'login.html';
        return;
    }
    
    fetchAddresses(customerId);
    fetchOrderSummary(customerId);
});

// Function to fetch and display addresses
async function fetchAddresses(customerId) {
    try {
        const response = await fetch(`http://localhost:3000/api/addresses/${customerId}`);
        const addresses = await response.json();
        const container = document.getElementById('address-container');
        container.innerHTML = '';

        if (addresses.length === 0) {
            container.innerHTML = '<p style="color: red;">No addresses found. Please add one later.</p>';
            return;
        }

        addresses.forEach((address, index) => {
            container.innerHTML += `
                <label class="address-option">
                    <input type="radio" name="shipping_address" value="${address.address_id}" ${index === 0 ? 'checked' : ''}>
                    ${address.street_no}, ${address.city}, ${address.state} - ${address.zip_code}
                </label>
            `;
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
    }
}

// Function to fetch the cart items and display the summary
async function fetchOrderSummary(customerId) {
    try {
        // Use the existing cart endpoint to get item details
        const response = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        const cartItems = await response.json();
        const summaryPanel = document.getElementById('checkout-summary-panel');
        let subtotal = 0;

        if (cartItems.length === 0) {
            summaryPanel.innerHTML = '<p>Your cart is empty. Please return to the shop.</p>';
            return;
        }
        
        const itemsListHTML = cartItems.map(item => {
            const itemTotal = item.mrp * item.quantity;
            subtotal += itemTotal;
            return `
                <div class="summary-item-line">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>₹${itemTotal.toFixed(2)}</span>
                </div>
            `;
        }).join('');

        // Display the final summary
        summaryPanel.innerHTML = `
            <div class="summary-box">
                <h2>Order Summary</h2>
                <div class="summary-items-list">${itemsListHTML}</div>
                <hr>
                <div class="summary-line">
                    <span>Item Subtotal:</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-line">
                    <span>Shipping:</span>
                    <span style="color: var(--success-color);">FREE</span>
                </div>
                <div class="summary-total final-total">
                    <span>Order Total:</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <button id="place-order-btn" class="checkout-btn">Place Order</button>
            </div>
        `;
        
        // Attach the Place Order event listener
        document.getElementById('place-order-btn').addEventListener('click', finalizeOrder);

    } catch (error) {
        console.error('Error fetching order summary:', error);
    }
}

// Function to call the checkout API
// in public/checkout.js

async function finalizeOrder() {
    // 1. Check if an address is selected
    const selectedAddress = document.querySelector('input[name="shipping_address"]:checked');
    if (!selectedAddress) {
        showToast('Please select a shipping address.', 'error');
        return;
    }
    
    // 2. Capture the addressId from the radio button's value
    const addressId = selectedAddress.value;
    const customerId = localStorage.getItem('customerId');

    try {
        const response = await fetch('http://localhost:3000/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 3. Send both the customerId and the addressId
            body: JSON.stringify({ customerId: customerId, addressId: addressId }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success: Redirect to thank you page
            window.location.href = `thankyou.html?orderId=${result.orderId}`;
        } else {
            // Failure: Display the error message returned from the server
            showToast(`Order failed: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Final order placement failed:', error);
        // Catch connection/network errors
        showToast('Could not connect to the server to place order.', 'error');
    }
}

// Your existing showToast function (You need to ensure this is included)
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`; // Use class for error/success colors if defined in CSS
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}

// in public/checkout.js

document.addEventListener('DOMContentLoaded', () => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
        window.location.href = '/login.html';
        return;
    }
    
    fetchAddresses(customerId);
    fetchOrderSummary(customerId);
    
    // --- ADD EVENT LISTENERS FOR NEW ADDRESS FORM ---
    const formContainer = document.getElementById('new-address-form-container');
    const toggleBtn = document.getElementById('toggle-new-address-btn');
    
    // 1. Toggle button handler
    toggleBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        toggleBtn.style.display = 'none';
    });

    // 2. Cancel button handler
    document.getElementById('cancel-new-address-btn').addEventListener('click', () => {
        formContainer.style.display = 'none';
        toggleBtn.style.display = 'block';
        document.getElementById('new-address-form').reset();
    });

    // 3. Form submission handler
    document.getElementById('new-address-form').addEventListener('submit', handleNewAddressSubmit);
});

// --- NEW FUNCTION: Save New Address ---
async function handleNewAddressSubmit(event) {
    event.preventDefault();
    
    const customerId = localStorage.getItem('customerId');
    const form = event.target;

    const newAddress = {
        customerId: customerId,
        street_no: form.street_no.value,
        city: form.city.value,
        state: form.state.value,
        zip_code: form.zip_code.value
    };

    try {
        const response = await fetch('http://localhost:3000/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAddress)
        });

        if (response.ok) {
            showToast('New address saved!', 'success');
            
            // Re-fetch and display all addresses, including the new one
            fetchAddresses(customerId); 
            
            // Hide the form
            document.getElementById('new-address-form-container').style.display = 'none';
            document.getElementById('toggle-new-address-btn').style.display = 'block';

        } else {
            const result = await response.json();
            showToast(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving new address:', error);
        showToast('Could not save address. Server error.', 'error');
    }
}
// --- The rest of your existing fetchAddresses function should remain the same ---
// (It will be automatically called when the page loads, and again after a successful save.)
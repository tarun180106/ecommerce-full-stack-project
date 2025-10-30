document.addEventListener('DOMContentLoaded', () => {
    const customerId = localStorage.getItem('customerId');
    if (customerId) {
        fetchCartItems(customerId);
    } else {
        // Display login message if the user is not logged in.
        const cartLayout = document.querySelector('.cart-layout');
        if (cartLayout) {
            // FIX: Use absolute path for login page
            cartLayout.innerHTML = '<p>Please <a href="login.html">log in</a> to view your cart.</p>'; 
        }
    }
});

async function fetchCartItems(customerId) {
    try {
        // Fetch cart items from the backend API
        const response = await fetch(`http://localhost:3000/api/cart/${customerId}`);
        const cartItems = await response.json();

        const itemsContainer = document.getElementById('cart-items-container');
        const summaryContainer = document.getElementById('order-summary-container');
        itemsContainer.innerHTML = ''; // Clear previous items
        let subtotal = 0;

        // 1. Handle empty cart (using professional empty state)
        if (cartItems.length === 0) {
            const cartLayout = document.querySelector('.cart-layout');
            if (cartLayout) {
                // Apply centering style for empty state
                cartLayout.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3>Your cart is empty</h3>
                        <a href="products.html" class="nav-button">Continue Shopping</a>
                    </div>`;
            }
            summaryContainer.innerHTML = '';
            return;
        }

        // 2. Display each cart item
        cartItems.forEach(item => {
            const itemTotal = item.mrp * item.quantity;
            subtotal += itemTotal;

            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item-card';
            itemElement.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p class="cart-item-price">₹${item.mrp}</p>
                    <div class="quantity-selector">
                        <button onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <div class="cart-item-total">
                    <p>₹${itemTotal.toFixed(2)}</p>
                    <button class="remove-btn" onclick="removeFromCart(${item.product_id})">Remove</button>
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });
        
        // 3. Build the order summary box
        summaryContainer.innerHTML = `
            <div class="order-summary">
                <h2>Order Summary</h2>
                <div class="summary-line">
                    <span>Subtotal</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-line">
                    <span>Shipping</span>
                    <span>FREE</span>
                </div>
                <hr>
                <div class="summary-total">
                    <span>Total</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <button class="checkout-btn">Proceed to Checkout</button>
            </div>
        `;
        // Attach the event listener to the newly created checkout button
        summaryContainer.querySelector('.checkout-btn').addEventListener('click', proceedToCheckout);

    } catch (error) {
        console.error('Error fetching cart items:', error);
    }
}

// Function to update item quantity (on + / - click)
async function updateQuantity(productId, newQuantity) {
    if (newQuantity === 0) {
        removeFromCart(productId);
        return;
    }
    const customerId = localStorage.getItem('customerId');
    try {
        const response = await fetch(`http://localhost:3000/api/cart/item/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, quantity: newQuantity })
        });
        if (response.ok) {
            fetchCartItems(customerId); 
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
    }
}

// Function to remove item from cart
async function removeFromCart(productId) {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) return;
    try {
        const response = await fetch(`http://localhost:3000/api/cart/item/${productId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: customerId })
        });
        if (response.ok) {
            showToast('Item removed from cart.');
            fetchCartItems(customerId); // Refresh the entire cart view
        } else {
            const result = await response.json();
            showToast(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error removing item from cart:', error);
    }
}

// Function to redirect to checkout page
async function proceedToCheckout() {
    // Basic check before redirecting
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
        showToast('Please log in first.', 'error');
        return;
    }
    // FIX: Redirect to the new checkout page using absolute path
    window.location.href = 'checkout.html'; 
}

// Function for toast notification (Must be included)
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
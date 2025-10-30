document.addEventListener('DOMContentLoaded', () => {
    // Attempt to get the customer ID from local storage
    const customerId = localStorage.getItem('customerId');
    
    // Find the container where wishlist items will be displayed
    const container = document.getElementById('wishlist-items-container');

    // Check if a customer ID exists (user is logged in)
    if (customerId) {
        // If logged in, fetch the wishlist items
        fetchWishlistItems(customerId);
    } else {
        // If not logged in, display a message asking the user to log in
        if (container) {
            container.innerHTML = '<p>Please <a href="login.html">log in</a> to view your wishlist.</p>';
        } else {
            // Log an error if the container element isn't found in the HTML
            console.error("Wishlist container not found!");
        }
    }
});

// Function to fetch and display wishlist items for a given customer ID
async function fetchWishlistItems(customerId) {
    try {
        // Fetch wishlist items from the backend API
        const response = await fetch(`http://localhost:3000/api/wishlist/${customerId}`);
        // Parse the JSON response from the API
        const items = await response.json();
        // Get the container element where items will be displayed
        const container = document.getElementById('wishlist-items-container');
        // Clear any previous content from the container
        container.innerHTML = ''; 

        // Check if the wishlist is empty
        if (items.length === 0) {
            // Display a professional "empty state" message if no items are found
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;"> 
                    <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h3>Your wishlist is empty</h3>
                    <p>Add items by clicking the heart icon on products you love.</p>
                    <a href="products.html" class="nav-button">Explore Products</a>
                </div>
            `;
            // Stop the function execution since there are no items to display
            return; 
        }

        // Loop through each item in the wishlist and create a product card for it
        items.forEach(item => {
            // Create a new div element for the product card
            const itemCard = document.createElement('div');
            // Assign CSS classes for styling (product-card for general layout, wishlist-card for specific styles)
            itemCard.className = 'product-card wishlist-card'; 
            // Set the inner HTML of the card, using item data
            itemCard.innerHTML = `
                <img src="${item.image_url || 'images/placeholder.jpg'}" alt="${item.name}" class="product-card-image">
                <h3>${item.name}</h3>
                <p>${item.description}</p> 
                <div class="price">₹${item.mrp}</div>
                <div class="wishlist-actions">
                    <button class="move-to-cart-btn" onclick="moveToCart(${item.product_id})">Move to Cart</button>
                    <button class="remove-btn" onclick="removeFromWishlist(${item.product_id})">Remove</button>
                </div>
            `;
            // Append the newly created card to the main container
            container.appendChild(itemCard);
        });

    } catch (error) {
        // Log any errors that occur during the fetch or display process
        console.error('Error fetching wishlist items:', error);
        // Display an error message to the user if items couldn't be loaded
        const container = document.getElementById('wishlist-items-container');
        if(container) {
            container.innerHTML = '<p>Could not load wishlist items. Please try again later.</p>';
        }
    }
}

// --- Action Functions (Move to Cart, Remove) ---

// Function to move an item from the wishlist to the shopping cart
async function moveToCart(productId) {
    const customerId = localStorage.getItem('customerId');
    // Ensure the user is logged in
    if (!customerId) {
        showToast('Please log in to manage your cart.', 'error');
        return;
    }
    
    try {
        // 1. Send request to add the item to the cart
        const cartResponse = await fetch('http://localhost:3000/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity: 1 }),
        });
        
        // If adding to cart was successful
        if (cartResponse.ok) {
            // 2. Send request to remove the item from the wishlist
            await fetch(`http://localhost:3000/api/wishlist/item/${productId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: customerId }),
            });
            // Show success message and refresh the wishlist view
            showToast('Item moved to cart!', 'success');
            fetchWishlistItems(customerId); 
        } else {
            // If adding to cart failed, show an error message
             showToast('Failed to add to cart. Item might already be there.', 'error');
        }
    } catch (error) {
        // Log and show error message if the process fails
        console.error('Error moving item:', error);
        showToast('An error occurred while moving the item.', 'error');
    }
}

// Function to remove an item from the wishlist
async function removeFromWishlist(productId) {
    const customerId = localStorage.getItem('customerId');
    // Ensure the user is logged in
    if (!customerId) {
        showToast('Please log in to manage your wishlist.', 'error');
        return;
    }
    
    try {
        // Send request to the backend to delete the item
        const response = await fetch(`http://localhost:3000/api/wishlist/item/${productId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: customerId }),
        });
        // If deletion was successful
        if (response.ok) {
             // Show success message and refresh the wishlist view
             showToast('Item removed from wishlist.', 'success');
             fetchWishlistItems(customerId); 
        } else {
            // If deletion failed, show an error message
            const result = await response.json();
            showToast(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        // Log and show error message if the process fails
        console.error('Error removing item from wishlist:', error);
        showToast('An error occurred while removing the item.', 'error');
    }
}

// --- Utility Function ---

// Function to display toast notifications
function showToast(message, type = 'success') {
    // Get the toast element from the HTML
    const toast = document.getElementById("toast-notification");
    // If the element doesn't exist, do nothing
    if (!toast) return;
    // Set the message text
    toast.textContent = message;
    // Apply CSS classes to show the toast and style it (e.g., 'success' or 'error')
    toast.className = `toast show ${type}`;
    // Set a timer to hide the toast after 3 seconds (3000 milliseconds)
    setTimeout(() => { 
        toast.className = toast.className.replace("show", "").replace(type, ""); 
    }, 3000);
}
// public/product-detail.js

document.addEventListener('DOMContentLoaded', () => {
    // Get the product ID from the URL query parameter (e.g., ?id=1)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    // Find the main content container
    const contentContainer = document.getElementById('product-detail-content');

    // If a product ID exists in the URL
    if (productId) {
        // Fetch and display product details, reviews, and the review form
        fetchProductDetails(productId);
        fetchProductReviews(productId);
        displayReviewForm(productId);
    } else {
        // If no product ID is found, display an error message
        if (contentContainer) {
            contentContainer.innerHTML = '<p>Product not found. Invalid ID provided.</p>';
        }
        console.error("No product ID found in URL.");
    }
});

// Function to fetch and display the main product details
// Function to fetch and display the main product details
async function fetchProductDetails(productId) {
    try {
        // Fetch product data from the backend API, including category info
        const response = await fetch(`http://localhost:3000/api/products/${productId}`);
        // Check if the server responded successfully
        if (!response.ok) {
            throw new Error('Product not found or error loading details.');
        }
        // Parse the JSON data from the response
        const product = await response.json();

        // --- Build Breadcrumbs ---
        buildBreadcrumbs(product.category_name, product.name);

        // --- Build Product Detail Grid ---
        const contentContainer = document.getElementById('product-detail-content');
        if (!contentContainer) {
            console.error("Product detail content container not found!");
            return;
        }

        // Generate HTML for product features list (if available)
        let featuresHtml = '';
        if (product.features) {
            featuresHtml = '<ul>';
            // Split the features string by '|' and create list items
            product.features.split('|').forEach(feature => {
                featuresHtml += `<li>${feature.trim()}</li>`; // Added trim() for safety
            });
            featuresHtml += '</ul>';
        } else {
            featuresHtml = '<p>No specific features listed.</p>'; // Fallback message
        }

        // --- Stock Display & Button Logic ---
        const isInStock = product.quantity > 0;
        const stockText = isInStock
            ? `<p class="stock-status stock-in">In Stock (${product.quantity} available)</p>`
            : '<p class="stock-status stock-out">Out of Stock</p>';
        const buttonDisabled = !isInStock ? 'disabled' : ''; // Add 'disabled' attribute if out of stock
        const buttonText = isInStock ? 'Add to Cart' : 'Out of Stock';
        // ------------------------------------

        // Set the inner HTML for the main product display section (3-column grid)
        contentContainer.innerHTML = `
            <div class="product-page-grid">
                <div class="product-image-container">
                    <img src="${product.image_url || '/images/placeholder.jpg'}" alt="${product.name}" class="product-detail-image">
                </div>

                <div class="product-info-container">
                    <h1>${product.name}</h1>
                    <hr>
                    <div class="price detail-price">₹${product.mrp}</div>
                    <h3>About this item</h3>
                    ${featuresHtml}
                </div>

                <div class="product-action-box">
                    <div class="price detail-price">₹${product.mrp}</div>
                    ${stockText}
                    <div class="form-group">
                        <label for="quantity">Quantity:</label>
                        <select id="quantity" name="quantity" class="quantity-select" ${buttonDisabled}> {/* Disable quantity if out of stock */}
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                    <button onclick="addToCart(${product.product_id})" class="detail-add-to-cart-btn" ${buttonDisabled}>${buttonText}</button>
                    <button class="buy-now-btn" ${buttonDisabled}>Buy Now</button>
                    <button class="add-to-wishlist-detail-btn" onclick="addToWishlist(${product.product_id})"><i class="fas fa-heart"></i> Add to Wishlist</button>
                </div>
            </div>`;

        // --- Display Long Description ---
        const descriptionContainer = document.getElementById('product-long-description-section');
        if (descriptionContainer) {
            descriptionContainer.innerHTML = `
                <h2>Product Description</h2>
                <p>${product.detailed_description || 'No detailed description available.'}</p>
            `;
        } else {
            console.error("Product long description container not found!");
        }

    } catch (error) {
        // Handle errors during fetching or display
        const contentContainer = document.getElementById('product-detail-content');
        if (contentContainer) {
            contentContainer.innerHTML = `<p>Error loading product details: ${error.message}</p>`;
        }
        console.error('Error fetching product details:', error);
    }
}
// Function to build and display breadcrumb navigation
function buildBreadcrumbs(categoryName, productName) {
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    if (!breadcrumbContainer) return; // Exit if container doesn't exist

    // Create a link for the category if it exists
    let categoryLink = categoryName ? `<a href="products.html">${categoryName}</a> &gt; ` : '';

    // Set the breadcrumb HTML
    breadcrumbContainer.innerHTML = `
        <a href="/">Home</a> &gt;
        <a href="products.html">Products</a> &gt;
        ${categoryLink}
        <span>${productName}</span>
    `;
}

// Function to fetch and display product reviews
async function fetchProductReviews(productId) {
    try {
        const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`);
        const reviews = await response.json();
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return; // Exit if container doesn't exist

        reviewList.innerHTML = ''; // Clear previous reviews

        if (reviews.length === 0) {
            reviewList.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
            return;
        }

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-card';
            const reviewDate = new Date(review.created_at).toLocaleDateString();
            reviewElement.innerHTML = `
                <div class="review-header">
                    <strong>${review.customer_name}</strong>
                    <span class="review-date">${reviewDate}</span>
                </div>
                <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                <p>${review.comment}</p>
            `;
            reviewList.appendChild(reviewElement);
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
}

// Function to display the "Write a Review" form
function displayReviewForm(productId) {
    const customerId = localStorage.getItem('customerId');
    const formContainer = document.getElementById('review-form-container');
    if (!formContainer) return; // Exit if container doesn't exist

    // If user is not logged in, show login link
    if (!customerId) {
        formContainer.innerHTML = '<h2>Write a Review</h2><p><a href="/login.html">Log in</a> to post a review.</p>';
        return;
    }

    // Display the review form with interactive star rating
    formContainer.innerHTML = `
        <h2>Write a Review</h2>
        <form id="review-form">
            <div class="form-group">
                <label>Your Rating</label>
                <div class="star-rating">
                    <input type="radio" id="star5" name="rating" value="5" /><label for="star5"><i class="fas fa-star"></i></label>
                    <input type="radio" id="star4" name="rating" value="4" /><label for="star4"><i class="fas fa-star"></i></label>
                    <input type="radio" id="star3" name="rating" value="3" /><label for="star3"><i class="fas fa-star"></i></label>
                    <input type="radio" id="star2" name="rating" value="2" /><label for="star2"><i class="fas fa-star"></i></label>
                    <input type="radio" id="star1" name="rating" value="1" required/><label for="star1"><i class="fas fa-star"></i></label>
                </div>
            </div>
            <div class="form-group">
                <label for="comment">Your Review</label>
                <textarea id="comment" name="comment" rows="4" placeholder="Tell us what you thought..."></textarea>
            </div>
            <button type="submit">Submit Review</button>
        </form>
    `;

    // Add event listener to handle form submission
    document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const ratingElement = document.querySelector('input[name="rating"]:checked');
        if (!ratingElement) {
            showToast('Please select a star rating.', 'error');
            return;
        }
        const rating = ratingElement.value;
        const comment = document.getElementById('comment').value;

        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, rating, comment })
            });

            if (response.ok) {
                document.getElementById('review-form').reset();
                showToast('Review submitted!', 'success');
                fetchProductReviews(productId); // Refresh reviews list
            } else {
                showToast('Failed to submit review.', 'error');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            showToast('Could not connect to server.', 'error');
        }
    });
}


// --- SUPPORT FUNCTIONS ---

// Function to add item to cart (handles quantity selection)
async function addToCart(productId) {
    const customerId = localStorage.getItem('customerId');
    const quantityElement = document.getElementById('quantity');
    const quantity = quantityElement ? parseInt(quantityElement.value) : 1;

    if (!customerId) {
        showToast('Please log in to add items to your cart.');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity: quantity }),
        });
        await response.json();
        showToast(`Added ${quantity} item(s) to cart!`);
    } catch (error) {
        console.error('Error adding to cart:', error);
    }
}

// Function to add item to wishlist
async function addToWishlist(productId) {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
        showToast('Please log in to add items to your wishlist.');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/api/wishlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: customerId, productId: productId }),
        });
        const result = await response.json();
        showToast(result.message);
    } catch (error) {
        console.error('Error adding to wishlist:', error);
    }
}

// Function to display toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
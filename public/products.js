let currentPage = 1;
const productsPerPage = 10; // Define how many products per page

document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch categories first to build filters, then load initial products
    fetchCategoriesAndLoadProducts();
});

// --- MAIN LOGIC FUNCTIONS ---

// Function to fetch categories and create filter buttons, then load initial products
async function fetchCategoriesAndLoadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/categories');
        const categories = await response.json();
        const filtersContainer = document.getElementById('category-filters');

        // Ensure the container exists before proceeding
        if (!filtersContainer) {
            console.error("Category filters container not found!");
            loadProductsWithFilters(); // Load products anyway
            return;
        }

        // Add a button for each category
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.textContent = category.name;
            button.setAttribute('data-category-id', category.category_id);
            button.onclick = () => {
                // Set active class and load filtered products
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                loadProductsWithFilters(category.category_id);
            };
            filtersContainer.appendChild(button);
        });

        // Add event listener to the "All" button
        const allButton = filtersContainer.querySelector('button.category-btn'); // Find the 'All' button
        if (allButton) {
            allButton.onclick = () => {
                 document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                 allButton.classList.add('active');
                 loadProductsWithFilters(); // No category ID means load all
            };
        } else {
             console.error("Could not find the 'All' category button.");
        }

        // Now load initial products (all)
        loadProductsWithFilters();

    } catch (error) {
        console.error('Error fetching categories:', error);
        // Load products even if categories fail
        loadProductsWithFilters();
    }
}

// Function to fetch products based on current category and sort settings
async function loadProductsWithFilters(categoryId = null, page = 1) {
    displaySkeletonLoaders(productsPerPage);
    currentPage = page;

    const sortByElement = document.getElementById('sort-by');
    const sortValue = sortByElement ? sortByElement.value : 'default';
    let sortParam = '';
    let orderParam = '';

    if (sortValue !== 'default') {
        const [field, direction] = sortValue.split('_');
        sortParam = field;
        orderParam = direction;
    }

    // Determine the API endpoint
    let baseUrl = '';
    if (categoryId) {
        baseUrl = `http://localhost:3000/api/categories/${categoryId}/products`;
    } else {
        baseUrl = `http://localhost:3000/api/products`;
    }

    // Add sorting, pagination parameters
    const url = `${baseUrl}?sort=${sortParam}&order=${orderParam}&page=${currentPage}&limit=${productsPerPage}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // --- FIX IS HERE: Check if data and data.products exist ---
        if (data && Array.isArray(data.products)) {
            displayProducts(data.products);
            updatePaginationControls(data.currentPage, data.totalPages);
        } else {
            // Handle cases where the backend sent an error or unexpected format
            console.error("Received unexpected data format from server:", data);
            document.getElementById('product-list').innerHTML = '<p>Error: Could not load products properly.</p>';
            // Optionally hide pagination if data is bad
            const paginationControls = document.getElementById('pagination-controls');
            if (paginationControls) paginationControls.style.display = 'none';
        }
        // --- END OF FIX ---

    } catch (error) {
        console.error('Error fetching paginated products:', error);
        document.getElementById('product-list').innerHTML = '<p>Could not load products.</p>';
    }
}

// --- DISPLAY & INTERACTION FUNCTIONS ---

// Function to display the products on the page
// Function to display the products on the page
function displayProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = ''; // Clear previous product listings

    // Display message if no products match filters/search
    if (!products || products.length === 0) {
        productList.innerHTML = '<p>No products found matching your criteria.</p>';
        return;
    }

    // Loop through each product and create its card
    products.forEach(product => {
        // Create the link that wraps the entire card
        const productLink = document.createElement('a');
        productLink.href = `product-detail.html?id=${product.product_id}`; // Link to the detail page
        productLink.className = 'product-card-link';

        // Create the main div for the product card
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // --- Stock Display & Button Logic ---
        const isInStock = product.quantity > 0;
        // Set text based on stock status, including quantity if in stock
        const stockText = isInStock 
            ? `<span class="stock-in">In Stock (${product.quantity})</span>` 
            : '<span class="stock-out">Out of Stock</span>';
        // Add 'disabled' attribute to button if not in stock
        const buttonDisabled = !isInStock ? 'disabled' : '';
        // Set button text based on stock status
        const buttonText = isInStock ? 'Add to Cart' : 'Out of Stock';
        // ------------------------------------

        // Set the inner HTML structure of the product card
        productCard.innerHTML = `
            <img src="${product.image_url || 'images/placeholder.jpg'}" alt="${product.name}" class="product-card-image">
            <div class="product-card-header">
                <h3>${product.name}</h3>
                <button class="wishlist-btn" data-product-id="${product.product_id}">❤️</button> 
            </div>
            <p>${product.description}</p> 
            <div class="price-stock">
                 <div class="price">₹${product.mrp}</div>
                 ${stockText} 
            </div>
            <div class="action-buttons">
                <button onclick="event.stopPropagation(); addToCart(${product.product_id})" ${buttonDisabled}>${buttonText}</button>
            </div>
        `;
        
        // Append the card to the link, and the link to the main product list
        productLink.appendChild(productCard);
        productList.appendChild(productLink);
    });

    // --- Add Event Listener block for wishlist buttons ---
    // Find all the wishlist buttons that were just created within the productList
    const wishlistButtons = productList.querySelectorAll('.wishlist-btn');
    
    // Attach a click event listener to each wishlist button
    wishlistButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the click from triggering the link around the card
            event.preventDefault(); // Prevent any default link behavior
            
            // Get the product ID stored in the button's data attribute
            const productId = button.getAttribute('data-product-id');
            // Check if a valid product ID was retrieved
            if (productId) {
                addToWishlist(productId); // Call the function to add the item to the wishlist
            } else {
                // Log an error if the product ID is missing
                console.error("Product ID not found on wishlist button.");
            }
        });
    });
    // --- END OF Event Listener block ---

} // End of displayProducts function

// --- PAGINATION FUNCTIONS ---

function updatePaginationControls(page, totalPages) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    // Ensure elements exist before updating
    if (!pageInfo || !prevBtn || !nextBtn) {
        console.error("Pagination control elements not found!");
        return;
    }

    pageInfo.textContent = `Page ${page} of ${totalPages}`;

    // Previous button logic
    prevBtn.disabled = (page <= 1);
    prevBtn.onclick = () => {
        if (page > 1) {
            const activeCategoryBtn = document.querySelector('.category-btn.active');
            const categoryId = activeCategoryBtn?.getAttribute('data-category-id');
            loadProductsWithFilters(categoryId, currentPage - 1);
        }
    };

    // Next button logic
    nextBtn.disabled = (page >= totalPages);
    nextBtn.onclick = () => {
        if (page < totalPages) {
             const activeCategoryBtn = document.querySelector('.category-btn.active');
             const categoryId = activeCategoryBtn?.getAttribute('data-category-id');
            loadProductsWithFilters(categoryId, currentPage + 1);
        }
    };
}


// --- SUPPORT FUNCTIONS ---

async function addToCart(productId) {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
        showToast('Please log in to add items to your cart.');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity: 1 }),
        });
        await response.json();
        showToast('Item added to cart!');
    } catch (error) {
        console.error('Error adding to cart:', error);
    }
}

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

function displaySkeletonLoaders(count) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        productList.appendChild(skeleton);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace("show", "").replace(type, ""); }, 3000);
}
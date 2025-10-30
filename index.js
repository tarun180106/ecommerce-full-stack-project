// index.js
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // <-- ADD THIS LINE
const dotenv = require('dotenv');
dotenv.config();
const db = require('./database');
console.log('My JWT Secret is:', process.env.JWT_SECRET); 
console.log('DB_USER is:', process.env.DB_USER);
const app = express();
app.get('/test', (req, res) => {
    res.send('Hello, the server is working!');
});
app.use(express.static('public')); 

// Middleware for handling JSON data
app.use(express.json());
app.use(cors());
const PORT = 3000;


// --- API ROUTES ---

// 1. User Registration Route
// in index.js
app.post('/api/register', async (req, res) => {
    try {
        // Get the adminCode from the request body
        const { name, email, password, phone, adminCode } = req.body; 

        if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password required.' });

        const [userExists] = await db.query('SELECT email FROM Customers WHERE email = ?', [email]);
        if (userExists.length > 0) return res.status(409).json({ message: 'Email already in use.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // --- Determine Role based on Admin Code ---
        let userRole = 'user'; // Default role
        if (adminCode && adminCode === process.env.ADMIN_SECRET_CODE) {
            userRole = 'admin';
            console.log(`Admin user created: ${email}`); // Log admin creation
        }
        // ------------------------------------------

        const [newUser] = await db.query(
            'INSERT INTO Customers (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', 
            [name, email, hashedPassword, phone, userRole] // Save the role
        );
        const newCustomerId = newUser.insertId;

        await db.query('INSERT INTO Carts (customer_id) VALUES (?)', [newCustomerId]);
        await db.query('INSERT INTO Wishlists (customer_id) VALUES (?)', [newCustomerId]);

        res.status(201).json({ message: `User registered successfully as ${userRole}!`, customerId: newCustomerId });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// --- NEW API ROUTES ---

// 2. Get All Products Route
// in index.js
// in index.js
// in index.js
// in index.js
app.get('/api/products', async (req, res) => {
    try {
        const { sort, order, page = 1, limit = 10 } = req.query; 

        let orderBy = 'product_id';
        let sortDirection = 'ASC';

        if (sort === 'mrp') orderBy = 'mrp';
        if (sort === 'name') orderBy = 'name';
        if (order === 'desc') sortDirection = 'DESC';

        const offset = (page - 1) * limit;

        const productQuery = `
            SELECT * FROM Products 
            ORDER BY ${orderBy} ${sortDirection}
            LIMIT ? OFFSET ? 
        `;
        const [products] = await db.query(productQuery, [parseInt(limit), parseInt(offset)]);

        const countQuery = 'SELECT COUNT(*) AS totalProducts FROM Products';
        const [countResult] = await db.query(countQuery);
        const totalProducts = countResult[0].totalProducts;

        // --- THIS MUST SEND THE OBJECT ---
        res.status(200).json({
            products: products,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts: totalProducts
        });
        // --------------------------------

    } catch (error) {
        console.error('Error fetching paginated products:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
// 3. Add to Cart Route
// in index.js
app.post('/api/cart/add', async (req, res) => {
    try {
        const { customer_id, product_id, quantity } = req.body;
        
        // --- STOCK CHECK ---
        const [productStock] = await db.query('SELECT quantity FROM Products WHERE product_id = ?', [product_id]);
        if (productStock.length === 0 || productStock[0].quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock available.' });
        }
        // --- END STOCK CHECK ---

        const [cartData] = await db.query('SELECT cart_id FROM Carts WHERE customer_id = ?', [customer_id]);
        if (cartData.length === 0) return res.status(404).json({ message: 'Cart not found.' });
        const cart_id = cartData[0].cart_id;
        
        const [existingItems] = await db.query('SELECT quantity FROM Cart_Items WHERE cart_id = ? AND product_id = ?', [cart_id, product_id]);
        
        // --- MORE STOCK CHECK (for existing cart items) ---
        let currentCartQuantity = existingItems.length > 0 ? existingItems[0].quantity : 0;
        if (productStock[0].quantity < currentCartQuantity + quantity) {
             return res.status(400).json({ message: 'Insufficient stock to add desired quantity.' });
        }
        // --- END STOCK CHECK ---

        if (existingItems.length > 0) {
            await db.query('UPDATE Cart_Items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?', [quantity, cart_id, product_id]);
        } else {
            await db.query('INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cart_id, product_id, quantity]);
        }
        res.status(200).json({ message: 'Item added/updated in cart!' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// 4. Get Cart Items for a specific customer
app.get('/api/cart/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params; // Get customer ID from the URL

        const query = `
            SELECT 
                p.product_id,
                p.name,
                p.mrp,
                p.image_url,
                ci.quantity
            FROM Cart_Items ci
            JOIN Products p ON ci.product_id = p.product_id
            JOIN Carts c ON ci.cart_id = c.cart_id
            WHERE c.customer_id = ?;
        `;

        const [cartItems] = await db.query(query, [customerId]);

        if (cartItems.length > 0) {
            res.status(200).json(cartItems);
        } else {
            res.status(200).json([]); // Send empty array if cart is empty
        }

    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ message: 'Server error fetching cart items.' });
    }
});
// 5. User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        // Find the user by email
        const [users] = await db.query('SELECT * FROM Customers WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // User not found
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Password incorrect
        }

        // If credentials are correct, create a JWT
        const token = jwt.sign(
            { customerId: user.customer_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Send the token and user info back to the client
        res.status(200).json({
            message: 'Logged in successfully!',
            token: token,
            customerId: user.customer_id,
            role: user.role
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// 6. Remove item from cart
app.delete('/api/cart/item/:productId', async (req, res) => {
    try {
        const { productId } = req.params; // Get product ID from the URL
        const { customer_id } = req.body; // Get customer ID from the request body

        if (!customer_id) {
            return res.status(400).json({ message: 'Customer ID is required.' });
        }

        // Find the user's cart_id
        const [cartData] = await db.query('SELECT cart_id FROM Carts WHERE customer_id = ?', [customer_id]);
        if (cartData.length === 0) {
            return res.status(404).json({ message: 'Cart not found for this customer.' });
        }
        const cart_id = cartData[0].cart_id;

        // Delete the item from the Cart_Items table
        const [result] = await db.query(
            'DELETE FROM Cart_Items WHERE cart_id = ? AND product_id = ?',
            [cart_id, productId]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Item removed from cart successfully!' });
        } else {
            res.status(404).json({ message: 'Item not found in cart.' });
        }

    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ message: 'Server error removing item from cart.' });
    }
});

// index.js

// ... (keep all your existing code and routes)


// --- NEW API ROUTE ---

// 7. Checkout (Create an Order from Cart)
// Function to generate a simple unique tracking number
// Function to generate a simple unique tracking number (Keep this function)
function generateTrackingNumber() {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(10000 + Math.random() * 90000);
    return `MYECOM-${year}-${random}`;
}

// in index.js
app.post('/api/checkout', async (req, res) => {
    try {
        const { customerId, addressId } = req.body; 
        if (!customerId || !addressId) return res.status(400).json({ message: 'Customer and Address ID required.' });

        const [cartData] = await db.query('SELECT cart_id FROM Carts WHERE customer_id = ?', [customerId]);
        const cart_id = cartData[0].cart_id;

        // Fetch items AND check stock again before final order
        const getCartItemsQuery = `SELECT ci.product_id, ci.quantity, p.mrp, p.quantity AS stock_quantity FROM Cart_Items ci JOIN Products p ON ci.product_id = p.product_id WHERE ci.cart_id = ?;`;
        const [cartItems] = await db.query(getCartItemsQuery, [cart_id]);
        if (cartItems.length === 0) return res.status(400).json({ message: 'Cart is empty.' });
        
        // Verify stock one last time
        for (const item of cartItems) {
            if (item.stock_quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for item ID ${item.product_id}. Available: ${item.stock_quantity}` });
            }
        }
        
        const totalAmount = cartItems.reduce((total, item) => total + (item.mrp * item.quantity), 0);
        const tracking_number = generateTrackingNumber();

        // Create Order
        const [newOrder] = await db.query('INSERT INTO Orders (customer_id, total_amount, tracking_number, address_id) VALUES (?, ?, ?, ?)', [customerId, totalAmount, tracking_number, addressId]);
        const newOrderId = newOrder.insertId;

        // Move items to Order_Items
        const orderItemsValues = cartItems.map(item => [newOrderId, item.product_id, item.quantity, item.mrp]);
        await db.query('INSERT INTO Order_Items (order_id, product_id, quantity, price_per_item) VALUES ?', [orderItemsValues]);
        
        // --- DECREASE STOCK ---
        for (const item of cartItems) {
            await db.query('UPDATE Products SET quantity = quantity - ? WHERE product_id = ?', [item.quantity, item.product_id]);
        }
        // --- END DECREASE STOCK ---

        // Clear Cart
        await db.query('DELETE FROM Cart_Items WHERE cart_id = ?', [cart_id]);

        res.status(201).json({ message: 'Order placed successfully!', orderId: newOrderId });
    } catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ message: 'Server error during checkout.' });
    }
});
// index.js

// ... (keep all your existing code and routes)


// --- WISHLIST API ROUTES ---

// 8. Add an item to the wishlist
app.post('/api/wishlist/add', async (req, res) => {
    try {
        const { customerId, productId } = req.body;
        if (!customerId || !productId) {
            return res.status(400).json({ message: 'Customer and Product IDs are required.' });
        }

        const [wishlistData] = await db.query('SELECT wishlist_id FROM Wishlists WHERE customer_id = ?', [customerId]);
        if (wishlistData.length === 0) {
            return res.status(404).json({ message: 'Wishlist not found for this customer.' });
        }
        const wishlist_id = wishlistData[0].wishlist_id;

        // Add the item to the Wishlist_Items table
        await db.query(
            'INSERT INTO Wishlist_Items (wishlist_id, product_id) VALUES (?, ?)',
            [wishlist_id, productId]
        );

        res.status(200).json({ message: 'Item added to wishlist successfully!' });
    } catch (error) {
        // Handle potential duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Item is already in your wishlist.' });
        }
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error adding item to wishlist.' });
    }
});

// 9. Get all items from a user's wishlist
app.get('/api/wishlist/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        // --- DEBUG LINE 1 ---
        console.log(`--- Fetching wishlist for customerId: ${customerId} ---`);

        const query = `
            SELECT 
                p.product_id, p.name, p.description, p.mrp,p.image_url
            FROM Wishlist_Items AS wi
            JOIN Products AS p ON wi.product_id = p.product_id
            JOIN Wishlists AS w ON wi.wishlist_id = w.wishlist_id
            WHERE w.customer_id = ?;
        `;

        const [wishlistItems] = await db.query(query, [customerId]);

        // --- DEBUG LINE 2 ---
        console.log('--- Database query returned: ---');
        console.log(wishlistItems);
        console.log('---------------------------------');

        res.status(200).json(wishlistItems);

    } catch (error) {
        console.error('Error fetching wishlist items:', error);
        res.status(500).json({ message: 'Server error fetching wishlist items.' });
    }
});

// 10. Remove an item from the wishlist
app.delete('/api/wishlist/item/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { customerId } = req.body;

        const [wishlistData] = await db.query('SELECT wishlist_id FROM Wishlists WHERE customer_id = ?', [customerId]);
        if (wishlistData.length === 0) {
            return res.status(404).json({ message: 'Wishlist not found.' });
        }
        const wishlist_id = wishlistData[0].wishlist_id;

        await db.query(
            'DELETE FROM Wishlist_Items WHERE wishlist_id = ? AND product_id = ?',
            [wishlist_id, productId]
        );
        res.status(200).json({ message: 'Item removed from wishlist.' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// 11. Get a single product by its ID
// in index.js
app.get('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        // --- UPDATED QUERY TO INCLUDE CATEGORY INFO ---
        const query = `
            SELECT p.*, c.category_id, c.name AS category_name 
            FROM Products p
            LEFT JOIN ProductCategory pc ON p.product_id = pc.product_id
            LEFT JOIN Categories c ON pc.category_id = c.category_id
            WHERE p.product_id = ?
            LIMIT 1; -- Ensure only one category is fetched if product is in multiple
        `;
        // ---------------------------------------------

        const [products] = await db.query(query, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json(products[0]); // Send the single product object

    } catch (error) {
        console.error('Error fetching single product:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// 12. Get all orders for a specific customer
app.get('/api/orders/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        // Query to get all orders AND JOIN with the Addresses table
        const [orders] = await db.query(
            `SELECT 
                o.order_id, o.order_date, o.total_amount, o.status, o.tracking_number,
                a.street_no, a.city, a.state, a.zip_code
             FROM Orders o
             LEFT JOIN Addresses a ON o.address_id = a.address_id
             WHERE o.customer_id = ? 
             ORDER BY o.order_date DESC`,
            [customerId]
        );

        if (orders.length === 0) return res.status(200).json([]);

        // For each order, fetch its items
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const [items] = await db.query(
                `SELECT p.product_id, p.name, p.image_url, oi.quantity, oi.price_per_item 
                 FROM Order_Items oi JOIN Products p ON oi.product_id = p.product_id 
                 WHERE oi.order_id = ?`,
                [order.order_id]
            );
            return { ...order, items };
        }));

        res.status(200).json(ordersWithItems);

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
// in index.js

// --- NEW API ROUTES for Reviews ---

// 16. Get all reviews for a specific product
app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
        const { productId } = req.params;
        const query = `
            SELECT r.rating, r.comment, c.name AS customer_name, r.created_at
            FROM Reviews r
            JOIN Customers c ON r.customer_id = c.customer_id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC;
        `;
        const [reviews] = await db.query(query, [productId]);
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// 17. Post a new review for a product
app.post('/api/products/:productId/reviews', async (req, res) => {
    try {
        const { productId } = req.params;
        const { customerId, rating, comment } = req.body;

        if (!customerId || !rating) {
            return res.status(400).json({ message: 'Customer ID and rating are required.' });
        }

        const query = 'INSERT INTO Reviews (product_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)';
        await db.query(query, [productId, customerId, rating, comment]);

        res.status(201).json({ message: 'Review posted successfully!' });
    } catch (error) {
        console.error('Error posting review:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js after your require statements

const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const customerId = decoded.customerId;

        const [users] = await db.query('SELECT role FROM Customers WHERE customer_id = ?', [customerId]);
        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        next(); // If user is an admin, proceed to the next function
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

// in index.js, add this to your API routes section

// --- ADMIN API ROUTES ---

// 18. (Admin) Delete a product
app.delete('/api/admin/products/:productId', isAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        await db.query('DELETE FROM Products WHERE product_id = ?', [productId]);
        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js inside the ADMIN API ROUTES section

// 19. (Admin) Create a new product
app.post('/api/admin/products', isAdmin, async (req, res) => {
    try {
        // Add quantity to destructuring
        const { name, description, detailed_description, mrp, image_url, seller_id, quantity } = req.body; 
        if (!name || !mrp) return res.status(400).json({ message: 'Name and MRP required.' });

        // Add quantity to query and parameters
        const query = 'INSERT INTO Products (name, description, detailed_description, mrp, image_url, seller_id, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'; 
        const [newProduct] = await db.query(query, [name, description, detailed_description, mrp, image_url, seller_id || 1, quantity || 0]); 
        res.status(201).json({ message: 'Product created!', productId: newProduct.insertId });
    } catch (error) { /* ... error handling ... */
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error.' });
     }
});

// in index.js, inside the ADMIN API ROUTES section

// 20. (Admin) Update an existing product
app.put('/api/admin/products/:productId', isAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        // Add quantity to destructuring
        const { name, description, detailed_description, mrp, image_url, quantity } = req.body; 
        if (!name || !mrp) return res.status(400).json({ message: 'Name and MRP required.' });

        // Add quantity to query and parameters
        const query = `
            UPDATE Products 
            SET name = ?, description = ?, detailed_description = ?, mrp = ?, image_url = ?, quantity = ? 
            WHERE product_id = ?
        `;
        await db.query(query, [name, description, detailed_description, mrp, image_url, quantity, productId]); 
        res.status(200).json({ message: 'Product updated!' });
    } catch (error) { /* ... error handling ... */
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error.' });
     }
});

// in index.js, add to ADMIN API ROUTES

// (Admin) Get all registered users
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        // Select necessary user info, excluding password
        const query = 'SELECT customer_id, name, email, phone, dob, loyalty_points, created_at, role FROM Customers ORDER BY created_at DESC';
        const [users] = await db.query(query);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js

app.get('/api/cart/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        const query = `
            SELECT 
                p.product_id, 
                p.name, 
                p.mrp, 
                p.image_url, -- This was the missing part
                ci.quantity
            FROM Cart_Items ci
            JOIN Products p ON ci.product_id = p.product_id
            JOIN Carts c ON ci.cart_id = c.cart_id
            WHERE c.customer_id = ?;
        `;
        const [cartItems] = await db.query(query, [customerId]);
        res.status(200).json(cartItems);

    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});
// in index.js, add this to your API routes

// 18. Update item quantity in cart
app.put('/api/cart/item/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { customerId, quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1.' });
        }

        const [cartData] = await db.query('SELECT cart_id FROM Carts WHERE customer_id = ?', [customerId]);
        if (cartData.length === 0) {
            return res.status(404).json({ message: 'Cart not found.' });
        }
        const cart_id = cartData[0].cart_id;

        const query = 'UPDATE Cart_Items SET quantity = ? WHERE cart_id = ? AND product_id = ?';
        await db.query(query, [quantity, cart_id, productId]);

        res.status(200).json({ message: 'Quantity updated.' });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js, add this to your API routes section

// 23. Get order details by tracking number
app.get('/api/track/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const [orders] = await db.query(
            'SELECT order_id, customer_id, order_date, total_amount, status, tracking_number FROM Orders WHERE tracking_number = ?',
            [trackingNumber]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Tracking number not found.' });
        }
        
        const order = orders[0];

        // Fetch order items for display (same logic as order history)
        const [items] = await db.query(
            `SELECT p.name, p.image_url, oi.quantity, oi.price_per_item 
             FROM Order_Items oi JOIN Products p ON oi.product_id = p.product_id 
             WHERE oi.order_id = ?`,
            [order.order_id]
        );

        res.status(200).json({ ...order, items });

    } catch (error) {
        console.error('Error fetching tracking info:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js, add this to your API routes section

// 24. Get all addresses for a specific customer
app.get('/api/addresses/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const [addresses] = await db.query('SELECT address_id, street_no, city, state, zip_code FROM Addresses WHERE customer_id = ?', [customerId]);
        
        // If the user has no addresses, send an empty array
        res.status(200).json(addresses || []);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ message: 'Server error fetching addresses.' });
    }
});

// in index.js, add this to your API routes section

// 25. Save a new address for a customer
app.post('/api/addresses', async (req, res) => {
    try {
        const { customerId, street_no, city, state, zip_code } = req.body;
        
        if (!customerId || !street_no || !city || !state || !zip_code) {
            return res.status(400).json({ message: 'All address fields are required.' });
        }

        const query = `
            INSERT INTO Addresses (customer_id, street_no, city, state, zip_code)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [customerId, street_no, city, state, zip_code]);

        res.status(201).json({ 
            message: 'Address saved successfully!', 
            addressId: result.insertId 
        });

    } catch (error) {
        console.error('Error saving new address:', error);
        res.status(500).json({ message: 'Server error saving address.' });
    }
});

// in index.js, this route fetches order details by tracking number
app.get('/api/track/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const [orders] = await db.query(
            'SELECT order_id, customer_id, order_date, total_amount, status, tracking_number FROM Orders WHERE tracking_number = ?',
            [trackingNumber]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Tracking number not found.' });
        }
        
        const order = orders[0];

        // Fetch order items for display (optional, but good detail)
        const [items] = await db.query(
            `SELECT p.name, p.image_url, oi.quantity, oi.price_per_item 
             FROM Order_Items oi JOIN Products p ON oi.product_id = p.product_id 
             WHERE oi.order_id = ?`,
            [order.order_id]
        );

        res.status(200).json({ ...order, items });

    } catch (error) {
        console.error('Error fetching tracking info:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// in index.js, add these to your API routes section

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM Categories ORDER BY name');
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Get all products in a specific category (respecting sort order)
// in index.js
app.get('/api/categories/:categoryId/products', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { sort, order, page = 1, limit = 10 } = req.query; // Add page and limit

        let orderBy = 'p.product_id';
        let sortDirection = 'ASC';

        if (sort === 'mrp') orderBy = 'p.mrp';
        if (sort === 'name') orderBy = 'p.name';
        if (order === 'desc') sortDirection = 'DESC';

        // Calculate offset
        const offset = (page - 1) * limit;

        // Query to get products for the current page within the category
        const productQuery = `
            SELECT p.* FROM Products p
            JOIN ProductCategory pc ON p.product_id = pc.product_id
            WHERE pc.category_id = ?
            ORDER BY ${orderBy} ${sortDirection}
            LIMIT ? OFFSET ?;
        `;
        const [products] = await db.query(productQuery, [categoryId, parseInt(limit), parseInt(offset)]);

        // Query to count total products within this category
        const countQuery = `
            SELECT COUNT(*) AS totalProducts FROM Products p
            JOIN ProductCategory pc ON p.product_id = pc.product_id
            WHERE pc.category_id = ?;
        `;
        const [countResult] = await db.query(countQuery, [categoryId]);
        const totalProducts = countResult[0].totalProducts;

        // --- FIX IS HERE: Send the object structure ---
        res.status(200).json({
            products: products,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts: totalProducts
        });
        // --- END OF FIX ---

    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// (Admin) Get all orders
app.get('/api/admin/orders', isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT o.order_id, o.customer_id, o.order_date, o.total_amount, o.status, c.name AS customer_name
            FROM Orders o JOIN Customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_date DESC;
        `;
        const [orders] = await db.query(query);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// (Admin) Update an order status
app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const validStatuses = ['Order Placed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }
        await db.query('UPDATE Orders SET status = ? WHERE order_id = ?', [status, orderId]);
        res.status(200).json({ message: 'Order status updated.' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// ... (keep your app.listen at the bottom)






// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
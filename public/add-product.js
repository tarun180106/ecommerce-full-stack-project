document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in as an admin.');
        return;
    }

    const product = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        detailed_description: document.getElementById('detailed_description').value,
        mrp: document.getElementById('mrp').value,
        image_url: document.getElementById('image_url').value,
        seller_id: document.getElementById('seller_id').value,
        quantity: document.getElementById('quantity').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/admin/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Send the admin token
            },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            alert('Product added successfully!');
            window.location.href = 'admin.html'; // Redirect to dashboard
        } else {
            const result = await response.json();
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error adding product:', error);
    }
});
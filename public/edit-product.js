document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const token = localStorage.getItem('token');
    
    if (!productId) {
        alert('No product ID found!');
        window.location.href = 'admin.html';
        return;
    }

    if (!token) {
        alert('You must be logged in as an admin.');
        window.location.href = 'login.html';
        return;
    }

    // 1. Fetch the existing product data to populate the form
    fetch(`http://localhost:3000/api/products/${productId}`)
        .then(response => response.json())
        .then(product => {
            document.getElementById('name').value = product.name;
            document.getElementById('description').value = product.description;
            document.getElementById('detailed_description').value = product.detailed_description;
            document.getElementById('mrp').value = product.mrp;
            document.getElementById('image_url').value = product.image_url;
            document.getElementById('quantity').value = product.quantity;
        })
        .catch(error => console.error('Error fetching product data:', error));


    // 2. Handle the form submission to update the product
    document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedProduct = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            detailed_description: document.getElementById('detailed_description').value,
            mrp: document.getElementById('mrp').value,
            image_url: document.getElementById('image_url').value,
            quantity: document.getElementById('quantity').value
        };

        try {
            const response = await fetch(`http://localhost:3000/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Send the admin token
                },
                body: JSON.stringify(updatedProduct)
            });

            if (response.ok) {
                alert('Product updated successfully!');
                window.location.href = 'admin.html'; // Redirect back to dashboard
            } else {
                const result = await response.json();
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error updating product:', error);
        }
    });
});
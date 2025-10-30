document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
        const messageEl = document.getElementById('order-confirmation-message');
        messageEl.textContent = `Your Order ID is: #${orderId}`;
    }
});
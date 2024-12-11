// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

let products = [];
let cart = [];

// Проверим, является ли пользователь админом. 
// В реальном случае вы можете проверять это на сервере через user.id.
// Допустим, что adminIds хранит список айди админов.
const adminIds = [123456789]; 
const user = tg.initDataUnsafe.user;
const isAdmin = user && adminIds.includes(user.id);

// Загрузка товаров с сервера
async function loadProducts() {
    const response = await fetch('/api/products'); // ваш API эндпойнт
    products = await response.json();
    renderProducts();
    if (isAdmin) {
        renderAdminPanel();
        document.getElementById('admin-panel').style.display = 'block';
    }
}

function renderProducts() {
    const productContainer = document.getElementById('product-list');
    productContainer.innerHTML = '';
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <h3>${product.name}</h3>
            <p>Цена: ${product.price} руб.</p>
            <button data-id="${product.id}" class="add-to-cart">Добавить в корзину</button>
        `;
        productContainer.appendChild(div);
    });
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${item.name} - ${item.price} руб.`;
        cartItems.appendChild(li);
    });
}

function renderAdminPanel() {
    const adminProductsDiv = document.getElementById('admin-products');
    adminProductsDiv.innerHTML = '';
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'admin-product-item';
        div.innerHTML = `
            <input type="text" value="${product.name}" class="admin-name" data-id="${product.id}"/>
            <input type="number" value="${product.price}" class="admin-price" data-id="${product.id}"/>
            <button class="admin-save" data-id="${product.id}">Сохранить</button>
            <button class="admin-delete" data-id="${product.id}">Удалить</button>
        `;
        adminProductsDiv.appendChild(div);
    });
}

// Добавление в корзину
document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
        const productId = parseInt(e.target.getAttribute('data-id'), 10);
        const product = products.find(p => p.id === productId);
        if (product) {
            cart.push(product);
            renderCart();
        }
    }
});

// Оформление заказа
document.getElementById('checkout-btn').addEventListener('click', async () => {
    // Отправляем заказ боту:
    // Вариант 1: Использовать sendData для Mini App, запущенной через клавиатурную кнопку.
    // Вариант 2: Если Mini App запущена как inline, то используем answerWebAppQuery через бота.
    // Для упрощения – отправим данные на сервер, а сервер уже через Bot API уведомит админов.

    const orderData = {
        userId: user ? user.id : null,
        cart: cart
    };

    const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (result.success) {
        // После успешного заказа можно закрыть мини-приложение или показать уведомление.
        tg.showAlert("Заказ оформлен! Администратор скоро свяжется с вами.");
        cart = [];
        renderCart();
    } else {
        tg.showAlert("Не удалось оформить заказ. Попробуйте еще раз.");
    }
});

// Админская логика
if (isAdmin) {
    // Обновление товара
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('admin-save')) {
            const productId = parseInt(e.target.getAttribute('data-id'), 10);
            const nameInput = document.querySelector(`.admin-name[data-id="${productId}"]`);
            const priceInput = document.querySelector(`.admin-price[data-id="${productId}"]`);

            const updatedProduct = {
                id: productId,
                name: nameInput.value,
                price: parseFloat(priceInput.value)
            };

            const resp = await fetch('/api/products/' + productId, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updatedProduct)
            });
            const data = await resp.json();
            if (data.success) {
                await loadProducts();
            } else {
                tg.showAlert("Ошибка при сохранении!");
            }
        }

        // Удаление товара
        if (e.target.classList.contains('admin-delete')) {
            const productId = parseInt(e.target.getAttribute('data-id'), 10);
            const resp = await fetch('/api/products/' + productId, {
                method: 'DELETE'
            });
            const data = await resp.json();
            if (data.success) {
                await loadProducts();
            } else {
                tg.showAlert("Ошибка при удалении!");
            }
        }
    });

    // Добавление нового товара
    document.getElementById('new-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-product-name').value.trim();
        const price = parseFloat(document.getElementById('new-product-price').value);

        const resp = await fetch('/api/products', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, price})
        });
        const data = await resp.json();
        if (data.success) {
            document.getElementById('new-product-name').value = '';
            document.getElementById('new-product-price').value = '';
            await loadProducts();
        } else {
            tg.showAlert("Ошибка при добавлении товара!");
        }
    });
}

// Загрузка данных при старте
loadProducts();

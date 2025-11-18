// Configuration - Auto-detect API base URL
const API_BASE = window.location.origin + "/api";

// Global variables
let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let authToken = localStorage.getItem("authToken");
let allProducts = [];
let cart = {
    items: [],
    total: 0,
    itemCount: 0
};

// Initialize the app
document.addEventListener("DOMContentLoaded", function() {
    console.log("🏠 Frontend loaded");
    console.log("👤 Current user:", currentUser);
    console.log("🌐 API Base:", API_BASE);
    
    updateNavigation();
    loadPageContent();
    testBackendConnection();
    loadCart(); // Load cart on startup
});

// Test backend connection
async function testBackendConnection() {
    try {
        console.log("🔍 Testing backend connection...");
        const response = await fetch(`${API_BASE}/test`);
        const result = await response.json();
        console.log("✅ Backend connection:", response.ok ? "SUCCESS" : "FAILED", result.message);
        console.log("🌍 Environment:", result.environment);
        return response.ok;
    } catch (error) {
        console.log("❌ Backend connection failed:", error.message);
        console.log("💡 Make sure backend is running on", API_BASE);
        return false;
    }
}

// Health check function
async function checkHealth() {
    try {
        const response = await fetch('/health');
        const result = await response.json();
        console.log('🏥 Health check:', result.status);
        return result.status === 'OK';
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return false;
    }
}

// Navigation
function updateNavigation() {
    const loginLink = document.getElementById("login-link");
    const userGreeting = document.getElementById("user-greeting");
    const logoutBtn = document.getElementById("logout-btn");
    const cartCountElements = document.querySelectorAll(".cart-count");
    const adminLink = document.querySelector('a[href="admin.html"]');

    if (currentUser) {
        if (loginLink) loginLink.style.display = "none";
        if (userGreeting) {
            userGreeting.style.display = "inline";
            userGreeting.textContent = `Hello, ${currentUser.name}`;
        }
        if (logoutBtn) {
            logoutBtn.style.display = "inline-block";
            logoutBtn.onclick = logout;
        }
        
        // Show/hide admin link based on role
        if (adminLink) {
            if (currentUser.role === 'admin') {
                adminLink.style.display = 'inline';
            } else {
                adminLink.style.display = 'none';
            }
        }
        
        // Update cart count in navigation - only for regular users
        cartCountElements.forEach(element => {
            if (currentUser.role === 'user') {
                element.textContent = cart.itemCount || 0;
                element.style.display = cart.itemCount > 0 ? "inline" : "none";
            } else {
                element.style.display = "none"; // Hide cart count for admin
            }
        });
    } else {
        if (loginLink) loginLink.style.display = "inline";
        if (userGreeting) userGreeting.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        
        // Hide cart count when not logged in
        cartCountElements.forEach(element => {
            element.style.display = "none";
        });
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    currentUser = null;
    authToken = null;
    cart = { items: [], total: 0, itemCount: 0 };
    updateNavigation();
    window.location.href = "index.html";
}

// Login functionality
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const loginMessage = document.getElementById("login-message");
        const loginButton = document.querySelector('#login-form button[type="submit"]');
        
        console.log("🔐 Login attempt:", email);
        
        // Disable button and show loading
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }
        loginMessage.textContent = "Logging in...";
        loginMessage.className = "loading";
        
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    email: email, 
                    password: password 
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const result = await response.json();
            
            if (response.ok) {
                // Login successful
                currentUser = result.user;
                authToken = result.token;
                
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
                localStorage.setItem("authToken", authToken);
                
                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.className = "success";
                
                console.log("✅ Login successful as:", currentUser.role);
                
                // Load cart after login (only for regular users)
                if (currentUser.role === 'user') {
                    await loadCart();
                }
                
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
                
            } else {
                // Login failed
                loginMessage.textContent = result.error || "Login failed";
                loginMessage.className = "error";
                console.log("❌ Login failed:", result.error);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                loginMessage.textContent = "Login timeout - server is not responding";
            } else if (error.message.includes("Failed to fetch")) {
                loginMessage.textContent = "Cannot connect to server. Please check if backend is running.";
            } else {
                loginMessage.textContent = "Login error: " + error.message;
            }
            loginMessage.className = "error";
            console.error("❌ Login error:", error);
        } finally {
            // Re-enable button
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });
}

// Registration functionality
const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            age: parseInt(document.getElementById("age").value),
            address: document.getElementById("address").value,
            phone: document.getElementById("phone").value
        };
        
        const registerMessage = document.getElementById("register-message");
        const registerButton = document.querySelector('#register-form button[type="submit"]');
        
        registerMessage.textContent = "Creating account...";
        registerMessage.className = "loading";
        
        if (registerButton) {
            registerButton.disabled = true;
            registerButton.textContent = "Creating...";
        }
        
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                registerMessage.textContent = "Registration successful! Redirecting to login...";
                registerMessage.className = "success";
                
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 2000);
            } else {
                registerMessage.textContent = result.error || "Registration failed";
                registerMessage.className = "error";
            }
        } catch (error) {
            registerMessage.textContent = "Network error. Please try again.";
            registerMessage.className = "error";
        } finally {
            if (registerButton) {
                registerButton.disabled = false;
                registerButton.textContent = "Register";
            }
        }
    });
}

// Product Management
async function loadPageContent() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";
    
    console.log(`📄 Loading page: ${page}`);
    
    if (page === "index.html" || page === "") {
        await loadFeaturedProducts();
    } else if (page === "products.html") {
        await loadAllProducts();
        setupSearch();
    } else if (page === "admin.html") {
        if (!currentUser || currentUser.role !== "admin") {
            alert("Admin access required. Please login as admin.");
            window.location.href = "login.html";
            return;
        }
        await loadAdminProducts();
    } else if (page === "cart.html") {
        if (!currentUser) {
            window.location.href = "login.html";
            return;
        }
        if (currentUser.role === 'admin') {
            alert("Admins cannot access the shopping cart. Please login as a regular user.");
            window.location.href = "index.html";
            return;
        }
        await loadCartPage();
    }
    // About and Contact pages don't need special JavaScript
}

async function loadFeaturedProducts() {
    const container = document.getElementById("featured-products");
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        const result = await response.json();
        
        if (result.products && result.products.length > 0) {
            // Take first 4 products for featured section
            const featuredProducts = result.products.slice(0, 4);
            displayProducts(featuredProducts, container);
        } else {
            container.innerHTML = "<p>No products available</p>";
        }
    } catch (error) {
        container.innerHTML = "<p>Error loading products</p>";
    }
}

async function loadAllProducts() {
    const container = document.getElementById("products-list");
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        const result = await response.json();
        
        if (result.products && result.products.length > 0) {
            allProducts = result.products;
            displayProducts(allProducts, container);
        } else {
            container.innerHTML = "<p>No products available</p>";
        }
    } catch (error) {
        container.innerHTML = "<p>Error loading products</p>";
    }
}

async function loadAdminProducts() {
    const container = document.getElementById("admin-products-list");
    if (!container) return;
    
    try {
        // Use the public products API (no auth required for listing)
        const response = await fetch(`${API_BASE}/products`);
        const result = await response.json();
        
        if (result.products && result.products.length > 0) {
            displayAdminProducts(result.products, container);
        } else {
            container.innerHTML = "<p>No products available. Add your first product!</p>";
        }
    } catch (error) {
        container.innerHTML = "<p>Error loading products</p>";
        showNotification("Error loading products: " + error.message, "error");
    }
}

function displayProducts(productsArray, container) {
    if (!productsArray || productsArray.length === 0) {
        container.innerHTML = "<p>No products found</p>";
        return;
    }
    
    container.innerHTML = productsArray.map(product => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        const canAddToCart = currentUser && currentUser.role === 'user';
        
        return `
        <div class="product-card">
            <img src="${product.image || "https://via.placeholder.com/300x200?text=No+Image"}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-category">${product.category}</div>
            <div class="product-price">$${product.price}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
            ${canAddToCart ? `
                <button onclick="addToCart('${product._id}')" class="btn" ${product.stock === 0 ? "disabled" : ""}>
                    ${product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                </button>
            ` : isAdmin ? `
                <button class="btn" disabled>Admin View Only</button>
            ` : `
                <button onclick="requestLogin()" class="btn">Login to Purchase</button>
            `}
        </div>
    `}).join("");
}

function displayAdminProducts(productsArray, container) {
    if (!productsArray || productsArray.length === 0) {
        container.innerHTML = "<p>No products available. Add your first product!</p>";
        return;
    }
    
    container.innerHTML = productsArray.map(product => `
        <div class="admin-product-card">
            <div class="admin-product-header">
                <div class="admin-product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-details">
                        <span class="product-price">$${product.price}</span>
                        <span class="product-category">${product.category}</span>
                        <span class="product-stock">Stock: ${product.stock}</span>
                    </div>
                </div>
                <div class="admin-product-actions">
                    <button onclick="editProduct('${product._id}')" class="btn btn-small">Edit</button>
                    <button onclick="deleteProduct('${product._id}')" class="btn btn-small btn-danger">Delete</button>
                </div>
            </div>
            ${product.image ? `<img src="${product.image}" alt="${product.name}" class="admin-product-image" onerror="this.style.display='none'">` : ''}
        </div>
    `).join("");
}

function requestLogin() {
    if (!currentUser) {
        alert("Please login to add items to cart");
        window.location.href = "login.html";
    }
}

// Search and Filter
function setupSearch() {
    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");
    
    if (searchInput) {
        searchInput.addEventListener("input", filterProducts);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener("change", filterProducts);
    }
}

function filterProducts() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const category = document.getElementById("category-filter").value;
    
    if (!allProducts || allProducts.length === 0) return;
    
    let filtered = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            (product.description && product.description.toLowerCase().includes(searchTerm));
        const matchesCategory = !category || product.category === category;
        return matchesSearch && matchesCategory;
    });
    
    const container = document.getElementById("products-list");
    displayProducts(filtered, container);
}

// Admin Functions
function showAddProductForm() {
    document.getElementById("add-product-form").style.display = "block";
}

function hideAddProductForm() {
    document.getElementById("add-product-form").style.display = "none";
    document.getElementById("product-form").reset();
    
    // Reset form handler to add mode
    const form = document.getElementById("product-form");
    form.onsubmit = handleProductSubmit;
    
    // Update button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = "Add Product";
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    // Check authentication first
    if (!authToken) {
        showNotification("Please login as admin first", "error");
        window.location.href = "login.html";
        return;
    }
    
    const productData = {
        name: document.getElementById("product-name").value,
        description: document.getElementById("product-desc").value,
        price: parseFloat(document.getElementById("product-price").value),
        category: document.getElementById("product-category").value,
        stock: parseInt(document.getElementById("product-stock").value),
        image: document.getElementById("product-image").value || "https://via.placeholder.com/300x200?text=Product+Image"
    };
    
    const submitBtn = document.querySelector('#product-form button[type="submit"]');
    
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";
        }
        
        const response = await fetch(`${API_BASE}/admin/products`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            const result = await response.json();
            hideAddProductForm();
            await loadAdminProducts();
            showNotification("Product added successfully!", "success");
        } else {
            const result = await response.json();
            showNotification("Error: " + (result.error || "Failed to add product"), "error");
        }
    } catch (error) {
        showNotification("Error adding product: " + error.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.textContent.includes("Update") ? "Update Product" : "Add Product";
        }
    }
}

// Initialize product form
const productForm = document.getElementById("product-form");
if (productForm) {
    productForm.addEventListener("submit", handleProductSubmit);
}

async function deleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }
    
    // Check authentication first
    if (!authToken) {
        showNotification("Please login as admin first", "error");
        window.location.href = "login.html";
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            await loadAdminProducts();
            showNotification("Product deleted successfully!", "success");
        } else {
            const result = await response.json();
            showNotification("Error: " + (result.error || "Failed to delete product"), "error");
        }
    } catch (error) {
        showNotification("Error deleting product: " + error.message, "error");
    }
}

async function editProduct(productId) {
    // Check authentication first
    if (!authToken) {
        showNotification("Please login as admin first", "error");
        window.location.href = "login.html";
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }
        const product = await response.json();
        
        // Fill form with product data
        document.getElementById("product-name").value = product.name;
        document.getElementById("product-desc").value = product.description;
        document.getElementById("product-price").value = product.price;
        document.getElementById("product-category").value = product.category;
        document.getElementById("product-stock").value = product.stock;
        document.getElementById("product-image").value = product.image || "";
        
        // Change form handler to update mode
        const form = document.getElementById("product-form");
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            const updateData = {
                name: document.getElementById("product-name").value,
                description: document.getElementById("product-desc").value,
                price: parseFloat(document.getElementById("product-price").value),
                category: document.getElementById("product-category").value,
                stock: parseInt(document.getElementById("product-stock").value),
                image: document.getElementById("product-image").value || "https://via.placeholder.com/300x200?text=Product+Image"
            };
            
            const submitBtn = form.querySelector('button[type="submit"]');
            
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Updating...";
                }
                
                const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    },
                    body: JSON.stringify(updateData)
                });
                
                if (response.ok) {
                    hideAddProductForm();
                    await loadAdminProducts();
                    showNotification("Product updated successfully!", "success");
                } else {
                    const result = await response.json();
                    showNotification("Error: " + (result.error || "Failed to update product"), "error");
                }
            } catch (error) {
                showNotification("Error updating product: " + error.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Update Product";
                }
            }
        };
        
        // Update button text
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = "Update Product";
        }
        
        showAddProductForm();
    } catch (error) {
        showNotification("Error loading product: " + error.message, "error");
    }
}

// Enhanced Cart Functionality
async function loadCart() {
    if (!currentUser || !authToken || currentUser.role !== 'user') {
        cart = { items: [], total: 0, itemCount: 0 };
        updateCartUI();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cart`, {
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            cart = result;
            updateCartUI();
            updateNavigation();
        } else {
            console.error("Failed to load cart");
            cart = { items: [], total: 0, itemCount: 0 };
        }
    } catch (error) {
        console.error("Error loading cart:", error);
        cart = { items: [], total: 0, itemCount: 0 };
    }
}

async function loadCartPage() {
    if (!currentUser || currentUser.role !== 'user') {
        return;
    }
    
    await loadCart();
    updateCartPageUI();
}

function updateCartUI() {
    // Update cart count in navigation - only for regular users
    if (currentUser && currentUser.role === 'user') {
        const cartCountElements = document.querySelectorAll(".cart-count");
        cartCountElements.forEach(element => {
            element.textContent = cart.itemCount || 0;
            element.style.display = cart.itemCount > 0 ? "inline" : "none";
        });
    }
}

function updateCartPageUI() {
    const cartItems = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");
    const emptyCart = document.getElementById("empty-cart");
    
    if (!cartItems) return;
    
    if (!cart.items || cart.items.length === 0) {
        cartItems.innerHTML = "";
        if (cartSummary) cartSummary.style.display = "none";
        if (emptyCart) emptyCart.style.display = "block";
        return;
    }
    
    if (emptyCart) emptyCart.style.display = "none";
    if (cartSummary) cartSummary.style.display = "block";
    
    cartItems.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <img src="${item.image || "https://via.placeholder.com/100x100?text=No+Image"}" 
                 alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name}</h4>
                <p class="cart-item-price">$${item.price}</p>
            </div>
            <div class="cart-item-controls">
                <button onclick="updateCartItem('${item.product._id || item.product}', ${item.quantity - 1})" 
                        class="quantity-btn">-</button>
                <span class="quantity">${item.quantity}</span>
                <button onclick="updateCartItem('${item.product._id || item.product}', ${item.quantity + 1})" 
                        class="quantity-btn">+</button>
                <button onclick="removeFromCart('${item.product._id || item.product}')" 
                        class="btn btn-danger btn-small">Remove</button>
            </div>
            <div class="cart-item-total">
                $${(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join("");
    
    // Update summary
    if (cartSummary) {
        const subtotal = cart.total || cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 5.99;
        const total = subtotal + shipping;
        
        document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById("total").textContent = `$${total.toFixed(2)}`;
    }
}

// Add to cart function - ONLY FOR REGULAR USERS
async function addToCart(productId) {
    if (!currentUser) {
        alert("Please login to add items to cart");
        window.location.href = "login.html";
        return;
    }
    
    if (currentUser.role === 'admin') {
        showNotification("Admins cannot add items to cart. Please login as a regular user.", "error");
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cart`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        if (response.ok) {
            const result = await response.json();
            cart = result.cart;
            updateCartUI();
            showNotification("Product added to cart!", "success");
        } else {
            const result = await response.json();
            showNotification("Error: " + result.error, "error");
        }
    } catch (error) {
        showNotification("Error adding to cart: " + error.message, "error");
    }
}

// Update cart item quantity - ONLY FOR REGULAR USERS
async function updateCartItem(productId, newQuantity) {
    if (!currentUser || currentUser.role !== 'user') {
        showNotification("Please login as a regular user to manage cart", "error");
        return;
    }
    
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cart/${productId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ quantity: newQuantity })
        });
        
        if (response.ok) {
            const result = await response.json();
            cart = result.cart;
            updateCartUI();
            if (window.location.pathname.includes("cart.html")) {
                updateCartPageUI();
            }
            showNotification("Cart updated", "success");
        } else {
            const result = await response.json();
            showNotification("Error: " + result.error, "error");
        }
    } catch (error) {
        console.error("Error updating cart:", error);
        showNotification("Error updating cart", "error");
    }
}

// Remove from cart - ONLY FOR REGULAR USERS
async function removeFromCart(productId) {
    if (!currentUser || currentUser.role !== 'user') {
        showNotification("Please login as a regular user to manage cart", "error");
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cart/${productId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            cart = result.cart;
            updateCartUI();
            if (window.location.pathname.includes("cart.html")) {
                updateCartPageUI();
            }
            showNotification("Item removed from cart", "success");
        } else {
            const result = await response.json();
            showNotification("Error: " + result.error, "error");
        }
    } catch (error) {
        console.error("Error removing from cart:", error);
        showNotification("Error removing item from cart", "error");
    }
}

// Checkout function - ONLY FOR REGULAR USERS
async function checkout() {
    if (!currentUser || currentUser.role !== 'user') {
        showNotification("Only regular users can checkout. Admins cannot make purchases.", "error");
        return;
    }
    
    if (!cart.items || cart.items.length === 0) {
        showNotification("Your cart is empty!", "error");
        return;
    }
    
    try {
        const orderData = {
            products: cart.items.map(item => ({
                productId: item.product._id || item.product,
                quantity: item.quantity
            })),
            shippingAddress: currentUser.address || "Default Address",
            paymentMethod: "credit card"
        };
        
        const response = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            // Clear cart after successful order
            cart = { items: [], total: 0, itemCount: 0 };
            updateCartUI();
            updateCartPageUI();
            
            showNotification("Order placed successfully!", "success");
            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        } else {
            const result = await response.json();
            showNotification("Error: " + result.error, "error");
        }
    } catch (error) {
        showNotification("Error creating order: " + error.message, "error");
    }
}

// Notification system
function showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        inset-block-start: 20px;
        inset-inline-end: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-inline-size: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    const colors = {
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FF9800",
        error: "#F44336"
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Add CSS classes for message styling
const style = document.createElement('style');
style.textContent = `
    .loading { color: blue; font-weight: bold; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
`;
document.head.appendChild(style);
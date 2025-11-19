const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;
const JWT_SECRET = "your-secret-key-change-in-production";

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = "uploads/";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// MongoDB Connection
mongoose.connect("mongodb+srv://ayawsir:Timogan00@database.vyu7sev.mongodb.net/sheetupdater?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("✅ MongoDB connected successfully");
}).catch((err) => {
    console.log("❌ MongoDB connection error: ", err);
});

// Schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    age: Number,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    address: String,
    phone: String,
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        name: String,
        image: String,
        addedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    category: String,
    image: String,
    stock: Number,
    rating: { type: Number, default: 0 },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number
    }],
    totalAmount: Number,
    status: { 
        type: String, 
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    shippingAddress: String,
    paymentMethod: String,
    createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model("User", UserSchema);
const Product = mongoose.model("Product", ProductSchema);
const Order = mongoose.model("Order", OrderSchema);

// Predefined categories for better organization
const PREDEFINED_CATEGORIES = [
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Books",
    "Sports",
    "Beauty",
    "Toys",
    "Automotive",
    "Health",
    "Jewelry"
];

// Function to create demo users
async function createDemoUsers() {
    try {
        console.log("🔧 Creating demo users...");
        
        // Delete existing demo users to avoid duplicates
        await User.deleteMany({ 
            email: { $in: ["admin@example.com", "user@example.com"] } 
        });

        // Create admin user
        const hashedAdminPassword = await bcrypt.hash("password123", 10);
        const adminUser = new User({
            name: "Admin User",
            email: "admin@example.com",
            password: hashedAdminPassword,
            age: 30,
            address: "123 Admin Street",
            phone: "123-456-7890",
            role: "admin"
        });
        await adminUser.save();
        console.log("✅ Demo admin user created: admin@example.com / password123");

        // Create regular user
        const hashedUserPassword = await bcrypt.hash("password123", 10);
        const regularUser = new User({
            name: "Regular User",
            email: "user@example.com",
            password: hashedUserPassword,
            age: 25,
            address: "456 User Avenue", 
            phone: "987-654-3210",
            role: "user"
        });
        await regularUser.save();
        console.log("✅ Demo regular user created: user@example.com / password123");

        console.log("🎉 Demo users setup complete!");
        return true;
    } catch (error) {
        console.log("❌ Error creating demo users:", error.message);
        return false;
    }
}

// Function to create demo products
async function createDemoProducts() {
    try {
        console.log("🔧 Creating demo products...");
        
        // Clear existing products
        await Product.deleteMany({});

        const demoProducts = [
            {
                name: "Wireless Bluetooth Earbuds",
                description: "High-quality wireless earbuds with noise cancellation and 24hr battery life",
                price: 49.99,
                category: "Electronics",
                stock: 50,
                image: "https://via.placeholder.com/300x200?text=Wireless+Earbuds"
            },
            {
                name: "Cotton T-Shirt",
                description: "Comfortable 100% cotton t-shirt available in multiple colors",
                price: 15.99,
                category: "Clothing",
                stock: 100,
                image: "https://via.placeholder.com/300x200?text=Cotton+T-Shirt"
            },
            {
                name: "Smart Watch",
                description: "Feature-rich smartwatch with heart rate monitoring and GPS",
                price: 99.99,
                category: "Electronics",
                stock: 25,
                image: "https://via.placeholder.com/300x200?text=Smart+Watch"
            },
            {
                name: "Desk Lamp",
                description: "Modern LED desk lamp with adjustable brightness and color temperature",
                price: 29.99,
                category: "Home & Garden",
                stock: 75,
                image: "https://via.placeholder.com/300x200?text=Desk+Lamp"
            },
            {
                name: "Running Shoes",
                description: "Lightweight running shoes with cushioning and breathable mesh",
                price: 79.99,
                category: "Sports",
                stock: 40,
                image: "https://via.placeholder.com/300x200?text=Running+Shoes"
            },
            {
                name: "Coffee Maker",
                description: "Programmable coffee maker with thermal carafe and built-in grinder",
                price: 89.99,
                category: "Home & Garden",
                stock: 30,
                image: "https://via.placeholder.com/300x200?text=Coffee+Maker"
            },
            {
                name: "Fantasy Novel",
                description: "Bestselling fantasy novel with epic adventure storyline",
                price: 12.99,
                category: "Books",
                stock: 80,
                image: "https://via.placeholder.com/300x200?text=Fantasy+Novel"
            },
            {
                name: "Yoga Mat",
                description: "Non-slip yoga mat with carrying strap and alignment lines",
                price: 24.99,
                category: "Sports",
                stock: 60,
                image: "https://via.placeholder.com/300x200?text=Yoga+Mat"
            }
        ];

        await Product.insertMany(demoProducts);
        console.log("✅ Demo products created");
        return true;
    } catch (error) {
        console.log("❌ Error creating demo products:", error.message);
        return false;
    }
}

// Initialize demo data
async function initializeDemoData() {
    console.log("🔄 Initializing demo data...");
    
    let retries = 3;
    while (retries > 0) {
        try {
            const usersCreated = await createDemoUsers();
            const productsCreated = await createDemoProducts();
            
            if (usersCreated && productsCreated) {
                console.log("🎉 All demo data initialized successfully!");
                break;
            }
        } catch (error) {
            console.log(`❌ Demo data initialization failed. Retries inset-inline-start: ${retries - 1}`);
        }
        
        retries--;
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Initialize when MongoDB connects
mongoose.connection.once("open", async () => {
    console.log("📊 MongoDB connection established, initializing demo data...");
    await initializeDemoData();
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};

// Routes

// Debug Routes
app.get("/api/debug/check-users", async (req, res) => {
    try {
        const adminUser = await User.findOne({ email: "admin@example.com" });
        const regularUser = await User.findOne({ email: "user@example.com" });
        
        res.json({
            adminExists: !!adminUser,
            regularExists: !!regularUser,
            adminUser: adminUser ? { email: adminUser.email, role: adminUser.role } : null,
            regularUser: regularUser ? { email: regularUser.email, role: regularUser.role } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/debug/create-demo-users", async (req, res) => {
    try {
        const success = await createDemoUsers();
        if (success) {
            res.json({ message: "Demo users created successfully" });
        } else {
            res.status(500).json({ error: "Failed to create demo users" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Category Routes
app.get("/api/categories", async (req, res) => {
    try {
        // Get unique categories from products
        const categories = await Product.distinct("category");
        res.json({ 
            categories: categories.sort(),
            predefined: PREDEFINED_CATEGORIES
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

// Auth Routes
app.post("/api/register", async (req, res) => {
    const { name, email, password, age, address, phone } = req.body;
    
    try {
        if (!name || !email || !password || !age || !address || !phone) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            age, 
            address, 
            phone 
        });
        await newUser.save();
        
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        
        res.json({ 
            message: "User registered successfully", 
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ error: "Email already exists" });
        } else {
            res.status(500).json({ error: "Failed to register user" });
        }
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        
        res.json({ 
            message: "Login successful", 
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Product Routes (Public)
app.get("/api/products", async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        let query = {};
        
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }
        
        const products = await Product.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
            
        const total = await Product.countDocuments(query);
        
        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch product" });
    }
});

// Admin Product Routes (Protected) with Image Upload
app.post("/api/admin/products", authenticateToken, isAdmin, upload.single("image"), async (req, res) => {
    const { name, description, price, category, stock } = req.body;
    
    try {
        if (!name || !description || !price || !category || !stock) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: "All fields are required" });
        }

        let imageUrl = req.body.image; // Default to URL if provided
        
        // If file was uploaded, use the uploaded image
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        
        // If no image provided, use placeholder
        if (!imageUrl) {
            imageUrl = "https://via.placeholder.com/300x200?text=No+Image";
        }

        const newProduct = new Product({
            name,
            description,
            price: parseFloat(price),
            category,
            image: imageUrl,
            stock: parseInt(stock)
        });
        await newProduct.save();
        res.json({ message: "Product created successfully", product: newProduct });
    } catch (err) {
        // Delete uploaded file if there was an error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: "Failed to create product" });
    }
});

app.put("/api/admin/products/:id", authenticateToken, isAdmin, upload.single("image"), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // If file was uploaded, use the new image
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
            
            // Delete old image file if it was an uploaded file
            const oldProduct = await Product.findById(req.params.id);
            if (oldProduct && oldProduct.image && oldProduct.image.startsWith("/uploads/")) {
                const oldImagePath = oldProduct.image.substring(1); // Remove leading slash
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Convert price and stock to numbers if they exist
        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.stock) updateData.stock = parseInt(updateData.stock);

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!updatedProduct) {
            // Delete uploaded file if product not found
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ error: "Product not found" });
        }
        
        res.json({ message: "Product updated successfully", product: updatedProduct });
    } catch (err) {
        // Delete uploaded file if there was an error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: "Failed to update product" });
    }
});

app.delete("/api/admin/products/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Delete image file if it was an uploaded file
        if (product.image && product.image.startsWith("/uploads/")) {
            const imagePath = product.image.substring(1);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete product" });
    }
});

// Enhanced Cart Routes with better response structure
app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate("cart.product");
        
        // Calculate cart totals
        let total = 0;
        let itemCount = 0;
        
        if (user.cart && user.cart.length > 0) {
            user.cart.forEach(item => {
                total += item.price * item.quantity;
                itemCount += item.quantity;
            });
        }
        
        res.json({ 
            items: user.cart || [],
            total: parseFloat(total.toFixed(2)),
            itemCount,
            userId: user._id
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch cart" });
    }
});

app.post("/api/cart", authenticateToken, async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    
    try {
        const user = await User.findById(req.user.userId);
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        if (product.stock < quantity) {
            return res.status(400).json({ error: "Insufficient stock" });
        }
        
        // Initialize cart if it doesn't exist
        if (!user.cart) {
            user.cart = [];
        }
        
        // Check if product already in cart
        const existingItem = user.cart.find(item => item.product.toString() === productId);
        
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ error: "Cannot add more than available stock" });
            }
            existingItem.quantity = newQuantity;
        } else {
            user.cart.push({
                product: productId,
                quantity: quantity,
                price: product.price,
                name: product.name,
                image: product.image
            });
        }
        
        await user.save();
        
        // Get updated cart with populated products and totals
        const updatedUser = await User.findById(req.user.userId).populate("cart.product");
        let total = 0;
        let itemCount = 0;
        
        updatedUser.cart.forEach(item => {
            total += item.price * item.quantity;
            itemCount += item.quantity;
        });
        
        res.json({ 
            message: "Product added to cart", 
            cart: {
                items: updatedUser.cart,
                total: parseFloat(total.toFixed(2)),
                itemCount
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to add to cart" });
    }
});

app.put("/api/cart/:productId", authenticateToken, async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    try {
        const user = await User.findById(req.user.userId);
        const product = await Product.findById(productId);
        
        if (!user.cart) {
            return res.status(404).json({ error: "Cart is empty" });
        }
        
        const cartItem = user.cart.find(item => item.product.toString() === productId);
        
        if (!cartItem) {
            return res.status(404).json({ error: "Product not in cart" });
        }
        
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            user.cart = user.cart.filter(item => item.product.toString() !== productId);
        } else {
            if (quantity > product.stock) {
                return res.status(400).json({ error: "Cannot add more than available stock" });
            }
            cartItem.quantity = quantity;
        }
        
        await user.save();
        
        // Get updated cart with populated products and totals
        const updatedUser = await User.findById(req.user.userId).populate("cart.product");
        let total = 0;
        let itemCount = 0;
        
        updatedUser.cart.forEach(item => {
            total += item.price * item.quantity;
            itemCount += item.quantity;
        });
        
        res.json({ 
            message: "Cart updated", 
            cart: {
                items: updatedUser.cart,
                total: parseFloat(total.toFixed(2)),
                itemCount
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update cart" });
    }
});

app.delete("/api/cart/:productId", authenticateToken, async (req, res) => {
    const { productId } = req.params;
    
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user.cart) {
            return res.status(404).json({ error: "Cart is empty" });
        }
        
        user.cart = user.cart.filter(item => item.product.toString() !== productId);
        await user.save();
        
        // Get updated cart with populated products and totals
        const updatedUser = await User.findById(req.user.userId).populate("cart.product");
        let total = 0;
        let itemCount = 0;
        
        updatedUser.cart.forEach(item => {
            total += item.price * item.quantity;
            itemCount += item.quantity;
        });
        
        res.json({ 
            message: "Product removed from cart", 
            cart: {
                items: updatedUser.cart,
                total: parseFloat(total.toFixed(2)),
                itemCount
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove from cart" });
    }
});

app.delete("/api/cart", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        user.cart = [];
        await user.save();
        
        res.json({ 
            message: "Cart cleared",
            cart: {
                items: [],
                total: 0,
                itemCount: 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear cart" });
    }
});

// Order Routes (Protected)
app.post("/api/orders", authenticateToken, async (req, res) => {
    const { products, shippingAddress, paymentMethod } = req.body;
    
    try {
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Products array is required" });
        }

        let totalAmount = 0;
        const orderProducts = [];
        
        // Calculate total and verify product availability
        for (let item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
            }
            
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;
            
            orderProducts.push({
                product: item.productId,
                quantity: item.quantity,
                price: product.price
            });
            
            // Update product stock
            product.stock -= item.quantity;
            await product.save();
        }
        
        const newOrder = new Order({
            user: req.user.userId,
            products: orderProducts,
            totalAmount,
            shippingAddress: shippingAddress || "Default Address",
            paymentMethod: paymentMethod || "credit card"
        });
        
        await newOrder.save();
        
        // Clear user's cart after successful order
        const user = await User.findById(req.user.userId);
        user.cart = [];
        await user.save();
        
        await newOrder.populate("products.product");
        
        res.json({ message: "Order created successfully", order: newOrder });
    } catch (err) {
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
        let orders;
        if (req.user.role === "admin") {
            orders = await Order.find()
                .populate("user", "name email")
                .populate("products.product")
                .sort({ createdAt: -1 });
        } else {
            orders = await Order.find({ user: req.user.userId })
                .populate("products.product")
                .sort({ createdAt: -1 });
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.put("/api/orders/:id/status", authenticateToken, isAdmin, async (req, res) => {
    const { status } = req.body;
    
    try {
        const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: "Valid status is required" });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate("user", "name email").populate("products.product");
        
        if (!updatedOrder) {
            return res.status(404).json({ error: "Order not found" });
        }
        
        res.json({ message: "Order status updated", order: updatedOrder });
    } catch (err) {
        res.status(500).json({ error: "Failed to update order status" });
    }
});

// User Profile Routes
app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            req.body,
            { new: true }
        ).select("-password");
        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Test routes
app.get("/api/test", (req, res) => {
    res.json({ 
        message: "✅ Backend is working!", 
        timestamp: new Date().toISOString(),
        features: [
            "User Authentication",
            "Product Management", 
            "Shopping Cart",
            "Image Upload",
            "Order System",
            "Category Management"
        ],
        demoUsers: {
            admin: "admin@example.com / password123",
            user: "user@example.com / password123"
        }
    });
});

app.get("/api/health", (req, res) => {
    res.json({ 
        status: "OK", 
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        timestamp: new Date().toISOString(),
        uploads: fs.existsSync("uploads") ? "Available" : "Not Available"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Available Routes:`);
    console.log(`   GET  http://localhost:${PORT}/api/test - Test backend`);
    console.log(`   GET  http://localhost:${PORT}/api/health - Health check`);
    console.log(`   GET  http://localhost:${PORT}/api/products - Get products`);
    console.log(`   GET  http://localhost:${PORT}/api/categories - Get categories`);
    console.log(`   POST http://localhost:${PORT}/api/login - User login`);
    console.log(`   POST http://localhost:${PORT}/api/register - User registration`);
    console.log(`   GET  http://localhost:${PORT}/api/cart - Get cart (protected)`);
    console.log(`\n👤 Demo Accounts:`);
    console.log(`   Admin: admin@example.com / password123`);
    console.log(`   User:  user@example.com / password123`);
    console.log(`\n🖼️  Image Upload:`);
    console.log(`   Uploads served from: http://localhost:${PORT}/uploads/`);
});

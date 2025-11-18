const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5800;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production';

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // stricter in production
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL || true 
        : true,
    credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for frontend FIRST
app.use(express.static("public"));

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

// ... REST OF YOUR SCHEMAS AND MODELS ...

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

// Authentication Middleware
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

// ... REST OF YOUR ROUTES AND FUNCTIONS ...

// Create demo data
async function createDemoUsers() {
    try {
        await User.deleteMany({ email: { $in: ["admin@example.com", "user@example.com"] } });
        
        const hashedPassword = await bcrypt.hash("password123", 10);
        
        // Admin user
        await User.create({
            name: "Admin User",
            email: "admin@example.com",
            password: hashedPassword,
            age: 30,
            address: "123 Admin Street",
            phone: "123-456-7890",
            role: "admin"
        });
        
        // Regular user
        await User.create({
            name: "Regular User", 
            email: "user@example.com",
            password: hashedPassword,
            age: 25,
            address: "456 User Avenue",
            phone: "987-654-3210",
            role: "user"
        });
        
        console.log("✅ Demo users created");
    } catch (error) {
        console.log("❌ Error creating demo users:", error.message);
    }
}

async function createDemoProducts() {
    try {
        await Product.deleteMany({});
        
        const demoProducts = [
            {
                name: "Wireless Bluetooth Earbuds",
                description: "High-quality wireless earbuds with noise cancellation",
                price: 49.99,
                category: "Electronics",
                stock: 50,
                image: "https://via.placeholder.com/300x200?text=Wireless+Earbuds"
            },
            {
                name: "Cotton T-Shirt",
                description: "Comfortable 100% cotton t-shirt",
                price: 15.99,
                category: "Clothing", 
                stock: 100,
                image: "https://via.placeholder.com/300x200?text=Cotton+T-Shirt"
            },
            {
                name: "Smart Watch",
                description: "Feature-rich smartwatch with heart rate monitoring",
                price: 99.99,
                category: "Electronics",
                stock: 25,
                image: "https://via.placeholder.com/300x200?text=Smart+Watch"
            },
            {
                name: "Running Shoes", 
                description: "Lightweight running shoes with cushioning",
                price: 79.99,
                category: "Sports",
                stock: 40,
                image: "https://via.placeholder.com/300x200?text=Running+Shoes"
            }
        ];

        await Product.insertMany(demoProducts);
        console.log("✅ Demo products created");
    } catch (error) {
        console.log("❌ Error creating demo products:", error.message);
    }
}

// ==================== ROUTES ====================

// Health check route
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// Test route
app.get("/api/test", (req, res) => {
    res.json({ 
        message: "✅ Backend is working!", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        features: ["Authentication", "Products", "Admin CRUD", "File Uploads"]
    });
});

// Add your other API routes here (register, login, products, cart, etc.)

// ==================== ERROR HANDLING ====================

// Basic error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message 
    });
});

// Serve frontend for all routes (SPA behavior) - This should be LAST
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize data
mongoose.connection.once("open", async () => {
    console.log("📊 MongoDB connected, creating demo data...");
    await createDemoUsers();
    await createDemoProducts();
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 CORS Enabled for all origins`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Test: http://localhost:${PORT}/api/test`);
    console.log(`📍 File uploads: http://localhost:${PORT}/uploads/`);
    console.log(`\n👤 Demo Accounts:`);
    console.log(`   Admin: admin@example.com / password123`);
    console.log(`   User:  user@example.com / password123`);
});

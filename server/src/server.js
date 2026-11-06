require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const fileRoutes = require("./routes/files");
const pool = require("./config/db");
const authRoutes = require("./routes/auth");
const folderRoutes = require("./routes/folders");
const app = express();

// Security and request middleware
app.use(helmet());

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
// Health check
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS server_time"
        );

        res.status(200).json({
            success: true,
            message: "Drive Clone API is running",
            database: "Connected",
            time: result.rows[0].server_time
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

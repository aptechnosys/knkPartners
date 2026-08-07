require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const path = require("path");

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const caseRoutes = require("./routes/caseRoutes");
const authRoutes = require("./routes/authRoutes");
const ApiInboxRoutes = require("./routes/ApiInboxRoutes");
const ApiLogRoutes = require("./routes/ApiLogRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const reportRoutes = require("./routes/reportRoutes");
const clientApiRoutes = require("./routes/clientApiRoutes");
const clientRoutes = require("./routes/clientRoutes");

const app = express();

/* Trust Proxy (Required for production + rate limiter) */
app.set("trust proxy", 1);

/* Performance */
app.use(compression());

/* Security Headers */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    crossOriginEmbedderPolicy: false,
  })
);

/* Connect Database */
connectDB();

/* CORS */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://knk-partners.vercel.app",
      "https://www.knkpartner.com",
      "https://knkpartner.com",
      "https://knk-partners-aldhtmjqn-khanfaiyaz359-8312s-projects.vercel.app",
    ],
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    credentials: true,
  })
);

/* Body Parser */
app.use(express.json());

/* Static Uploads */
const uploadsPath = path.resolve(__dirname, "uploads");

app.use("/uploads", express.static(uploadsPath));

/* Routes */
app.use("/api/v1", caseRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/api-inbox", ApiInboxRoutes);
app.use("/api/v1/api-logs", ApiLogRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/client", clientApiRoutes);
app.use("/api/v1/clients", clientRoutes);

/* Health Check */
app.get("/", (req, res) => {
  res.send("API is running...");
});

/* Error Handler */
app.use(errorHandler);

/* Start Server */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
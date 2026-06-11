const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test_db",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get("/", (req, res) => {
  res.send("AI Shield Server Running!");
});

app.get("/api/anti-fraud-knowledge", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT knowledge_id, user_id, title, content, category, source, view_count, status, created_at, updated_at
       FROM anti_fraud_knowledge
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to query anti_fraud_knowledge:", error);

    res.status(500).json({
      success: false,
      message: "Failed to query anti-fraud knowledge",
      error: error.message,
    });
  }
});

app.get("/api/blacklist", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM blacklist");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query blacklist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query blacklist",
      error: error.message,
    });
  }
});

app.get("/api/fraud-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM fraud_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query fraud_database:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query fraud database",
      error: error.message,
    });
  }
});

app.get("/api/line-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM line_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query line_database:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query line database",
      error: error.message,
    });
  }
});

app.get("/api/message-keywords", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM message_keywords");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query message_keywords:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query message keywords",
      error: error.message,
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM user");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query users",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Shield Server Running: http://localhost:${PORT}`);
});
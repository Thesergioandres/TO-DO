const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

function createResponse(statusCode, data, message = null) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify({
      success: statusCode < 400,
      data,
      message,
      timestamp: new Date().toISOString(),
    }),
  };
}

function createErrorResponse(statusCode, message, error = null) {
  return createResponse(statusCode, null, message);
}

function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    throw new Error("Access token required");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

function handleCors(req) {
  if (req.method === "OPTIONS") {
    return createResponse(200, null, "CORS preflight");
  }
  return null;
}

module.exports = {
  createResponse,
  createErrorResponse,
  authenticateToken,
  handleCors,
  JWT_SECRET,
};

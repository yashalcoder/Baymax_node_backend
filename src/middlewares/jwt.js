import jwt from "jsonwebtoken";

// ============================================
// JWT CONFIG
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "14d";

// ============================================
// JWT HELPER FUNCTIONS
// ============================================
const generateToken = (user) => {
  console.log("Generating token for user:", user);
  return jwt.sign(
    {
      id: user?._id || user?.id,
      email: user?.email,
      role: user?.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const bearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  // Backward-compat: some routes used cookie-based authMiddleware
  const cookieToken = req.cookies?.token;

  return bearerToken || cookieToken || null;
}

// ============================================
// MIDDLEWARE: Verify JWT Token
// Supports:
// - Authorization: Bearer <token>
// - Cookie: token=<token>
// ============================================
const authMiddleware = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("Authenticated user:", decoded);
    return next();
  } catch (err) {
    return res.status(403).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
};

// Backward compatible name used in other files
const authenticateToken = authMiddleware;

export { generateToken, authenticateToken, authMiddleware };

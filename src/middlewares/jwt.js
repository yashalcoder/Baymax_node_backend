// ============================================
// JWT HELPER FUNCTIONS
// ============================================
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";
const JWT_EXPIRE = "7d"; // Token expires in 7 days
import jwt from "jsonwebtoken";
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      doctorId: user.doctorId || user.patientId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// ============================================
// MIDDLEWARE: Verify JWT Token
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });
};
export { generateToken, authenticateToken };

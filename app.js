import express from "express"; // Importing express for the web framework
import bodyParser from "body-parser"; // Importing bodyParser for parsing request bodies
import ejsLayouts from "express-ejs-layouts"; // Importing express-ejs-layouts for layout support
import path from "path"; // Importing path for resolving file paths
import dotenv from "dotenv"; // Importing dotenv to load environment variables
import session from "express-session"; // Importing express-session for session management
import passport from "passport"; // Importing passport for authentication
import { Strategy as GoogleStrategy } from "passport-google-oauth20"; // Importing Google OAuth 2.0 strategy
import axios from "axios"; // For reCAPTCHA verification

import { connectUsingMongoose } from "./config/mongodb.js"; // Importing MongoDB connection function
import router from "./routes/routes.js"; // Importing main application routes
import authRouter from "./routes/authRoutes.js"; // Importing authentication routes

dotenv.config(); // Loading environment variables from .env file
const app = express(); // Initializing express application

// SESSION
app.use(
  session({
    secret: process.env.SESSION_SECRET || "SecretKey", // Sử dụng biến môi trường cho secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Đặt secure: true nếu dùng HTTPS
  })
);

// MIDDLEWARE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL || "http://localhost:3000/auth/google/callback", // Sử dụng biến môi trường
      scope: ["profile", "email"],
    },
    function (accessToken, refreshToken, profile, callback) {
      callback(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware để xác minh reCAPTCHA
const verifyRecaptcha = async (req, res, next) => {
  const recaptchaToken = req.body["g-recaptcha-response"];
  if (!recaptchaToken) {
    return res.status(400).json({ message: "Vui lòng xác minh reCAPTCHA!" });
  }

  try {
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.ip,
      },
    });

    if (response.data.success) {
      next();
    } else {
      return res.status(400).json({ message: "Xác minh reCAPTCHA thất bại!" });
    }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return res.status(500).json({ message: "Lỗi server khi xác minh reCAPTCHA!" });
  }
};

// Set Templates
app.set("view engine", "ejs"); // Define template engine
app.use(ejsLayouts); // Use base template
app.set("views", path.join(path.resolve(), "views")); // Define template directory

// DB Connection
connectUsingMongoose();

// ROUTES
app.get("/", (req, res) => {
  res.send("Hey Ninja ! Go to /user/signin for the login page.");
});
app.use("/user", router);
app.use("/auth", authRouter);

// Thêm middleware verifyRecaptcha cho route /user/signin nếu cần
app.post("/user/signin", verifyRecaptcha, (req, res) => {
  const { email, password } = req.body;
  // Logic kiểm tra email/password (ví dụ: so sánh với MongoDB)
  res.status(200).json({ message: "Đăng nhập thành công với reCAPTCHA!", email });
});

// LISTEN
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


// ==============================
// SUPABASE CONNECTION
// ==============================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


// ==============================
// SIMPLE SESSION STORAGE
// ==============================

const sessions = {};


// ==============================
// STATIC FILES
// ==============================

app.use(express.static(__dirname));


// ==============================
// HOME PAGE
// ==============================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});


// ==============================
// REGISTER
// ==============================

app.post("/register", async (req, res) => {

  try {

    const {
      username,
      email,
      password
    } = req.body;


    if (!username || !email || !password) {

      return res.status(400).json({
        message: "All fields are required."
      });

    }


    if (username.length < 3) {

      return res.status(400).json({
        message: "Username must contain at least 3 characters."
      });

    }


    if (password.length < 6) {

      return res.status(400).json({
        message: "Password must contain at least 6 characters."
      });

    }


    // Check existing email

    const { data: existingUser } =
      await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();


    if (existingUser) {

      return res.status(400).json({
        message: "Email already registered."
      });

    }


    // Store password as SHA-256 hash

    const passwordHash =
      crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");


    const { data, error } =
      await supabase
        .from("users")
        .insert([
          {
            username: username,
            email: email,
            password: passwordHash
          }
        ])
        .select("id, username, email")
        .single();


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Registration failed."
      });

    }


    res.status(201).json({

      message: "Registration successful.",
      user: data

    });

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// LOGIN
// ==============================

app.post("/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        message: "Email and password are required."
      });

    }


    const passwordHash =
      crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");


    const { data: user, error } =
      await supabase
        .from("users")
        .select("id, username, email")
        .eq("email", email)
        .eq("password", passwordHash)
        .maybeSingle();


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Login failed."
      });

    }


    if (!user) {

      return res.status(401).json({
        message: "Invalid email or password."
      });

    }


    // Create session ID

    const sessionId =
      crypto.randomBytes(32).toString("hex");


    sessions[sessionId] = {

      id: user.id,
      username: user.username,
      email: user.email

    };


    // Send session cookie

    res.setHeader(
      "Set-Cookie",
      `sessionId=${sessionId}; HttpOnly; Path=/; SameSite=Lax`
    );


    res.json({

      message: "Login successful.",
      username: user.username

    });

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// GET LOGGED-IN USER
// ==============================

app.get("/user", (req, res) => {

  const cookies =
    req.headers.cookie || "";


  const sessionCookie =
    cookies
      .split(";")
      .find(cookie =>
        cookie.trim().startsWith("sessionId=")
      );


  if (!sessionCookie) {

    return res.status(401).json({
      message: "Not logged in."
    });

  }


  const sessionId =
    sessionCookie
      .split("=")[1];


  const user =
    sessions[sessionId];


  if (!user) {

    return res.status(401).json({
      message: "Session expired."
    });

  }


  res.json({

    username: user.username,
    email: user.email

  });

});


// ==============================
// LOGOUT
// ==============================

app.post("/logout", (req, res) => {

  const cookies =
    req.headers.cookie || "";


  const sessionCookie =
    cookies
      .split(";")
      .find(cookie =>
        cookie.trim().startsWith("sessionId=")
      );


  if (sessionCookie) {

    const sessionId =
      sessionCookie
        .split("=")[1];

    delete sessions[sessionId];

  }


  res.setHeader(
    "Set-Cookie",
    "sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );


  res.json({
    message: "Logged out successfully."
  });

});


// ==============================
// GET USER HABITS
// ==============================

app.get("/habits", async (req, res) => {

  try {

    const user =
      getLoggedInUser(req);


    if (!user) {

      return res.status(401).json({
        message: "Please login first."
      });

    }


    const { data, error } =
      await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("id", {
          ascending: false
        });


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Unable to load habits."
      });

    }


    res.json(data || []);

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// ADD HABIT
// ==============================

app.post("/habits", async (req, res) => {

  try {

    const user =
      getLoggedInUser(req);


    if (!user) {

      return res.status(401).json({
        message: "Please login first."
      });

    }


    const habit_name =
      req.body.habit_name;


    if (!habit_name || habit_name.trim() === "") {

      return res.status(400).json({
        message: "Habit name is required."
      });

    }


    const { data, error } =
      await supabase
        .from("habits")
        .insert([
          {
            habit_name: habit_name.trim(),
            completed: false,
            user_id: user.id
          }
        ])
        .select()
        .single();


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Unable to add habit."
      });

    }


    res.status(201).json(data);

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// COMPLETE HABIT
// ==============================

app.put("/habits/:id", async (req, res) => {

  try {

    const user =
      getLoggedInUser(req);


    if (!user) {

      return res.status(401).json({
        message: "Please login first."
      });

    }


    const id =
      req.params.id;


    const { data, error } =
      await supabase
        .from("habits")
        .update({
          completed: true
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Unable to complete habit."
      });

    }


    res.json(data);

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// DELETE HABIT
// ==============================

app.delete("/habits/:id", async (req, res) => {

  try {

    const user =
      getLoggedInUser(req);


    if (!user) {

      return res.status(401).json({
        message: "Please login first."
      });

    }


    const id =
      req.params.id;


    const { error } =
      await supabase
        .from("habits")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);


    if (error) {

      console.log(error);

      return res.status(500).json({
        message: "Unable to delete habit."
      });

    }


    res.json({
      message: "Habit deleted successfully."
    });

  }
  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error."
    });

  }

});


// ==============================
// SESSION HELPER
// ==============================

function getLoggedInUser(req) {

  const cookies =
    req.headers.cookie || "";


  const sessionCookie =
    cookies
      .split(";")
      .find(cookie =>
        cookie.trim().startsWith("sessionId=")
      );


  if (!sessionCookie) {
    return null;
  }


  const sessionId =
    sessionCookie
      .split("=")[1];


  return sessions[sessionId] || null;

}


// ==============================
// START SERVER
// ==============================

const PORT =
  process.env.PORT || 3000;


if (require.main === module) {

  app.listen(PORT, () => {

    console.log(
      `HabitFlow running at http://localhost:${PORT}`
    );

  });

}


module.exports = app;
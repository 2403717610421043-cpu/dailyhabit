const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve HTML Files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/add.html", (req, res) => {
  res.sendFile(path.join(__dirname, "add.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

// Supabase Connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get All Habits
app.get("/habits", async (req, res) => {
  const { data, error } = await supabase
    .from("habits")
    .select("*");

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Add Habit
app.post("/habits", async (req, res) => {
  const { habit_name } = req.body;

  const { data, error } = await supabase
    .from("habits")
    .insert([
      {
        habit_name,
        completed: false
      }
    ])
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Complete Habit
app.put("/habits/:id", async (req, res) => {
  const id = req.params.id;

  const { data, error } = await supabase
    .from("habits")
    .update({
      completed: true
    })
    .eq("id", id)
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Delete Habit
app.delete("/habits/:id", async (req, res) => {
  const id = req.params.id;

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    message: "Habit deleted successfully"
  });
});

// Start Server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

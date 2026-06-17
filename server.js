const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all habits
app.get("/habits", async (req, res) => {
  const { data, error } = await supabase
    .from("habits")
    .select("*");

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Add new habit
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

// Mark habit as completed
app.put("/habits/:id", async (req, res) => {
  const id = req.params.id;

  const { data, error } = await supabase
    .from("habits")
    .update({ completed: true })
    .eq("id", id)
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Delete habit
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

// Start server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(Server running on http://localhost:${PORT});
});
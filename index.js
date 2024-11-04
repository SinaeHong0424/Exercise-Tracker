const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  try {
    const { id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, limit } = req.query;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let exercises = await Exercise.find({ userId: user._id });

    if (from) {
      const fromDate = new Date(from);
      exercises = exercises.filter((ex) => ex.date >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      exercises = exercises.filter((ex) => ex.date <= toDate);
    }

    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

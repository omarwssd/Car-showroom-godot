const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// =========================
// MONGODB CONNECTION
// =========================
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// =========================
// MONGOOSE SCHEMAS
// =========================

const eventSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    state: { type: String, enum: ["running", "waiting"], default: "running" },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true }
});

const carSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    event_id: { type: Number, required: true },
    username: { type: String, required: true },
    owned_car: { type: String, required: true },
    car_name: { type: String, required: true },
    description: { type: String, required: true },
    suspension_front: { type: Number, default: 0 },
    suspension_rear: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    submitted_at: { type: Number, required: true }
});

const voteSchema = new mongoose.Schema({
    username: { type: String, required: true },
    car_id: { type: Number, required: true },
    event_id: { type: Number, required: true }
});

const winnerSchema = new mongoose.Schema({
    event_id: { type: Number, required: true },
    username: { type: String, required: true },
    car_name: { type: String, required: true },
    description: { type: String, required: true },
    votes: { type: Number, required: true },
    date: { type: Number, required: true }
});

const Event = mongoose.model("Event", eventSchema);
const Car = mongoose.model("Car", carSchema);
const Vote = mongoose.model("Vote", voteSchema);
const Winner = mongoose.model("Winner", winnerSchema);

// =========================
// EVENT TIME CONSTANTS
// =========================
const EVENT_DURATION = 5 * 24 * 60 * 60 * 1000;
const WAIT_DURATION = 24 * 60 * 60 * 1000;

// =========================
// IN-MEMORY STATE
// =========================
let currentEvent = {
    id: 1,
    state: "running",
    startTime: Date.now(),
    endTime: Date.now() + EVENT_DURATION
};

// =========================
// LOAD EVENT FROM DB
// =========================
async function loadEvent() {
    try {
        let event = await Event.findOne().sort({ id: -1 });
        if (!event) {
            event = new Event(currentEvent);
            await event.save();
            console.log("🆕 Created new event in DB");
        } else {
            currentEvent = {
                id: event.id,
                state: event.state,
                startTime: event.startTime,
                endTime: event.endTime
            };
            console.log("💾 Event loaded from DB");
        }
    } catch (error) {
        console.error("❌ Error loading event:", error);
    }
}

// =========================
// SAVE EVENT TO DB
// =========================
async function saveEvent() {
    try {
        await Event.findOneAndUpdate(
            { id: currentEvent.id },
            currentEvent,
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error("❌ Error saving event:", error);
    }
}

// =========================
// EVENT CHECK
// =========================
async function checkEvent() {
    let now = Date.now();

    if (currentEvent.state === "running" && now >= currentEvent.endTime) {
        await finishEvent();
    }

    if (currentEvent.state === "waiting" && now >= currentEvent.endTime) {
        await startNewEvent();
    }

    await saveEvent();
}

// =========================
// FINISH EVENT
// =========================
async function finishEvent() {
    console.log("🏁 Car Show Finished");

    const cars = await Car.find({ event_id: currentEvent.id }).sort({ votes: -1 });

    if (cars.length > 0) {
        const winner = cars[0];
        const winnerDoc = new Winner({
            event_id: currentEvent.id,
            username: winner.username,
            car_name: winner.car_name,
            description: winner.description,
            votes: winner.votes,
            date: Date.now()
        });
        await winnerDoc.save();
    }

    currentEvent.state = "waiting";
    currentEvent.endTime = Date.now() + WAIT_DURATION;

    await saveEvent();
    console.log("⏳ Waiting 1 day");
}

// =========================
// START NEW EVENT
// =========================
async function startNewEvent() {
    await Car.deleteMany({ event_id: currentEvent.id });
    await Vote.deleteMany({ event_id: currentEvent.id });

    currentEvent = {
        id: currentEvent.id + 1,
        state: "running",
        startTime: Date.now(),
        endTime: Date.now() + EVENT_DURATION
    };

    await saveEvent();
    console.log("🚗 New Event:", currentEvent.id);
}

// =========================
// INIT
// =========================
async function init(){

    await mongoose.connection.asPromise();

    await loadEvent();

    console.log("✅ Database ready");

    setInterval(checkEvent, 10000);

}

init();

// =========================
// EVENT INFO
// =========================
app.get("/event", async (req, res) => {
    await checkEvent();

    res.json({
        id: currentEvent.id,
        state: currentEvent.state,
        start_time: currentEvent.startTime,
        end_time: currentEvent.endTime,
        time_remaining: Math.max(0, currentEvent.endTime - Date.now())
    });
});

// =========================
// SUBMIT CAR
// =========================
app.post("/submit_car", async (req, res) => {
    await checkEvent();

    if (currentEvent.state !== "running") {
        return res.json({
            success: false,
            message: "Car show is currently closed"
        });
    }

    const {
        username,
        car_name,
        description,
        owned_car,
        suspension_front,
        suspension_rear
    } = req.body;

    if (!username || !car_name || !description || !owned_car) {
        return res.status(400).json({
            success: false,
            message: "Missing car information"
        });
    }

    const existingCar = await Car.findOne({ username, event_id: currentEvent.id });
    if (existingCar) {
        return res.status(400).json({
            success: false,
            message: "You already submitted a car"
        });
    }

    const car = new Car({
        id: Date.now(),
        event_id: currentEvent.id,
        username,
        owned_car,
        car_name,
        description,
        suspension_front: Number(suspension_front) || 0,
        suspension_rear: Number(suspension_rear) || 0,
        votes: 0,
        submitted_at: Date.now()
    });

    await car.save();

    console.log("🚗 Car submitted:", car_name, "by", username);

    res.json({
        success: true,
        message: "Car submitted successfully",
        car
    });
});

// =========================
// GET CARS
// =========================
app.get("/cars", async (req, res) => {
    await checkEvent();
    const cars = await Car.find({ event_id: currentEvent.id });
    res.json(cars);
});

// =========================
// VOTE
// =========================
app.post("/vote", async (req, res) => {
    await checkEvent();

    if (currentEvent.state !== "running") {
        return res.json({
            success: false,
            message: "Car show is currently closed"
        });
    }

    const { username, car_id } = req.body;

    const car = await Car.findOne({ id: car_id, event_id: currentEvent.id });
    if (!car) {
        return res.json({
            success: false,
            message: "Car not found"
        });
    }

    if (car.username === username) {
        return res.json({
            success: false,
            message: "Cannot vote for yourself"
        });
    }

    const existingVote = await Vote.findOne({ username, event_id: currentEvent.id });
    if (existingVote) {
        return res.json({
            success: false,
            message: "Already voted"
        });
    }

    const vote = new Vote({
        username,
        car_id,
        event_id: currentEvent.id
    });
    await vote.save();

    car.votes += 1;
    await car.save();

    console.log("🗳 Vote:", username, "->", car.car_name);

    res.json({
        success: true,
        votes: car.votes
    });
});

// =========================
// LEADERBOARD
// =========================
app.get("/leaderboard", async (req, res) => {
    await checkEvent();
    const cars = await Car.find({ event_id: currentEvent.id }).sort({ votes: -1 });
    res.json(cars);
});

// =========================
// WINNERS
// =========================
app.get("/winners", async (req, res) => {
    const winners = await Winner.find().sort({ date: -1 });
    res.json(winners);
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log(`🚗 Car Show Server running on ${PORT}`);
});

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const EVENT_DURATION = 5 * 24 * 60 * 60 * 1000;


// =========================
// EVENT
// =========================

let currentEvent = {
    id: 1,
    startTime: Date.now(),
    endTime: Date.now() + EVENT_DURATION
};


// =========================
// DATA
// =========================

let cars = [];
let votes = [];
let winners = [];


// =========================
// CHECK EVENT
// =========================

function checkEvent() {

    if (Date.now() >= currentEvent.endTime) {
        resetEvent();
    }

}


// =========================
// RESET EVENT
// =========================

function resetEvent() {

    console.log("🏁 Car Show Finished");


    if (cars.length > 0) {

        let winner = [...cars]
            .sort((a,b) => b.votes - a.votes)[0];


        winners.push({

            event_id: currentEvent.id,

            username: winner.username,

            car_name: winner.car_name,

            description: winner.description,

            votes: winner.votes,

            date: Date.now()

        });


        console.log(
            "🏆 Winner:",
            winner.username
        );
    }


    cars = [];
    votes = [];


    currentEvent = {

        id: currentEvent.id + 1,

        startTime: Date.now(),

        endTime: Date.now() + EVENT_DURATION

    };


    console.log(
        "🚗 New Car Show Event:",
        currentEvent.id
    );
}


setInterval(checkEvent, 60000);



// =========================
// EVENT INFO
// =========================

app.get("/event", (req,res)=>{

    checkEvent();

    res.json({

        id: currentEvent.id,

        start_time: currentEvent.startTime,

        end_time: currentEvent.endTime,

        time_remaining:
        Math.max(
            0,
            currentEvent.endTime - Date.now()
        )

    });

});



// =========================
// SUBMIT CAR
// =========================

app.post("/submit_car", (req,res)=>{

    checkEvent();


    const {

        username,

        car_name,

        description,

        owned_car,


        // VISUAL UPGRADES

        suspension_front,

        suspension_rear


    } = req.body;



    if(
        !username ||
        !car_name ||
        !description ||
        !owned_car
    ){

        return res.status(400).json({

            success:false,

            message:"Missing car information"

        });

    }



    // One submission per player

    if(
        cars.find(
            c => c.username === username
        )
    ){

        return res.status(400).json({

            success:false,

            message:
            "You already submitted a car this event"

        });

    }



    const car = {


        id: Date.now(),


        event_id:
        currentEvent.id,



        // PLAYER

        username: username,



        // CAR

        owned_car: owned_car,

        car_name: car_name,

        description: description,



        // VISUAL UPGRADES

        suspension_front:
        suspension_front || 0,


        suspension_rear:
        suspension_rear || 0,



        // VOTES

        votes: 0,


        submitted_at:
        Date.now()

    };



    cars.push(car);



    console.log(
        `🚗 ${username} submitted ${car_name}`
    );



    res.json({

        success:true,

        message:
        "Car submitted successfully",

        car:car

    });


});



// =========================
// GET ALL CARS
// =========================

app.get("/cars",(req,res)=>{

    checkEvent();


    res.json(cars);

});



// =========================
// VOTE
// =========================

app.post("/vote",(req,res)=>{


    checkEvent();



    const {

        username,

        car_id

    } = req.body;



    let car =
    cars.find(
        c => c.id == car_id
    );



    if(!car){

        return res.status(404).json({

            success:false,

            message:"Car not found"

        });

    }



    if(car.username === username){

        return res.status(400).json({

            success:false,

            message:
            "Cannot vote for yourself"

        });

    }



    if(
        votes.find(
            v=>v.username === username
        )
    ){

        return res.status(400).json({

            success:false,

            message:
            "Already voted"

        });

    }



    votes.push({

        username,

        car_id,

        event_id:
        currentEvent.id

    });



    car.votes++;



    res.json({

        success:true,

        votes:
        car.votes

    });


});



// =========================
// LEADERBOARD
// =========================

app.get("/leaderboard",(req,res)=>{

    checkEvent();


    res.json(

        [...cars]
        .sort(
            (a,b)=>
            b.votes-a.votes
        )

    );

});



// =========================
// WINNERS
// =========================

app.get("/winners",(req,res)=>{

    res.json(winners);

});



// =========================
// START SERVER
// =========================

app.listen(PORT,()=>{

    console.log(
        `🚗 Car Show Server running on ${PORT}`
    );

});

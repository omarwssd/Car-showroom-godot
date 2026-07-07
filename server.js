const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


// =========================
// EVENT TIME
// =========================

const EVENT_DURATION = 5 * 24 * 60 * 60 * 1000;
const WAIT_DURATION = 24 * 60 * 60 * 1000;



// =========================
// EVENT
// =========================

let currentEvent = {

    id: 1,

    state: "running",

    startTime: Date.now(),

    endTime:
    Date.now() + EVENT_DURATION

};



// =========================
// DATA
// =========================

let cars = [];

let votes = [];

let winners = [];



// =========================
// EVENT CHECK
// =========================

function checkEvent(){


    let now = Date.now();



    // 5 DAY EVENT END

    if(

        currentEvent.state === "running" &&

        now >= currentEvent.endTime

    ){

        finishEvent();

    }



    // 1 DAY WAIT END

    if(

        currentEvent.state === "waiting" &&

        now >= currentEvent.endTime

    ){

        startNewEvent();

    }


}



// =========================
// FINISH EVENT
// =========================

function finishEvent(){


    console.log(
        "🏁 Car Show Finished"
    );



    if(cars.length > 0){


        let winner =
        [...cars]
        .sort(
            (a,b)=>b.votes-a.votes
        )[0];



        winners.push({

            event_id:
            currentEvent.id,

            username:
            winner.username,

            car_name:
            winner.car_name,

            description:
            winner.description,

            votes:
            winner.votes,

            date:
            Date.now()

        });



        console.log(
            "🏆 Winner:",
            winner.username
        );

    }



    // Enter waiting period

    currentEvent.state = "waiting";


    currentEvent.endTime =
    Date.now() + WAIT_DURATION;



    console.log(
        "⏳ Waiting 1 day before next event"
    );

}



// =========================
// START NEW EVENT
// =========================

function startNewEvent(){


    cars = [];

    votes = [];



    currentEvent = {


        id:
        currentEvent.id + 1,


        state:
        "running",


        startTime:
        Date.now(),


        endTime:
        Date.now() + EVENT_DURATION


    };



    console.log(

        "🚗 New Car Show Event:",
        currentEvent.id

    );

}



setInterval(
    checkEvent,
    60000
);



// =========================
// EVENT INFO
// =========================

app.get("/event",(req,res)=>{


    checkEvent();



    res.json({


        id:
        currentEvent.id,


        state:
        currentEvent.state,


        start_time:
        currentEvent.startTime,


        end_time:
        currentEvent.endTime,


        time_remaining:

        Math.max(

            0,

            currentEvent.endTime -
            Date.now()

        )


    });


});



// =========================
// SUBMIT CAR
// =========================

app.post("/submit_car",(req,res)=>{


    checkEvent();



    if(currentEvent.state !== "running"){


        return res.json({

            success:false,

            message:
            "Car show is currently closed"

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



    if(

        !username ||

        !car_name ||

        !description ||

        !owned_car

    ){

        return res.status(400).json({

            success:false,

            message:
            "Missing car information"

        });

    }



    if(

        cars.find(
            c=>c.username===username
        )

    ){

        return res.status(400).json({

            success:false,

            message:
            "You already submitted a car"

        });

    }



    let car = {


        id:
        Date.now(),


        event_id:
        currentEvent.id,


        username,


        owned_car,


        car_name,


        description,



        suspension_front:
        suspension_front || 0,


        suspension_rear:
        suspension_rear || 0,



        votes:0,


        submitted_at:
        Date.now()


    };



    cars.push(car);



    res.json({

        success:true,

        message:
        "Car submitted successfully",

        car

    });


});



// =========================
// GET CARS
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
        c=>c.id == car_id
    );



    if(!car){

        return res.json({

            success:false,

            message:
            "Car not found"

        });

    }



    if(car.username === username){

        return res.json({

            success:false,

            message:
            "Cannot vote for yourself"

        });

    }



    if(

        votes.find(
            v=>v.username===username
        )

    ){

        return res.json({

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
            (a,b)=>b.votes-a.votes
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

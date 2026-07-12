const express = require("express");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());


// =========================
// SAVE FILE
// =========================

const SAVE_FILE = "./data.json";



// =========================
// EVENT TIME
// =========================

const EVENT_DURATION = 5 * 24 * 60 * 60 * 1000;

const WAIT_DURATION = 24 * 60 * 60 * 1000;



// =========================
// DEFAULT EVENT
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
// LOAD SAVE DATA
// =========================

function loadData(){

    if(!fs.existsSync(SAVE_FILE)){
        saveData();
        return;
    }


    const data = JSON.parse(
        fs.readFileSync(SAVE_FILE)
    );


    currentEvent = data.currentEvent || currentEvent;

    cars = data.cars || [];

    votes = data.votes || [];

    winners = data.winners || [];


    console.log("✅ Data loaded");

}


loadData();


// =========================
// SAVE SYSTEM
// =========================

function saveData(){

    const data = {

        currentEvent,
        cars,
        votes,
        winners

    };


    fs.writeFileSync(
        SAVE_FILE,
        JSON.stringify(
            data,
            null,
            4
        )
    );

}



// =========================
// LOAD SYSTEM
// =========================

function loadData(){


    if(!fs.existsSync(SAVE_FILE)){


        saveData();


        console.log(
            "🆕 Created new save"
        );


        return;

    }



    try{


        const data = JSON.parse(

            fs.readFileSync(
                SAVE_FILE,
                "utf8"
            )

        );



        currentEvent =
        data.currentEvent || currentEvent;



        cars =
        data.cars || [];



        votes =
        data.votes || [];



        winners =
        data.winners || [];



        console.log(
            "💾 Save loaded"
        );


    }

    catch(error){


        console.log(
            "❌ Load error:",
            error
        );


    }


}



// =========================
// EVENT CHECK
// =========================

function checkEvent(){

    let now = Date.now();


    if(
        currentEvent.state === "running" &&
        now >= currentEvent.endTime
    ){

        finishEvent();

    }



    if(
        currentEvent.state === "waiting" &&
        now >= currentEvent.endTime
    ){

        startNewEvent();

    }


    // SAVE TIMER
    saveData();

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


    }



    currentEvent.state = "waiting";


    currentEvent.endTime =
    Date.now() + WAIT_DURATION;



    saveData();



    console.log(
        "⏳ Waiting 1 day"
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



    saveData();



    console.log(
        "🚗 New Event:",
        currentEvent.id
    );

}



// LOAD SAVE WHEN SERVER STARTS

loadData();



// CHECK EVERY MINUTE

setInterval(
    checkEvent,
    10000
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



    // ONE SUBMISSION PER PLAYER

    if(

        cars.some(
            c => c.username === username
        )

    ){

        return res.status(400).json({

            success:false,

            message:
            "You already submitted a car"

        });

    }



    const car = {


        id:
        Date.now(),



        event_id:
        currentEvent.id,



        username,



        owned_car,



        car_name,



        description,



        // VISUAL UPGRADES

        suspension_front:
        Number(suspension_front) || 0,


        suspension_rear:
        Number(suspension_rear) || 0,



        votes:0,



        submitted_at:
        Date.now()


    };



    cars.push(car);



    // SAVE DATA.JSON

    saveData();



    console.log(
        "🚗 Car submitted:",
        car_name,
        "by",
        username
    );



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



    if(currentEvent.state !== "running"){

        return res.json({

            success:false,

            message:
            "Car show is currently closed"

        });

    }



    const {

        username,

        car_id


    } = req.body;



    let car =
    cars.find(
        c => c.id == car_id
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
            v => v.username === username
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



    // SAVE VOTE

    saveData();



    console.log(
        "🗳 Vote:",
        username,
        "->",
        car.car_name
    );



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
            b.votes - a.votes
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

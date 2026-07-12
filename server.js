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
// DATA
// =========================

let cars = [];

let votes = [];

let winners = [];


// =========================
// SAVE SYSTEM
// =========================

function saveData(){

    fs.writeFileSync(

        SAVE_FILE,

        JSON.stringify(
            {
                cars,
                votes,
                winners
            },
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

        console.log("🆕 Created database");

        return;

    }


    try{

        const data = JSON.parse(

            fs.readFileSync(
                SAVE_FILE,
                "utf8"
            )

        );


        cars = data.cars || [];

        votes = data.votes || [];

        winners = data.winners || [];


        console.log("✅ Data loaded");


    }
    catch(error){

        console.log(
            "❌ Load error:",
            error
        );

    }

}


loadData();



// =========================
// SUBMIT CAR
// =========================

app.post("/submit_car",(req,res)=>{


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

        return res.json({

            success:false,

            message:"Missing car information"

        });

    }



    if(

        cars.find(
            c => c.username === username
        )

    ){

        return res.json({

            success:false,

            message:"You already submitted a car"

        });

    }



    const car = {


        id:
        Date.now(),


        username,


        owned_car,


        car_name,


        description,


        suspension_front:
        Number(suspension_front) || 0,


        suspension_rear:
        Number(suspension_rear) || 0,


        votes:0,


        submitted_at:
        Date.now()

    };



    cars.push(car);



    saveData();



    console.log(
        "🚗 Car submitted:",
        car_name
    );



    res.json({

        success:true,

        message:"Car submitted successfully",

        car

    });


});




// =========================
// GET CARS
// =========================

app.get("/cars",(req,res)=>{


    res.json(cars);


});




// =========================
// VOTE
// =========================

app.post("/vote",(req,res)=>{


    const {

        username,

        car_id

    } = req.body;



    const car = cars.find(

        c => c.id == car_id

    );



    if(!car){

        return res.json({

            success:false,

            message:"Car not found"

        });

    }



    if(car.username === username){

        return res.json({

            success:false,

            message:"Cannot vote for yourself"

        });

    }



    if(

        votes.find(

            v => 
            v.username === username

        )

    ){

        return res.json({

            success:false,

            message:"Already voted"

        });

    }



    votes.push({

        username,

        car_id

    });



    car.votes++;



    saveData();



    res.json({

        success:true,

        votes:car.votes

    });


});




// =========================
// LEADERBOARD
// =========================

app.get("/leaderboard",(req,res)=>{


    res.json(

        [...cars].sort(

            (a,b)=>

            b.votes - a.votes

        )

    );


});




// =========================
// ADD WINNER
// =========================

app.post("/add_winner",(req,res)=>{


    const winner = req.body;



    if(

        !winner.username ||

        !winner.car_name

    ){

        return res.json({

            success:false,

            message:"Invalid winner"

        });

    }



    winners.push({


        event_id:
        winner.event_id || 0,


        username:
        winner.username,


        car_name:
        winner.car_name,


        description:
        winner.description || "",


        votes:
        winner.votes || 0,


        date:
        Date.now()


    });



    saveData();



    console.log(

        "🏆 Winner added:",
        winner.username

    );



    res.json({

        success:true,

        message:"Winner saved"

    });


});




// =========================
// GET WINNERS
// =========================

app.get("/winners",(req,res)=>{


    res.json(winners);


});




// =========================
// CLEAR CARS AFTER EVENT
// =========================

app.post("/clear_cars",(req,res)=>{


    cars = [];

    votes = [];


    saveData();



    res.json({

        success:true,

        message:"Cars cleared"

    });


});




// =========================
// SERVER START
// =========================

app.listen(PORT,()=>{


    console.log(

        `🚗 Car Show Server running on ${PORT}`

    );


});

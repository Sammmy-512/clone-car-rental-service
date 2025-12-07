const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const app = express();
app.set("view engine", "ejs");      //ejs
app.use(express.urlencoded({ extended: true })); //forms

// setup sessions
const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
   resave: false,
   saveUninitialized: true
}))

require("dotenv").config()   
const mongoose = require('mongoose')

// TODO: update this section with Vercel specific deployment code
app.use(express.static("public"));  // css files
//app.use("/images", express.static("public/images"));



// TODO: Put your model and schemas here

const carSchema = new mongoose.Schema({
    model: String,
    image_url: String,
    return_date: String,
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    car: {model: String, image_url: String, return_date: String}
})

const users = new mongoose.model("users", userSchema)
const cars = new mongoose.model("cars", carSchema)


// TODO: Modify your endpoint logic
app.get("/", async (req, res) => {  
    return res.render("login.ejs")
})
app.post("/login", async (req, res)=>{
     const form_data = req.body
     const new_user = await users.findOne({email: form_data.email})
     //const new_password = await users.findOne({password: form_data.password})

// req.session.userInfo = {
//        email: req.body.email,
//        password: req.body.password
//    }

   if(new_user){
    const password_match = form_data.password == new_user.password
    if(password_match){

    req.session.userInfo = {
       email: form_data.email,
       password: form_data.password,
       
   }

    return res.redirect("/cars")
    }

    else{
        console.log("Invalid! try again with correct login info.")
        return res.redirect("/")
    }

   }

   else {
        await users.create({email: form_data.email, password: form_data.password})
        req.session.userInfo = {
      email: form_data.email,
      password: form_data.password,
      
   }
        return res.redirect("/cars")
   }


    
})
app.get("/logout", async (req,res) => {
    req.session.destroy()
    return res.redirect("/")
})
app.get("/cars", async (req, res) => { 
    const sess = req.session.userInfo
    const car_arr = await cars.find() 
   // const car_url = await cars.find
   if (!req.session.userInfo) {
        return res.redirect("/");
    }
    const curr_user = await users.findOne({email: sess.email})
    return res.render("cars.ejs", {car_am: car_arr, user: curr_user})
})



app.get("/return/:model", async (req, res) => {
    if (!req.session.userInfo) {
        return res.redirect("/");
    }
    const sess = req.session.userInfo;
    const carModel = req.params.model;

    if (!sess) return res.redirect("/");

    
    await users.updateOne(
        { email: sess.email },
        { $unset: { car: "" } }
    );

    
    await cars.updateOne(
        { model: carModel },
        { $set: { return_date: "" } }
    );

   

    return res.redirect("/cars");
});






app.get("/book/:model", async (req,res)=>{
    if (!req.session.userInfo) {
        return res.redirect("/");
    }
    const model = req.params.model
    return res.render("bookingForm.ejs", {model: model})
})
app.post("/book/:model", async (req,res)=>{
    if (!req.session.userInfo) {
        return res.redirect("/");
    }
    // get booking form data 
    const whip = await cars.findOne({model: req.params.model})
    const date = req.body.date
    const user = req.session.userInfo

    const registrant = await users.findOne({email: user.email})

    await users.findByIdAndUpdate(registrant._id, {car: {
        model: whip.model, 
        image_url: whip.image_url, 
        return_date: date}}, {new: true})
    
     await cars.updateOne(
        { model: whip.model },
        { $set: { return_date: date } }
    );

     req.session.userInfo.car = {
        model: whip.model,
        image_url: whip.image_url,
        return_date: date
    };

    return res.redirect("/cars")
})

async function Prepopulate(){
    const count = await cars.countDocuments() 

    if(count === 0){
    await cars.insertMany([
        {model: "BMW M5", image_url: "/BMW_M5.jpg", return_date: ""},
        {model: "BMW Alpina B7", image_url: "/BMW_Alpina_B7.jpg", return_date: ""},
        {model: "bmw X5 M sport", image_url: "/bmw_X5_M_sport.jpg", return_date: ""},
        {model: "Rolls-Royce Ghost", image_url: "/Rolls-Royce_Ghost.jpg", return_date: ""},
        {model: "Rolls-Royce Phantom", image_url: "/Rolls-Royce_Phantom.jpg", return_date: ""}
    ])
    }
}


async function startServer() {
    try {    
        // TODO: Update this
        await mongoose.connect(process.env.MONGO_URI)
        Prepopulate()
        console.log("SUCCESS connecting to MONGO database")
        console.log("STARTING Express web server")        
        
        app.listen(HTTP_PORT, () => {     
            console.log(`server listening on: http://localhost:${HTTP_PORT}`) 
        })    
    }
    catch (err) {        
        console.log("ERROR: connecting to MONGO database")        
        console.log(err)
        console.log("Please resolve these errors and try again.")
    }
}
startServer()






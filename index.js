const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const session = require('express-session');
const cors = require("cors");
const app = express();

// Default Page Handler
const userdata = {"uname":""};

app.use(session({
    secret: 'default',
    resave: false,
    saveUninitialized: true,    
}))

app.use(express.urlencoded({extended:true}));
app.use(express.static("./uploads"));
app.use(express.static("./static"));
app.use(cors());

app.set("view engine","ejs");
app.set("views","./views");

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, './uploads')},
    filename: function (req, file, cb) { cb(null, Date.now()+'-'+file.originalname) }
}) 
const upload = multer({ storage: storage });

mongoose.connect("mongodb://localhost:27017/news")
.then(()=>{console.log("DB Connect")})
.catch(((err)=>{console.log(err)}));

const userSchema = new mongoose.Schema({
    full_name : {type:String, required:true},
    uname : {type:String, required:true},
    pwd : {type:String, required:true},
    mobile : {type:String, required:true},
    email : {type:String, required:true},
    photo : {type:String, required:true},
    otp : {type:String, required:false},
});
const Users = new mongoose.model("users",userSchema);

const contactSchema = new mongoose.Schema({    
    full_name : {type:String, required:true},    
    email : {type:String, required:true},
    comment : {type:String, required:true},    
});
const Contact = new mongoose.model("contact",contactSchema);

app.get("/", async (req,res)=>{
    if(req.session.username){
        return res.redirect("/home");
    }
    else{
        const news_data = await News.find({});
        return res.render("index",{userdata,news_data});
    }
});

app.get("/reg",(req,res)=>{
    if(req.session.uname){
        return res.redirect("/home");
    }
    else{
        return res.render("reg",{userdata});
    }
})

app.post("/reg",upload.single("photo"),(req,res)=>{    
    const {full_name,uname,pwd,mobile,email} = req.body;    
    const photo = req.file.filename;
    Users({full_name,uname,pwd,mobile,email,photo}).save();
    return res.redirect("/login");
})

app.get("/login",(req,res)=>{
    res.render("login",{userdata});
});

app.post("/login", async (req,res)=>{
    const {uname,pwd} = req.body;
    const check = await Users.findOne({uname:uname,pwd:pwd});
    if(check){
        req.session.username = {uname:uname};
        req.session.userid = {_id:check.id};
        return res.redirect("/home");
    }
    else{
        return res.send("Invalid Credentials..");
    }
});

app.get("/forgot_password",(req,res)=>{
    return res.render("forgot_password",{userdata});
});

app.get("/about", async (req,res)=>{
    if(req.session.username){
        const userdata = await Users.findOne(req.session.username);
        return res.render("about",{userdata});
    }
    else{
        return res.render("about",{userdata});
    }
});

app.get("/contact", async (req,res)=>{    
        if(req.session.username){
        const userdata = await Users.findOne(req.session.username);
        return res.render("contact",{userdata});
    }
    else{
        return res.render("contact",{userdata});
    }
});

app.post("/contact_us",async (req,res)=>{
    if(req.session.username){
        const {full_name,email,comment} = req.body;
        await Contact({full_name,email,comment}).save();
        return res.redirect("/home");
    }
    else{
        return res.redirect("/login");
    }
})

app.post("/send_and_update_otp", async (req,res)=>{    
    const email = req.body.email;
    const date = Date.now().toString();
    const otp = date.slice(7,13);
    const check = await Users.findOne({email:email});
    if(check){
        req.session.email = {email:check.email};
        Users.findOneAndUpdate({email:email},{otp:otp}).then(()=>{
            async function sendMail(){
                const transporter = nodemailer.createTransport({
                    service : 'gmail',
                    auth : { 
                        user : "vitaursoft@gmail.com", 
                        pass : "fhrsnmebxtvgouis",
                    }
                });
                const mailOptions = {
                    from : "vitaursoft@gmail.com", 
                    to   : email,
                    subject : "VIT News Otp",
                    text : "OTP: " + otp,
                }
                try{
                    await transporter.sendMail(mailOptions); 
                    console.log("Otp Send Success...");
                }
                catch(err){ console.log("Error Send Mail",err); }
                };
            sendMail();            
        });
        return res.redirect("/otpAuth");
    }
    else{ return res.send("Enter Register Email ID"); }
});

app.get("/otpAuth",(req,res)=>{
    res.render("otpAuth",{userdata});    
});

app.get("/otp_expired",(req,res)=>{
    const email = req.session.email.email;
    console.log(email);
    const otp = null;
    Users.findOneAndUpdate({email:email},{otp:otp}).then(()=>{
        res.redirect("/login");
    });
});

app.post("/forgot_password", (req,res)=>{
    const {otp,pwd,c_pwd} = req.body;
    if(pwd===c_pwd){
        Users.findOneAndUpdate({otp:otp},{pwd:c_pwd}).then(()=>{
            return res.redirect("/login");
        }).catch(()=>{
            res.send("Enter Valid OTP")
        });
    }
    else{
        res.send("Enter Confirm Password")
    }
})

const newsSchema = new mongoose.Schema({
    title : {type:String, required:true},
    description : {type:String, required:true},
    news_banner : {type:String, required:true}
});

const News = new mongoose.model("news",newsSchema);

app.get("/home", async (req,res)=>{
    if(req.session.username){
        const userdata = await Users.findOne(req.session.username);
        const news_data = await News.find({});
        return res.render("home",{userdata,news_data});
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/edit_profile", async (req,res)=>{
    if(req.session.username){
        const userdata = await Users.findById(req.session.userid);
        return res.render("edit_profile",{userdata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/update/:id",(req,res)=>{
    const id = req.params.id;
    const {full_name,uname,mobile,email} = req.body;
    req.session.username = {uname:uname};
    Users.findByIdAndUpdate(id,{full_name,uname,mobile,email}).then(()=>{
        return res.redirect("/home");
    });
});

app.get("/change_photo",async (req,res)=>{
    if(req.session.username){
        const userdata = await Users.findOne(req.session.username);
        return res.render("change_photo",{userdata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/single_page",async (req,res)=>{
    if(req.session.username){
        const news_id = req.body.news_id;
        const userdata = await Users.findOne(req.session.username);
        const news_data = await News.findById({_id:news_id});
        return res.render("single_page",{news_data,userdata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/change_photo/:id", upload.single("photo") ,async (req,res)=>{
    if(req.session.username){
        const id = req.params.id;
        const photo = req.file.filename;
        await Users.findByIdAndUpdate(id,{photo}).then(()=>{
            res.redirect("/home");
        })
    }
    else{
        return res.redirect("/reg");
    }
});

app.get("/logout",(req,res)=>{
    req.session.destroy();
    return res.redirect("/");
});

app.get("/delete_account/:id", async (req,res)=>{
    if(req.session.username){
        const id = req.params.id;
        req.session.destroy();
        await Users.findByIdAndDelete(id,{}).then(()=>{
            res.redirect("/home");
        })
    }
    else{
        return res.redirect("/reg");
    }    
});

app.listen(1000,()=>console.log("Server Start : http://localhost:1000 "));
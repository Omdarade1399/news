const express = require("express");
const ejs = require("ejs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// Default Page Handler
const admindata = {"uname":""};

app.use(session({ secret: 'default',resave: false,saveUninitialized: true}))

app.use(express.urlencoded({extended:true}));
app.use(express.static("../uploads"));
app.use(express.static("../static"));
app.use(cors());

app.set("view engine","ejs");
app.set("views","./views");

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, '../uploads')},
    filename: function (req, file, cb) { cb(null, Date.now()+'-'+file.originalname) }
});

const upload = multer({ storage: storage });

mongoose.connect("mongodb://localhost:27017/news")
.then(()=>{console.log("DB Connect")})
.catch(((err)=>{console.log(err)}));

const newsSchema = new mongoose.Schema({
    title : {type:String, required:true},
    description : {type:String, required:true},
    news_banner : {type:String, required:true}
});

const adminSchema = new mongoose.Schema({
    name : {type:String, required:true},
    uname : {type:String, required:true},
    pwd : {type:String, required:true},
    mobile : {type:String, required:true},
    email : {type:String, required:true},
    photo : {type:String, required:true},
    otp : {type:String, required:false},
});

const userSchema = new mongoose.Schema({
    full_name : {type:String, required:true},
    uname : {type:String, required:true},
    pwd : {type:String, required:true},
    mobile : {type:String, required:true},
    email : {type:String, required:true},
    photo : {type:String, required:true},
    otp : {type:String, required:false},
});


const contactSchema = new mongoose.Schema({    
    full_name : {type:String, required:true},    
    email : {type:String, required:true},
    comment : {type:String, required:true},    
});

const Contact = new mongoose.model("contact",contactSchema);
const Admin = new mongoose.model("admin",adminSchema);
const Users = new mongoose.model("users",userSchema);
const News = new mongoose.model("news",newsSchema);

app.get("/",(req,res)=>{
    if(req.session.admin){
        return res.redirect("/home");
    }
    else{
        return res.render("login",{admindata});
    }
});

app.get("/login",(req,res)=>{
    if(req.session.admin){
        return res.redirect("/home");
    }
    else{
        return res.render("login",{admindata});
    }
})

app.post("/login",async (req,res)=>{
    const {uname,pwd} = req.body;
    const check = await Admin.findOne({uname:uname,pwd:pwd});
    if(check){
        req.session.admin = {uname:uname};
        req.session.adminid = {_id:check.id};
        return res.redirect("home");
    }
    else{
        return res.redirect("/reg");
    }
});

app.get("/logout",(req,res)=>{
    req.session.destroy();
    return res.redirect("/");
});

app.get("/home", async (req,res)=>{
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        const usersdata = await Users.find({});
        return res.render("add_news",{admindata,usersdata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/add_news", upload.single('news_banner'), async (req,res)=>{
    if(req.session.admin){
        const {title,description} = req.body;
        const news_banner = req.file.filename;
        await News({title,description,news_banner}).save().then(()=>{
            return res.redirect("/read_news");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/add_new_user",async (req,res)=>{    
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        return res.render("add_new_user",{admindata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/add_user",upload.single("photo"), async (req,res)=>{
    const {full_name,uname,pwd,mobile,email} = req.body;
    const photo = req.file.filename;
    if(req.session.admin){
        await Users({full_name,uname,pwd,mobile,email,photo}).save();
        return res.redirect("/read_user");
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/delete_news/:id", async (req,res)=>{
    if(req.session.admin){
        const id = req.params.id;
        await News.findByIdAndDelete(id).then(()=>{
            return res.redirect("/read_news");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/read_news", async (req,res)=>{
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        const news_data = await News.find({});        
        return res.render("read_news",{news_data,admindata});
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/edit_news/:id",async (req,res)=>{
    if(req.session.admin){
        const id = req.params.id;
        const admindata = await Admin.findOne(req.session.admin);
        const data = await News.findById(id);
        return res.render("edit_news",{data,admindata});
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/contact_us",async (req,res)=>{
    if(req.session.admin){
        const contactdata = await Contact.find({});
        const admindata = await Admin.findOne(req.session.admin);
        return res.render("read_contact",{admindata,contactdata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/update_news/:id", upload.single("news_banner"),async (req,res)=>{
    if(req.session.admin){
        const {title,description} = req.body;
        const news_banner = req.file.filename;
        const id = req.params.id;
        await News.findByIdAndUpdate(id,{title,description,news_banner}).then(()=>{
            res.redirect("/read_news");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/change_photo",async (req,res)=>{
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        return res.render("change_photo",{admindata});
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/update_photo", upload.single("photo"), async (req,res)=>{
    const photo = req.file.filename;
    if(req.session.admin){
        await Admin.findOneAndUpdate(req.session.admin,{photo:photo}).then(()=>{
            return res.redirect("/home");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/read_user",async (req,res)=>{
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        const users_data = await Users.find({});        
        return res.render("read_user",{admindata,users_data});
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/edit_user/:id",async (req,res)=>{    
    const id = req.params.id;
    if(req.session.admin){
        const admindata = await Admin.findOne(req.session.admin);
        const user_data = await Users.findById(id);
        return res.render("edit_user",{admindata,user_data});
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/delete_user/:id", async (req,res)=>{
    if(req.session.admin){
        const id = req.params.id;
        await Users.findByIdAndDelete(id).then(()=>{
            return res.redirect("/read_user");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.post("/update",async (req,res)=>{
    const {id,full_name,uname,mobile,email} = req.body;
    if(req.session.admin){
        await Users.findByIdAndUpdate(id,{full_name,uname,mobile,email}).then(()=>{
            return res.redirect("/read_user");
        })
    }
    else{
        return res.redirect("/login");
    }
});

app.get("/forgot_password",(req,res)=>{
    res.render("forgot_password",{admindata});
})

app.post("/generate_and_update_otp", async (req,res)=>{    
    const email = req.body.email;    
    const no = Date.now();
    const text = no.toString();
    const otp = text.substring(7,14);
    const check = await Admin.findOne({email:email});    
    if(check){        
        req.session.email = {email:check.email};
        Admin.findOneAndUpdate({email:email},{otp:otp}).then(()=>{
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
            return res.redirect("/otpAuth");
        });
    }
    else{ 
        return res.send("Enter Register Email ID"); 
    }
})

app.get("/otpAuth",(req,res)=>{    
    res.render("otpAuth",{admindata});
})

app.get("/otp_expired",(req,res)=>{
    const email = req.session.email.email;    
    const otp = null;
    Admin.findOneAndUpdate({email:email},{otp:otp}).then(()=>{
        res.redirect("/login");
    });
});

app.listen(2000,()=>console.log("Server Start : http://localhost:2000 "));
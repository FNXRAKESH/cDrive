const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
var router = express.Router();
var bodyParser = require("body-parser");
var session = require("express-session");
var cors = require("cors");
const app = express();
app.use(cors());
const { uuid } = require("uuidv4");
const dev = app.get("env") !== "production";
if (!dev) {
  app.disable("x-powered-by");
  app.use(compression());
  app.use(morgan("common"));
}
const port = process.env.PORT || 9000;
app.listen(port);
router.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);
app.get("/", function (req, res) {
  res.send("Hello!");
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var db, otpStatus;
const mongoose = require("mongoose");
const { filter } = require("compression");
mongoose.set("useUnifiedTopology", true);
mongoose.connect(
  "mongodb+srv://rakesh:rocman911@udrive.oo3q3.mongodb.net/uDrive?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);
mongoose.connect(
  "mongodb+srv://rakesh:rocman911@udrive.oo3q3.mongodb.net/uDrive?retryWrites=true&w=majority",
  function (err, database) {
    if (err) return console.log("error ", err);
    db = database;
    console.log("App is listening on port " + port);
  }
);
app.post("/api/register", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  sendOtp.send(`${req.body.formattedValue}`, "PRIIND", function (error, data) {
    otpStatus = data.type;
    res.json(data.type);
  });
});
app.post("/api/resendOtp", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  sendOtp.retry(`${req.body.formattedValue}`, true, function (error, data) {});
});
app.post("/api/verifyOtp", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  var ObjectID = require("mongodb").ObjectID;
  var user = {
    phone: req.body.formattedValue,
    password: req.body.password,
    role: req.body.selectedValue,
    _id: new ObjectID(),
  };

  if (otpStatus === "success") {
    sendOtp.verify(`${req.body.formattedValue}`, `${req.body.otp}`, function (
      error,
      data
    ) {
      if (data.type == "success") {
        const query = db
          .collection("Registration")
          .find({ phone: req.body.formattedValue })
          .toArray(function (err, result) {
            if (result.length > 0)
              return res.json({ data: "already registered" });
            else {
              db.collection("Registration").insertOne(user);
              res.json({ data: "record added" });
            }
          });
      }
      if (data.type == "error") {
        res.json({ data: "otp failed" });
      }
    });
  }
});
app.post("/api/pushNotification", (req, res) => {
  var ObjectID = require("mongodb").ObjectID;
  var user = {
    token: req.body.token,
    _id: new ObjectID(),
  };
  db.collection("PushNotification")
    .find({ token: req.body.token })
    .toArray(function (err, result) {
      if (result.length > 0)
        return res.json({ data: "already added this pushNotification" });
      else {
        db.collection("PushNotification").insertOne(user);
        res.json({ data: "pushNotification added" });
      }
    });
});

app.post("/api/login", (req, res) => {
  var role,
    phone,
    carDetails = "true",
    number;
  db.collection("Registration")
    .find({ phone: req.body.formattedValue, password: req.body.password })
    .toArray(function (err, result) {
      if (result.length <= 0) return res.json({ data: "no data" });
      // else return res.json({ data: 'data available' })
      else {
        result.map((data) => {
          console.log("====================================");
          console.log(data.carDetails);
          console.log("====================================");
          if (data.carDetails === undefined) {
            carDetails = "false";
          }
          role = data.role;
          phone = data.phone;
          if (data.carDetails !== undefined) {
            number = data.carDetails.number;
          }
        });
      }
      if (role === "Admin") return res.json({ data: "Admin", phone: phone });
      if (role === "Driver")
        return res.json({ data: "Driver", phone: phone, carDetails: number });
    });
});

app.post("/api/addTrip", (req, res) => {
  var ObjectID = require("mongodb").ObjectID;
  var today = new Date();
  var trip = {
    postedBy: req.body.phone,
    fromLat: req.body.fromLat,
    fromLong: req.body.fromLong,
    toLat: req.body.toLat,
    toLong: req.body.toLong,
    duration: req.body.duration,
    distance: req.body.distance,
    passengersCount: req.body.selectedValue,
    fromAddress: req.body.fromAddress,
    toAddress: req.body.toAddress,
    date: today,
    status: "new trip",
    tripId: uuid(),
    rate: req.body.rate,
    token: req.body.tok,
    _id: new ObjectID(),
  };
  if (req.body.distance === 0)
    return res.json({ data: "No route for entered locations" });
  if (req.body.selectedValue === "number of passenger")
    return res.json({ data: "Enter number of passengers" });
  const query = db.collection("Trip").insertOne(trip);
  res.json({ data: "trip added" });
});
app.post("/api/showAdminTrip", (req, res) => {
  db.collection("Trip")
    .find({ postedBy: req.body.phone })
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });
      else {
        var data = result.sort((a, b) =>
          a.date > b.date ? -1 : b.date > a.date ? 1 : 0
        );
        res.send(data);
      }
    });
});
app.post("/api/deleteTrip", (req, res) => {
  db.collection("Trip")
    .deleteOne({ tripId: req.body.id })
    .then(() => {
      db.collection("Trip")
        .find({ postedBy: req.body.phone })
        .toArray(function (err, result) {
          if (err) throw err;
          if (result.length <= 0) return res.json({ data: "no data" });
          else {
            var data = result.sort((a, b) =>
              a.date > b.date ? -1 : b.date > a.date ? 1 : 0
            );
            res.send(data);
          }
        });
    });
});

app.post("/api/showTrip", (req, res) => {
  var filtered, data;

  db.collection("Trip")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });

      result.map((i) => {
        i.hasOwnProperty("cabDetails")
          ? i.cabDetails.map((car) => {
              if (
                car.status === "rejected" &&
                car.number === req.body.carNumber
              ) {
                db.collection("Trip").update(
                  { tripId: i.tripId },
                  {
                    $unset: { cabDetails: { number: req.body.carNumber } },
                    $set: { status: "new trip" },
                  }
                );

                filtered = result.filter(function (el) {
                  return el.tripId !== i.tripId;
                });
              }
              // else if (car.number === req.body.carNumber) {
              //     filtered = result.filter(function (el) { return el.tripId === i.tripId; });
              //     console.log("appplied", filtered);
              // }
            })
          : (data = result.sort((a, b) =>
              a.date > b.date ? -1 : b.date > a.date ? 1 : 0
            ));
      });

      if (filtered !== undefined) {
        var dataResult = data.filter(
          (item1) => !filtered.some((item2) => item2.tripId !== item1.tripId)
        );

        res.send(dataResult);
      } else {
        res.send(data);
      }
    });
});

app.get("/api/getToken", (req, res) => {
  var ObjectID = require("mongodb").ObjectID;
  const query = db
    .collection("PushNotification")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });
      res.json({ data: result });
    });
});

app.post("/api/acceptTrip", (req, res) => {
  console.log("====================================");
  console.log(req.body);
  console.log("====================================");
  var token = "";
  db.collection("History")
    .find({ "trip.tripId": req.body.id, phone: req.body.phone })
    .toArray(function (e, i) {
      if (e) throw e;
      if (i.length > 0) res.json({ data: "already applied" });
      else {
        const query = db
          .collection("Registration")
          .find({ phone: req.body.phone })
          .toArray(function (err, result) {
            if (result.length <= 0) return res.json({ data: "no phone" });
            if (req.body.carNumber === "") alert("no car");
            else {
              result.map((res) => {
                res.carDetails.location = req.body.address;
                res.carDetails.status = "pending";
                db.collection("Trip")
                  .find({ tripId: req.body.id })
                  .toArray(function (err, success) {
                    success.map((i) => {
                      {
                        token = i.token;
                        i.hasOwnProperty("cabDetails")
                          ? i.cabDetails.map((car) => {
                              // if (car.number === req.body.carNumber) return res.json({ data: "already registered" });
                              db.collection("Trip").updateOne(
                                { tripId: req.body.id },
                                {
                                  $set: { status: "applied" },
                                  $push: {
                                    cabDetails: res.carDetails,
                                  },
                                }
                              );
                            })
                          : db.collection("Trip").updateOne(
                              { tripId: req.body.id },
                              {
                                $set: { status: "applied" },
                                $push: {
                                  cabDetails: res.carDetails,
                                },
                              }
                            );
                      }
                    });
                    var History = {
                      trip: success[0],
                      phone: req.body.phone,
                      status: "applied",
                    };
                    db.collection("History").insertOne(History);
                  });
              });
            }

            db.collection("Trip")
              .find({})
              .toArray(function (err, result) {
                if (err) throw err;

                if (result.length <= 0) return res.json({ data: "no data" });
                else {
                  var data = result.sort((a, b) =>
                    a.date > b.date ? -1 : b.date > a.date ? 1 : 0
                  );
                  res.json({ data: data, token: token });
                }
              });
          });
      }
    });
});

app.post("/api/addCarDetails", (req, res) => {
  db.collection("Registration")
    .find({ phone: req.body.phone })
    .toArray(function (err, success) {
      {
        success.map((i) => {
          {
            i.hasOwnProperty("carDetails")
              ? i.carDetails.map((p) => {
                  db.collection("Registration").updateOne(
                    { phone: req.body.phone },
                    {
                      $set: {
                        carDetails: {
                          make: req.body.make,
                          modal: req.body.modal,
                          year: req.body.year,
                          capacity: req.body.capacity,
                          number: req.body.number,
                          phone: req.body.phone,
                        },
                      },
                    }
                  );
                })
              : db.collection("Registration").updateOne(
                  { phone: req.body.phone },
                  {
                    $set: {
                      carDetails: {
                        make: req.body.make,
                        modal: req.body.modal,
                        year: req.body.year,
                        capacity: req.body.capacity,
                        number: req.body.number,
                        phone: req.body.phone,
                      },
                    },
                  }
                );
          }
        });
      }
      res.json({ data: "addCarDetails added" });
    });
});

// app.post('/api/showCabs', (req, res) => {
//     console.log("show trip");
//     var carDetails = []
//     var ObjectID = require('mongodb').ObjectID;
//     const query = db.collection('Registration').find({ role: "Driver", phone: req.body.phone }).toArray(function (err, result) {
//         if (err) throw err;

//         if (result.length <= 0) return res.json({ data: 'no data' })
//         result.map(res => {
//             console.log("result.status ", res.status);
//             carDetails = res
//         })
//         res.json(carDetails)
//     });
// })

app.post("/api/acceptCab", (req, response) => {
  var phone;
  db.collection("Trip")
    .find({ tripId: req.body.tripId })
    .toArray(function (err, result) {
      if (result.length <= 0) return response.json({ data: "no data" });
      else {
        result.map((res) => {
          {
            console.log("result.approvedTo ", res.approvedTo);
            if (res.approvedTo === req.body.carNumber)
              return console.log("already approved");
            else {
              res.cabDetails.map((cab) => {
                if (cab.number === req.body.carNumber) {
                  phone = cab.phone;
                  cab.status = "approved";
                  db.collection("Trip").updateOne(
                    {
                      tripId: req.body.tripId,
                      "cabDetails.number": cab.number,
                    },
                    {
                      $set: {
                        status: "closed",
                        "cabDetails.$.status": "approved",
                        approvedTo: req.body.carNumber,
                      },
                    }
                  );
                } else {
                  cab.status = "applied";
                  db.collection("Trip")
                    .updateOne(
                      {
                        tripId: req.body.tripId,
                        "cabDetails.number": cab.number,
                      },
                      {
                        $set: {
                          status: "closed",
                          "cabDetails.$.status": "applied",
                        },
                      }
                    )
                    .then(() => {
                      console.log("phone ", phone);
                      db.collection("History")
                        .find({ "trip.tripId": req.body.tripId })
                        .toArray(function (err, result) {
                          if (err) throw err;
                          if (result.length <= 0)
                            return response.json({ data: "no data" });
                          else {
                            console.log("inside history else");
                            result.map((i) => {
                              db.collection("History").updateOne(
                                {
                                  "trip.tripId": req.body.tripId,
                                },
                                {
                                  $set: {
                                    status: "approved",
                                    phone: phone,
                                  },
                                }
                              );
                            });
                          }
                        });
                    })
                    .then(() => {
                      db.collection("Trip")
                        .find({})
                        .toArray(function (err, result) {
                          if (err) throw err;
                          if (result.length <= 0)
                            return response.json({ data: "no data" });
                          else {
                            var data = result.sort((a, b) =>
                              a.date > b.date ? -1 : b.date > a.date ? 1 : 0
                            );
                            response.send(data);
                          }
                        });
                    });
                }
              });
            }
          }
        });
      }
    });
});

app.post("/api/rejectCab", (req, res) => {
  db.collection("Trip")
    .find({ tripId: req.body.tripId })
    .toArray(function (err, result) {
      if (result.length <= 0) return res.json({ data: "no data" });
      else {
        result.map((res) => {
          {
            res.cabDetails.map((cab) => {
              if (cab.number === req.body.carNumber) {
                cab.status = "rejected";
                db.collection("Trip").updateOne(
                  { tripId: req.body.tripId, "cabDetails.number": cab.number },
                  {
                    $set: { "cabDetails.$.status": "rejected" },
                  }
                );
              }
            });
          }
        });
      }
      db.collection("History")
        .find({ "trip.tripId": req.body.tripId })
        .toArray(function (err, result) {
          if (err) throw err;
          if (result.length <= 0) return res.json({ data: "no data" });
          else {
            {
              result.map((i) => {
                db.collection("History").updateOne(
                  { "trip.tripId": req.body.tripId, phone: i.phone },
                  {
                    $set: { status: "rejected" },
                  }
                );
              });
            }
          }
        });
      db.collection("Trip")
        .find({})
        .toArray(function (err, result) {
          if (err) throw err;

          if (result.length <= 0) return res.json({ data: "no data" });
          else {
            var data = result.sort((a, b) =>
              a.date > b.date ? -1 : b.date > a.date ? 1 : 0
            );
            res.send(data);
          }
        });
    });
});

app.post("/api/saveProfile", (req, res) => {
  db.collection("Registration")
    .find({ phone: req.body.phone })
    .toArray(function (err, success) {
      {
        success.map((i) => {
          {
            i.hasOwnProperty("profile")
              ? i.profile.map((p) => {
                  db.collection("Registration").updateOne(
                    { phone: req.body.phone },
                    {
                      $set: {
                        phone: req.body.formattedValue,
                        profile: [
                          { email: req.body.email, name: req.body.name },
                        ],
                      },
                    }
                  );
                })
              : db.collection("Registration").updateOne(
                  { phone: req.body.phone },
                  {
                    $set: { phone: req.body.formattedValue },
                    $push: {
                      profile: { email: req.body.email, name: req.body.name },
                    },
                  }
                );
          }
        });
      }
      res.json({ data: "profile updated" });
    });
});

app.post("/api/showProfile", (req, res) => {
  var email, name;
  db.collection("Registration")
    .find({ phone: req.body.phone })
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });
      result.map((i) => {
        i.hasOwnProperty("profile");
        i.profile.map((p) => {
          name = p.name;
          email = p.email;
        });
      });
      res.json({ name, email });
    });
});

app.post("/api/showHistory", (req, res) => {
  db.collection("History")
    .find({ phone: req.body.phone })
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });
      data = result.sort((a, b) =>
        a.date > b.date ? -1 : b.date > a.date ? 1 : 0
      );
      res.json(data);
    });
});

app.post("/api/forgotPassword", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  sendOtp.send(`${req.body.formattedValue}`, "PRIIND", function (error, data) {
    otpStatus = data.type;
    res.json(data.type);
  });
});

app.post("/api/forgotPasswordResendOtp", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  sendOtp.retry(`${req.body.formattedValue}`, true, function (error, data) {});
});
app.post("/api/forgotPasswordVerifyOtp", (req, res) => {
  const SendOtp = require("sendotp");
  const sendOtp = new SendOtp("343917AbMdZykQY83Z5f7e9c68P1");
  var ObjectID = require("mongodb").ObjectID;

  if (otpStatus === "success") {
    sendOtp.verify(`${req.body.formattedValue}`, `${req.body.otp}`, function (
      error,
      data
    ) {
      if (data.type == "success") {
        db.collection("Registration")
          .find({ phone: req.body.formattedValue })
          .toArray(function (err, result) {
            if (result.length <= 0) return res.json({ data: "no data" });
            // else return res.json({ data: 'data available' })
            else {
              db.collection("Registration").updateOne(
                { phone: req.body.phone },
                {
                  $set: {
                    password: req.body.password,
                  },
                }
              );
              res.json({ data: "password Changed" });
            }
          });
      }
      if (data.type == "error") {
        res.json({ data: "otp failed" });
      }
    });
  }
});

app.post("/api/showAllCabs", (req, res) => {
  console.log(req.body);
  db.collection("Registration")
    .find({ phone: { $regex: `.*${req.body.phone}.*` }, role: "Driver" })
    .toArray(function (err, result) {
      if (err) throw err;
      if (result.length <= 0) return res.json({ data: "no data" });

      console.log(result);
      res.json(result);
    });
});

app.post("/api/assignCab", (req, response) => {
  console.log(req.body);
  db.collection("Trip")
    .find({ tripId: req.body.tripId })
    .toArray(function (err, result) {
      if (result.length <= 0) return response.json({ data: "no data" });
      else {
        result.map((res) => {
          {
            console.log("res.cabDetails ", res.cabDetails);
            if (res.cabDetails === undefined) {
              db.collection("Trip")
                .updateOne(
                  { tripId: req.body.tripId },
                  {
                    $set: {
                      status: "closed",
                      cabDetails: [req.body.carNumber],
                      approvedTo: req.body.carNumber.number,
                    },
                  }
                )
                .then(() => {
                  console.log("db history");
                  db.collection("History")
                    .find({ "trip.tripId": req.body.tripId })
                    .toArray(function (err, result) {
                      console.log("history result ", result);
                      if (err) throw err;
                      if (result.length <= 0) {
                        db.collection("History").insert({
                          trip: req.body.trip,
                          phone: req.body.carNumber.phone,
                          status: "approved",
                        });
                      } else {
                        {
                          result.map((i) => {
                            db.collection("History").updateOne(
                              {
                                "trip.tripId": req.body.tripId,
                                phone: i.phone,
                              },
                              {
                                $set: { status: "approved" },
                              }
                            );
                          });
                        }
                      }
                    });
                })
                .then(() => {
                  console.log("db trip");
                  db.collection("Trip")
                    .find({})
                    .toArray(function (err, result) {
                      console.log("trip result ", result);
                      if (err) throw err;
                      if (result.length <= 0)
                        return response.json({ data: "no data" });
                      else {
                        var data = result.sort((a, b) =>
                          a.date > b.date ? -1 : b.date > a.date ? 1 : 0
                        );
                        response.send(data);
                      }
                    });
                });
            } else {
              console.log("inside else");

              db.collection("Trip")
                .updateOne(
                  {
                    tripId: req.body.tripId,
                  },

                  {
                    $push: {
                      cabDetails: { ...req.body.carNumber, status: "approved" },
                    },
                    $set: {
                      status: "closed",

                      approvedTo: req.body.carNumber.number,
                    },
                  }
                )
                .then(() => {
                  console.log("db history");
                  db.collection("History")
                    .find({ "trip.tripId": req.body.tripId })
                    .toArray(function (err, result) {
                      console.log("history result ", result);
                      if (err) throw err;
                      if (result.length <= 0) {
                        db.collection("History").insert({
                          trip: req.body.trip,
                          phone: req.body.carNumber.phone,
                          status: "approved",
                        });
                      } else {
                        {
                          result.map((i) => {
                            db.collection("History").updateOne(
                              {
                                "trip.tripId": req.body.tripId,
                                phone: i.phone,
                              },
                              {
                                $set: { status: "approved" },
                              }
                            );
                          });
                        }
                      }
                    });
                });
            }
          }
        });
      }
    });
});

module.exports = router;

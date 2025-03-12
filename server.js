const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();
const connect = require('./config/database-config.js')
const PORT = process.env.PORT || 3000;

const cors = require('cors');

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: '*' }));
// app.use(express.static(path.join(__dirname, '../coupon-client/dist')));



const claimSchema = new mongoose.Schema({
  ip: String,
  coupon: String,
  claimedAt: { type: Date, default: Date.now },
  cookieId: String
});
const Claim = mongoose.model('Claim', claimSchema);

const counterSchema = new mongoose.Schema({
  name: String,
  value: Number
});

const Counter = mongoose.model('Counter', counterSchema);
const coupons = ["COUPON10", "COUPON20", "COUPON30"];
const CLAIM_INTERVAL = 60 * 1 * 1000;

async function getNextCoupon() {
  let counter = await Counter.findOne({ name: 'couponCounter' });
  if (!counter) {
    counter = new Counter({ name: 'couponCounter', value: 0 });
  }
  const coupon = coupons[counter.value % coupons.length];
  counter.value += 1;
  await counter.save();
  return coupon;
}

app.get('/claim', async (req, res) => {
  // console.log("claimed" , req.ip , "ip" , req.headers['x-forwarded-for'] , " ip " , req.connection.remoteAddress)
  const userIp = req.headers['x-forwarded-for'];
  let cookieId = req.cookies.cookieId;
  
  if (!cookieId) {
    cookieId = Math.random().toString(36).substring(2);
    res.cookie('cookieId', cookieId, { maxAge: CLAIM_INTERVAL });
  }
  
  const cutoff = new Date(Date.now() - CLAIM_INTERVAL);
  console.log("clamedddd")
  const recentClaim = await Claim.findOne({
    $or: [{ ip: userIp }, { cookieId: cookieId }],
    claimedAt: { $gte: cutoff }
  });
  console.log("after clamedddd")
  
  if (recentClaim) {
    const timeLeft = Math.ceil((recentClaim.claimedAt.getTime() + CLAIM_INTERVAL - Date.now()) / 1000);
    return res.json({ success: false, message: `Please wait ${timeLeft} seconds before claiming another coupon.` });
  }
  
  const coupon = await getNextCoupon();
  const newClaim = new Claim({ ip: userIp, coupon, cookieId });
  await newClaim.save();
  
  res.json({ success: true, coupon });
});


app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  await connect();
  console.log('mongodb connected')
});

# Coupon Distribution Backend

A Node.js/Express API that implements a round-robin coupon distribution system with robust abuse prevention mechanisms.

## Features

- RESTful API for coupon distribution
- MongoDB integration for persistent storage
- Round-robin distribution algorithm ensuring fair coupon allocation
- Multi-layered abuse prevention system
- Configurable timeout periods

## Live API

The API is deployed and can be accessed at:
[https://couponbackend-n276.onrender.com](https://couponbackend-n276.onrender.com)

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- Cookie-parser for cookie handling
- CORS support for cross-origin requests

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/claim` | GET    | Claim a coupon using round-robin distribution |

## Setup Instructions

### Prerequisites

- Node.js (v14.0 or higher)
- MongoDB (local installation or Atlas account)
- npm or yarn

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Rishab2245/couponBackend.git
   cd couponBackend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster<clustername>.ob4zq.mongodb.net/test"   
   ```
   Adjust the values as needed.

4. Start the server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Database Schema

The application uses two MongoDB collections:

### Claim
```javascript
const claimSchema = new mongoose.Schema({
  ip: String,
  coupon: String,
  claimedAt: { type: Date, default: Date.now },
  cookieId: String
});
```

### Counter
```javascript
const counterSchema = new mongoose.Schema({
  name: String,
  value: Number
});
```

## Abuse Prevention Strategy

This application implements a multi-layered approach to prevent abuse of the coupon distribution system:

### 1. IP Address Tracking

The system records the IP address of each user who claims a coupon:

```javascript
const userIp = req.headers['x-forwarded-for'];
```

When a user attempts to claim a coupon, the system checks if the same IP has claimed a coupon within the restricted time period:

```javascript
const recentClaim = await Claim.findOne({
  $or: [{ ip: userIp }, { cookieId: cookieId }],
  claimedAt: { $gte: cutoff }
});
```

This prevents users from claiming multiple coupons by:
- Using different browsers on the same device
- Using different devices on the same network (shared IP)
- Using incognito/private browsing modes

### 2. Cookie-Based Tracking

In addition to IP tracking, the system uses browser cookies to identify repeated claims:

```javascript
let cookieId = req.cookies.cookieId;
   
if (!cookieId) {
  cookieId = Math.random().toString(36).substring(2);
  res.cookie('cookieId', cookieId, { maxAge: CLAIM_INTERVAL });
}
```

This adds another layer of protection against abuse by:
- Tracking users even if their IP changes (mobile networks, VPNs)
- Preventing claims from the same browser across multiple sessions
- Creating a unique identifier that persists for the duration of the cooldown period

### 3. Time-Based Restrictions

The system implements a configurable cooldown period between claims:

```javascript
const CLAIM_INTERVAL = 60 * 60 * 1000; // 60 seconds in milliseconds
const cutoff = new Date(Date.now() - CLAIM_INTERVAL);
```

If a user attempts to claim a coupon before the cooldown period has elapsed, they receive an error message with the remaining time:

```javascript
if (recentClaim) {
  const timeLeft = Math.ceil((recentClaim.claimedAt.getTime() + CLAIM_INTERVAL - Date.now()) / 1000);
  return res.json({ success: false, message: `Please wait ${timeLeft} seconds before claiming another coupon.` });
}
```

### 4. Round-Robin Distribution

The system ensures fair distribution of coupons using a round-robin approach:

```javascript
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
```

This prevents any single coupon from being overused and ensures even distribution.

## Effectiveness Against Common Evasion Tactics

This implementation is resistant to several common evasion methods:

| Evasion Tactic | Prevention Mechanism |
|----------------|----------------------|
| Clearing cookies | IP tracking remains in effect |
| Using VPN/proxy | Cookie tracking remains in effect |
| Using incognito mode | Both IP and new cookie tracking are still effective |
| Multiple browsers | IP tracking prevents this |
| Multiple devices on same network | IP tracking prevents this |
| Page refreshing | Both tracking methods persist across refreshes |

## Limitations and Potential Improvements

1. **Shared IP Limitations**: Users behind shared IPs (corporate networks, public WiFi) might be unable to individually claim coupons.

2. **Cookie Deletion**: Advanced users can manually delete cookies to bypass one layer of protection.

3. **IP Rotation Services**: Users with access to IP rotation services could potentially bypass IP-based restrictions.

Potential improvements:
- Browser fingerprinting for additional identification
- Device identification through user-agent analysis
- CAPTCHA for suspicious claim patterns
- Rate limiting by geographic region

## Deployment

### Deploying to Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Set the build command: `npm install`
4. Set the start command: `node server.js`
5. Add environment variables:
   - `PORT`: 3000
   - `MONGODB_URI`: Your MongoDB connection string


# 🌾 Crop Disease Detection & Advisory Platform — Server

A production-grade, AI-powered RESTful API backend for an agricultural advisory platform. Farmers can upload crop images, receive AI-generated disease analysis, consult agricultural experts, participate in a community forum, and receive regional disease outbreak alerts — all in real time.

Built as a final-year full-stack MERN project demonstrating modern backend engineering practices.

---

## 🔗 Repository

**Backend:** https://github.com/israk03/crop-disease-server  
**Frontend:** *(Coming soon)*

---

## ✨ Features

- 🤖 **AI Disease Detection** — Upload a crop image and receive instant disease identification, severity assessment, treatment recommendations, and preventive measures powered by OpenRouter Vision AI
- 🔐 **JWT Authentication** — Secure access token + refresh token rotation with httpOnly cookie strategy
- 👥 **Role-Based Access Control** — Three roles: Farmer, Expert, Admin with granular route-level protection
- 🏗️ **Farm & Crop Management** — Full CRUD with GeoJSON location support for geospatial queries
- 💬 **Expert Consultation** — State-machine lifecycle (PENDING → ACCEPTED → ACTIVE → COMPLETED) with real-time chat
- 🗣️ **Community Forum** — Posts, nested comments, upvotes, expert answer markers, trending algorithm
- 🔴 **Real-Time Communication** — Socket.io for live chat, typing indicators, detection notifications, and disease alerts
- 🔔 **Notification System** — Persistent in-app notifications with real-time delivery and unread badge sync
- 🚨 **Disease Alert System** — Manual admin alerts + automatic outbreak detection via aggregation pipeline cron job
- ☁️ **Weather Advisory** — OpenWeatherMap integration with rule-based farming recommendations per farm location
- 📊 **Admin Analytics Dashboard** — Platform-wide statistics using MongoDB aggregation pipelines
- 🔍 **Unified Search** — Cross-module search across posts, experts, detections, farms, and alerts
- ⚡ **Background Job Processing** — BullMQ + Redis for async AI analysis with retry and exponential backoff
- 📧 **Email Notifications** — Nodemailer for transactional emails
- ⏰ **Scheduled Tasks** — Node-cron for outbreak monitoring, trending score recalculation, and alert cleanup

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT (Access + Refresh Tokens) |
| Real-Time | Socket.io |
| Background Jobs | BullMQ + Redis |
| AI Vision | OpenRouter (Vision Models) |
| File Storage | Cloudinary |
| Email | Nodemailer |
| Validation | Zod |
| Scheduling | Node-cron |
| Weather | OpenWeatherMap API |
| Logging | Winston |

---

## 📁 Project Structure
src/

├── config/           # env, db, redis, cloudinary

├── models/           # Mongoose schemas

│   ├── user.model.ts

│   ├── farm.model.ts

│   ├── crop.model.ts

│   ├── detection.model.ts

│   ├── post.model.ts

│   ├── comment.model.ts

│   ├── consultation.model.ts

│   ├── message.model.ts

│   ├── notification.model.ts

│   └── alert.model.ts

├── modules/          # Feature modules (MVC + Service layer)

│   ├── auth/

│   ├── user/

│   ├── farm/

│   ├── crop/

│   ├── detection/

│   ├── forum/

│   ├── comment/

│   ├── consultation/

│   ├── notification/

│   ├── alert/

│   ├── weather/

│   ├── admin/

│   └── search/

├── services/         # Shared services

│   ├── ai.service.ts

│   ├── upload.service.ts

│   ├── weather.service.ts

│   ├── advisory.service.ts

│   └── notification.service.ts

├── queues/           # BullMQ queue definitions

├── workers/          # Background job processors

├── socket/           # Socket.io setup and handlers

├── jobs/             # Cron job scheduler

├── middlewares/      # Auth, validation, upload, error

├── utils/            # sendResponse, AppError

├── types/            # Express type augmentation

├── app.ts

└── server.ts

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Redis (local install or Redis Cloud)
- Cloudinary account (free tier)
- OpenRouter account (free tier) — [openrouter.ai](https://openrouter.ai)
- OpenWeatherMap API key (free tier)

### Install Redis on Ubuntu/Linux

```bash
sudo apt update && sudo apt install redis-server
sudo systemctl start redis
redis-cli ping  # Should respond: PONG
```

### Installation

```bash
# Clone the repository
git clone https://github.com/israk03/crop-disease-server.git
cd crop-disease-server

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/crop-disease

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OpenRouter (AI Vision)
OPENROUTER_API_KEY=your_openrouter_key

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# OpenWeatherMap
OPENWEATHERMAP_API_KEY=your_key

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Running the Application

You need two terminal windows — the API server and the background worker run as separate processes.

```bash
# Terminal 1 — Start the API server
npm run dev

# Terminal 2 — Start the background detection worker
npm run worker
```

### Build for Production

```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh-token` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Auth | Logout |
| GET | `/api/v1/auth/me` | Auth | Get current user |

### User Profile
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/users/profile` | Auth | Get own profile |
| PATCH | `/api/v1/users/profile` | Auth | Update profile |
| PATCH | `/api/v1/users/profile/avatar` | Auth | Upload avatar |
| DELETE | `/api/v1/users/profile/avatar` | Auth | Remove avatar |
| PATCH | `/api/v1/users/profile/password` | Auth | Change password |
| PATCH | `/api/v1/users/profile/expert` | Expert | Update expert fields |

### Farm & Crop Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/farms` | Farmer | Create farm |
| GET | `/api/v1/farms` | Farmer | Get own farms |
| GET | `/api/v1/farms/:farmId` | Farmer | Get single farm |
| PATCH | `/api/v1/farms/:farmId` | Farmer | Update farm |
| DELETE | `/api/v1/farms/:farmId` | Farmer | Delete farm (soft) |
| POST | `/api/v1/farms/:farmId/crops` | Farmer | Add crop to farm |
| GET | `/api/v1/farms/:farmId/crops` | Farmer | Get crops for farm |
| PATCH | `/api/v1/farms/:farmId/crops/:cropId` | Farmer | Update crop |
| DELETE | `/api/v1/farms/:farmId/crops/:cropId` | Farmer | Delete crop |

### AI Disease Detection
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/detections` | Farmer | Upload image, start analysis |
| GET | `/api/v1/detections` | Farmer | Detection history |
| GET | `/api/v1/detections/:id` | Farmer | Get detection result |
| DELETE | `/api/v1/detections/:id` | Farmer | Delete detection |
| PATCH | `/api/v1/detections/:id/share` | Farmer | Toggle community sharing |

### Community Forum
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/posts` | Farmer/Expert | Create post |
| GET | `/api/v1/posts` | Public | Browse posts |
| GET | `/api/v1/posts/trending` | Public | Trending posts |
| GET | `/api/v1/posts/:id` | Public | Single post |
| PATCH | `/api/v1/posts/:id` | Owner | Edit post |
| DELETE | `/api/v1/posts/:id` | Owner/Admin | Delete post |
| POST | `/api/v1/posts/:id/upvote` | Auth | Toggle upvote |
| POST | `/api/v1/posts/:id/comments` | Auth | Add comment/reply |
| GET | `/api/v1/posts/:id/comments` | Public | Get comments |

### Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| PATCH | `/api/v1/comments/:id` | Owner | Edit comment |
| DELETE | `/api/v1/comments/:id` | Owner/Admin | Delete comment |
| POST | `/api/v1/comments/:id/upvote` | Auth | Toggle upvote |
| PATCH | `/api/v1/comments/:id/accept` | Post owner | Mark accepted answer |

### Expert Consultation
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/consultations` | Farmer | Create request |
| GET | `/api/v1/consultations` | Auth | Get own consultations |
| GET | `/api/v1/consultations/:id` | Auth | Get consultation |
| PATCH | `/api/v1/consultations/:id/accept` | Expert | Accept |
| PATCH | `/api/v1/consultations/:id/cancel` | Farmer | Cancel |
| PATCH | `/api/v1/consultations/:id/complete` | Expert | Complete |
| POST | `/api/v1/consultations/:id/messages` | Auth | Send message |
| GET | `/api/v1/consultations/:id/messages` | Auth | Get chat history |
| POST | `/api/v1/consultations/:id/review` | Farmer | Rate and review |

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/notifications` | Auth | Get notifications |
| GET | `/api/v1/notifications/unread-count` | Auth | Get badge count |
| PATCH | `/api/v1/notifications/read-all` | Auth | Mark all read |
| PATCH | `/api/v1/notifications/:id/read` | Auth | Mark one read |
| DELETE | `/api/v1/notifications/:id` | Auth | Delete notification |

### Disease Alerts
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/alerts` | Public | Active alerts |
| GET | `/api/v1/alerts/my-region` | Farmer | Alerts for my farms |
| GET | `/api/v1/alerts/:id` | Public | Single alert |
| POST | `/api/v1/alerts` | Admin | Create alert |
| PATCH | `/api/v1/alerts/:id/deactivate` | Admin | Deactivate alert |
| DELETE | `/api/v1/alerts/:id` | Admin | Delete alert |

### Weather Advisory
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/weather/farm/:farmId` | Farmer | Weather + advisories for farm |
| GET | `/api/v1/weather/location` | Auth | Weather by coordinates |

### Admin Dashboard
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/admin/stats` | Admin | Platform overview |
| GET | `/api/v1/admin/analytics/detections` | Admin | Detection trends |
| GET | `/api/v1/admin/analytics/diseases` | Admin | Disease frequency |
| GET | `/api/v1/admin/analytics/regional` | Admin | Regional distribution |
| GET | `/api/v1/admin/analytics/consultations` | Admin | Consultation stats |
| GET | `/api/v1/admin/analytics/community` | Admin | Community activity |
| GET | `/api/v1/admin/users` | Admin | User management |
| PATCH | `/api/v1/admin/users/:id/role` | Admin | Change user role |
| PATCH | `/api/v1/admin/users/:id/status` | Admin | Activate/deactivate |
| DELETE | `/api/v1/admin/users/:id` | Admin | Delete user |
| GET | `/api/v1/admin/experts/pending` | Admin | Pending approvals |
| PATCH | `/api/v1/admin/experts/:id/approve` | Admin | Approve expert |
| PATCH | `/api/v1/admin/experts/:id/reject` | Admin | Reject expert |

### Search
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/search` | Public | Unified cross-module search |
| GET | `/api/v1/search/experts` | Public | Expert search with filters |
| GET | `/api/v1/search/posts` | Public | Post search |
| GET | `/api/v1/search/detections` | Farmer | Search own detections |

---

## 🔌 Real-Time Events (Socket.io)

Connect with JWT token in handshake auth:

```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "Bearer YOUR_ACCESS_TOKEN" }
});
```

| Event | Direction | Description |
|-------|-----------|-------------|
| `consultation:join` | Client → Server | Join a consultation chat room |
| `consultation:leave` | Client → Server | Leave a consultation chat room |
| `typing:start` | Client → Server | User started typing |
| `typing:stop` | Client → Server | User stopped typing |
| `typing:update` | Server → Client | Typing status broadcast |
| `message:new` | Server → Client | New chat message |
| `detection:completed` | Server → Client | AI analysis finished |
| `detection:failed` | Server → Client | AI analysis failed |
| `notification:new` | Server → Client | New in-app notification |
| `notification:count` | Server → Client | Unread badge count update |
| `alert:new` | Server → All | New disease outbreak alert |

---

## 🤖 AI Detection Flow
Farmer uploads image (multipart/form-data)

↓

Image saved to Cloudinary → secure URL

↓

Detection record created (status: PENDING)

↓

Job added to BullMQ queue → API responds immediately

↓

Background worker picks up job

↓

Worker fetches image → sends to OpenRouter Vision AI

↓

AI returns: disease name, confidence, severity, treatments

↓

Detection updated (status: COMPLETED, aiResult: {...})

↓

Farmer notified via Socket.io + persistent notification
---

## ⚙️ Background Jobs (Cron Schedule)

| Job | Schedule | Description |
|-----|----------|-------------|
| Outbreak Detection | Every hour | Scans recent detections for disease clusters, auto-creates alerts |
| Trending Scores | Every 6 hours | Recalculates forum post trending scores |
| Alert Cleanup | Daily at midnight | Deactivates expired disease alerts |

---

## 🏗️ Architecture Decisions

- **Soft deletes** on farms, posts, and users — preserves referential integrity for detection history and forum threads
- **Denormalized counters** (`upvoteCount`, `commentCount`) on posts for fast sorting without array length computation
- **GeoJSON 2dsphere index** on Farm model — enables geographic outbreak queries and map visualization
- **BullMQ with exponential backoff** — AI failures retry at 2s, 4s, 8s intervals before marking as failed
- **`openrouter/free` auto-router** — automatically selects available free vision models, never hardcodes specific model endpoints
- **Aggregation pipelines** for analytics — single DB round trips instead of multiple queries and in-memory computation
- **`Promise.all` parallel queries** throughout — platform stats run 13 queries simultaneously
- **Flat comment collection with parent reference** — scalable nested replies without document size limits

---

## 📦 NPM Scripts

```bash
npm run dev      # Start API server with hot reload (tsx watch)
npm run worker   # Start detection background worker
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled production build
```

---

## 🔒 Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens expire in 15 minutes
- Refresh tokens stored hashed in DB — revoked on logout
- httpOnly cookies for refresh token storage (XSS protection)
- Helmet.js for secure HTTP headers
- CORS configured to allowed origins only
- Rate limiting on API routes
- Socket.io connections require valid JWT in handshake
- File uploads restricted to JPG/PNG/WEBP, max 5MB

---

## 🌱 Seeding Admin User

To create an admin user for testing, run this directly in MongoDB Atlas or mongosh:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "ADMIN" } }
)
```

---

## 👤 Author

**Israk**  
Fourth-year CSE student at Presidency University, Dhaka  
Full-Stack Developer  
GitHub: [@israk03](https://github.com/israk03)

---

## 📄 License

This project is for educational and portfolio purposes.
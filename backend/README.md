# 🌱 Beginner's Field School — Backend API

Node.js + Express REST API with MySQL database.

---

## Stack

| Layer      | Technology              |
|------------|-------------------------|
| Runtime    | Node.js ≥ 18            |
| Framework  | Express 4               |
| Database   | MySQL 8 / MariaDB 10.6+ |
| Auth       | JWT (jsonwebtoken)      |
| Passwords  | bcryptjs                |
| Uploads    | Multer                  |
| Security   | Helmet, CORS, Rate-limit|

---

## Quick Start

### 1 — Create the database

```bash
mysql -u root -p < backend/db/schema.sql
```

### 2 — Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your MySQL credentials and a JWT secret
```

### 3 — Install dependencies

```bash
cd backend
npm install
```

### 4 — Hash the seed passwords

```bash
npm run seed
```

### 5 — Start the server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.
The frontend will be served at the same origin.

---

## Environment Variables

| Variable          | Required | Default       | Description                        |
|-------------------|----------|---------------|------------------------------------|
| `PORT`            | No       | `5000`        | HTTP port                          |
| `NODE_ENV`        | No       | `development` | `development` or `production`      |
| `DB_HOST`         | Yes      | `localhost`   | MySQL host                         |
| `DB_PORT`         | No       | `3306`        | MySQL port                         |
| `DB_NAME`         | Yes      | —             | Database name                      |
| `DB_USER`         | Yes      | —             | MySQL user                         |
| `DB_PASSWORD`     | Yes      | —             | MySQL password                     |
| `JWT_SECRET`      | **Yes**  | —             | Long random string (min 32 chars)  |
| `JWT_EXPIRES_IN`  | No       | `8h`          | Token lifetime                     |
| `UPLOAD_DIR`      | No       | `uploads`     | Directory for uploaded files       |
| `MAX_FILE_SIZE_MB`| No       | `5`           | Max upload size in MB              |
| `ALLOWED_ORIGINS` | No       | `localhost`   | Comma-separated CORS origins       |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Endpoints

### Authentication
| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| POST   | `/api/auth/login`           | —    | Login, returns JWT token |
| GET    | `/api/auth/me`              | ✅   | Current user profile     |
| POST   | `/api/auth/change-password` | ✅   | Change own password      |

**Login request:**
```json
POST /api/auth/login
{ "email": "admin@beginnersfieldschool.edu.ng", "password": "Admin@2025" }
```
**Login response:**
```json
{ "token": "eyJ...", "user": { "id": 1, "role": "admin", "name": "...", ... } }
```
All subsequent requests send the token as:
```
Authorization: Bearer eyJ...
```

---

### Dashboard
| Method | Path                    | Role    | Description             |
|--------|-------------------------|---------|-------------------------|
| GET    | `/api/dashboard/admin`  | admin   | Stats + recent apps     |
| GET    | `/api/dashboard/teacher`| teacher | Class stats             |
| GET    | `/api/dashboard/student`| student | Scores, attendance, rank|

---

### Admissions
| Method | Path                           | Role    | Description          |
|--------|--------------------------------|---------|----------------------|
| GET    | `/api/admissions`              | admin   | List all (filterable)|
| GET    | `/api/admissions/:id`          | admin   | Single application   |
| POST   | `/api/admissions`              | public  | Submit application   |
| PATCH  | `/api/admissions/:id/status`   | admin   | Approve / reject     |

Query params: `?status=pending&class=Primary 1&search=Obi`

---

### Students
| Method | Path              | Role           | Description         |
|--------|-------------------|----------------|---------------------|
| GET    | `/api/students`   | admin, teacher | List all            |
| GET    | `/api/students/me`| student        | Own profile         |
| GET    | `/api/students/:id`| admin, teacher| Single student      |
| POST   | `/api/students`   | admin          | Add student         |
| PATCH  | `/api/students/:id`| admin         | Update student      |

---

### Teachers
| Method | Path               | Role    | Description     |
|--------|--------------------|---------|-----------------|
| GET    | `/api/teachers`    | admin   | List all        |
| GET    | `/api/teachers/me` | teacher | Own profile     |
| GET    | `/api/teachers/:id`| admin   | Single teacher  |
| POST   | `/api/teachers`    | admin   | Add teacher     |
| PATCH  | `/api/teachers/:id`| admin   | Update teacher  |

---

### Attendance
| Method | Path                            | Role           | Description         |
|--------|---------------------------------|----------------|---------------------|
| GET    | `/api/attendance`               | admin, teacher | List records        |
| GET    | `/api/attendance/student/:id`   | all            | Student history     |
| POST   | `/api/attendance`               | teacher        | Save a session      |

Query params: `?date=2025-03-20&period=Morning Roll Call&class_id=9`

**Save request:**
```json
{
  "date": "2025-03-20",
  "period": "Morning Roll Call",
  "class_id": 9,
  "records": [
    { "student_id": 1, "status": "present" },
    { "student_id": 2, "status": "absent", "note": "Sick" }
  ]
}
```

---

### Results
| Method | Path                   | Role    | Description             |
|--------|------------------------|---------|-------------------------|
| GET    | `/api/results`         | all     | List (role-filtered)    |
| GET    | `/api/results/summary` | admin   | Per-class upload status |
| POST   | `/api/results/bulk`    | teacher | Upload scores           |
| PATCH  | `/api/results/submit`  | teacher | Submit for approval     |
| PATCH  | `/api/results/publish` | admin   | Approve & publish       |
| PATCH  | `/api/results/reject`  | admin   | Reject (back to draft)  |

**Bulk upload request:**
```json
{
  "class_id": 9, "subject_id": 1, "term": 3, "session": "2024/2025",
  "scores": [
    { "student_id": 1, "ca_score": 28, "exam_score": 65 },
    { "student_id": 2, "ca_score": 22, "exam_score": 58 }
  ]
}
```

---

### Timetables
| Method | Path                         | Role    | Description             |
|--------|------------------------------|---------|-------------------------|
| GET    | `/api/timetables`            | all     | List (role-filtered)    |
| GET    | `/api/timetables/status`     | student | Timetable status        |
| PUT    | `/api/timetables`            | teacher | Save/update draft       |
| PATCH  | `/api/timetables/submit`     | teacher | Submit for approval     |
| PATCH  | `/api/timetables/:id/review` | admin   | Approve / reject        |

---

### Fees
| Method | Path              | Role    | Description              |
|--------|-------------------|---------|--------------------------|
| GET    | `/api/fees`       | all     | Full schedule            |
| GET    | `/api/fees/student`| student| Student's level only     |
| PUT    | `/api/fees`       | admin   | Upsert fee schedule      |
| DELETE | `/api/fees/:id`   | admin   | Remove a line item       |

---

### Announcements
| Method | Path                    | Role    | Description         |
|--------|-------------------------|---------|---------------------|
| GET    | `/api/announcements`    | all     | List (role-filtered)|
| POST   | `/api/announcements`    | admin   | Create              |
| DELETE | `/api/announcements/:id`| admin   | Delete              |

---

### Messages
| Method | Path                       | Role | Description         |
|--------|----------------------------|------|---------------------|
| GET    | `/api/messages`            | all  | Inbox               |
| GET    | `/api/messages/sent`       | all  | Sent messages       |
| GET    | `/api/messages/unread-count`| all | Badge count         |
| POST   | `/api/messages`            | all  | Send message        |
| PATCH  | `/api/messages/:id/read`   | all  | Mark as read        |
| DELETE | `/api/messages/:id`        | all  | Delete message      |

---

### File Uploads
| Method | Path            | Role | Description                         |
|--------|-----------------|------|-------------------------------------|
| POST   | `/api/uploads`  | all  | Upload a file (multipart/form-data) |
| GET    | `/api/uploads/:id`| all| Get file metadata                   |

Files are served statically at `/uploads/<filename>`.

---

### Health
```
GET /api/health
```

---

## Project Structure

```
backend/
├── server.js           ← Express app entry point
├── package.json
├── .env.example        ← Copy to .env and fill in values
├── db/
│   ├── index.js        ← MySQL connection pool
│   ├── schema.sql      ← Full schema + seed data
│   └── seed.js         ← Password hashing seed script
├── middleware/
│   └── auth.js         ← JWT authenticate + authorize
├── routes/
│   ├── auth.js         ← Login, me, change-password
│   ├── admissions.js   ← Admission applications
│   ├── students.js     ← Student profiles
│   ├── teachers.js     ← Teacher profiles
│   ├── attendance.js   ← Daily attendance
│   ├── results.js      ← Exam results
│   ├── timetables.js   ← Class timetables
│   ├── fees.js         ← Fee schedule
│   ├── announcements.js← School announcements
│   ├── messages.js     ← Internal messaging
│   ├── uploads.js      ← File uploads (Multer)
│   └── dashboard.js    ← Aggregated stats per role
└── uploads/            ← Stored files (git-ignored)
```

---

## Deployment (Production)

### Recommended: Render or Railway (free tier available)

1. Push code to GitHub
2. Create a new **Web Service** on Render/Railway
3. Point to the `backend/` folder
4. Set all environment variables in the dashboard
5. Add a **MySQL** database add-on (or use PlanetScale)
6. Run `npm run seed` once via the console

### With PM2 on a VPS

```bash
npm install -g pm2
cd backend
pm2 start server.js --name bfs-api
pm2 startup
pm2 save
```

### Nginx reverse proxy (recommended for production)

```nginx
server {
    listen 80;
    server_name yourdomain.edu.ng;

    # Serve frontend
    root /var/www/beginners-field-school;
    index index.html;

    # Proxy API to Node
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files directly
    location /uploads/ {
        alias /var/www/beginners-field-school/backend/uploads/;
    }

    # SPA fallback
    try_files $uri $uri/ /index.html;
}
```

---

## Demo Credentials

| Role    | Email                                    | Password     |
|---------|------------------------------------------|--------------|
| Admin   | admin@beginnersfieldschool.edu.ng        | Admin@2025   |
| Teacher | e.chukwu@beginnersfieldschool.edu.ng     | Teacher@2025 |
| Student | student@beginnersfieldschool.edu.ng      | Student@2025 |

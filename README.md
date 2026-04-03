# 🌱 Beginner's Field Nursery & Primary School Website

A complete school website with online portals for Admin, Teachers, Students and Parents — built with pure HTML, CSS and JavaScript. No frameworks required.

---

## 📁 Project Structure

```
beginners-field-school/
│
├── index.html              ← Homepage (public-facing)
│
├── css/
│   └── style.css           ← All styles (one file)
│
├── js/
│   └── main.js             ← All JavaScript (one file)
│
└── pages/
    ├── login.html          ← Login page (role selector)
    ├── admission.html      ← Online admission form
    ├── admin.html          ← Admin / Principal portal
    ├── teacher.html        ← Teacher portal
    └── student.html        ← Student / Parent portal
```

---

## 🌐 Pages & Features

### `index.html` — Homepage
- School hero banner with stats
- Portal access cards
- Features section
- School shop preview
- Footer with contact info

### `pages/login.html` — Login
- Role selector (Admin / Teacher / Student)
- Redirects to correct portal on login

### `pages/admission.html` — Admissions
- Online application form (Nursery 1–3, Primary 1–6)
- Payment instructions
- File upload for proof of payment

### `pages/admin.html` — Admin Portal
- **Overview** — stats, alerts, recent applications
- **Admissions** — approve, reject, view applications
- **Students** — manage enrolled students
- **Teachers** — manage teaching staff
- **Payments** — view all payment records and revenue
- **Results** — approve/publish uploaded results
- **Announcements** — broadcast to students/teachers/parents

### `pages/teacher.html` — Teacher Portal
- **Dashboard** — attendance snapshot, results progress
- **Attendance** — mark present/absent/late per student
- **Upload Results** — CA + Exam scores, auto-grading
- **My Students** — class list with performance data
- **Messages** — view announcements, message parents

### `pages/student.html` — Student Portal
- **Dashboard** — average score, position, attendance, fees
- **My Results** — term-by-term results, download report card
- **Pay Fees** — bank transfer, card, USSD + payment history
- **School Shop** — add to cart and place order
- **Timetable** — weekly class schedule

---

## 🚀 How to Deploy to GitHub Pages

1. Create a new repository on GitHub named `beginners-field-school` (or any name)
2. Upload all files — keeping the folder structure intact
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch and `/ (root)` folder
5. Click **Save**
6. Your site will be live at: `https://YOUR-USERNAME.github.io/beginners-field-school/`

---

## 🎨 Design

- **Colours:** Navy Blue (`#0a1f44`) and Yellow (`#f5c200`)
- **Fonts:** Merriweather (headings) + Nunito (body) — loaded from Google Fonts
- **Responsive:** Works on mobile, tablet and desktop

---

## 🔧 To Customise

| What to change | Where |
|---|---|
| School name | All HTML files — search "Beginner's Field" |
| Phone / email | `index.html` topbar and footer |
| Address | `index.html` footer |
| Bank details | `pages/admission.html` and `pages/student.html` |
| Fees amounts | `pages/student.html` fee summary section |
| Shop items & prices | `pages/student.html` and `index.html` shop section |
| Staff names | `pages/admin.html`, `pages/teacher.html` |
| Student data | `pages/teacher.html`, `pages/student.html` |
| Colours | `css/style.css` — `:root` variables at the top |

---

## 🔌 To Add Real Backend (Next Steps)

This frontend is ready to connect to a backend. Recommended stack for Nigeria:

- **Backend:** Node.js (Express) or PHP
- **Database:** MySQL or PostgreSQL
- **Payment:** [Paystack](https://paystack.com) or [Flutterwave](https://flutterwave.com)
- **Hosting:** Render, Railway, or VPS (DigitalOcean/Hetzner)
- **Domain:** Get a `.edu.ng` domain from NIRA

---

## 📄 License

© 2025 Beginner's Field Nursery & Primary School. All rights reserved.


npx live-server --port=8080
# EmailJS Setup — Admission Email Notifications

The admission workflow sends two automated emails via **EmailJS** (free, no backend needed).

---

## Step 1 — Create a free EmailJS account

Go to https://www.emailjs.com and sign up (free tier: 200 emails/month).

---

## Step 2 — Add an Email Service

1. Dashboard → **Email Services** → **Add New Service**
2. Choose **Gmail** (easiest) or any SMTP provider
3. Click **Connect Account** and authorise
4. Note the **Service ID** (e.g. `service_abc123`)

---

## Step 3 — Create Two Email Templates

### Template 1 — Admission Approved (`bfs_admission_approved`)

**Subject:** `Your Child's Admission to Beginner's Field School — {{student_name}}`

**Body:**
```
Dear {{parent_name}},

We are delighted to inform you that the admission of {{student_name}} into {{class}} at
Beginner's Field Nursery & Primary School has been APPROVED for the 2025/2026 session.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CHILD'S PORTAL LOGIN DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Login Email:      {{to_email}}
Serial / Login ID: {{serial}}
Temporary Password: {{temp_password}}
Portal URL:       {{login_url}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: When you log in for the first time, you will be asked to set a
new permanent password. Your temporary password will no longer work after that.

Please visit the school office to complete enrolment.

Yours sincerely,
Mrs. Adaeze Okafor
Principal, Beginner's Field Nursery & Primary School
```

**Template variables:** `parent_name`, `student_name`, `class`, `serial`, `temp_password`, `login_url`, `to_email`

---

### Template 2 — Admission Rejected (`bfs_admission_rejected`)

**Subject:** `Regarding {{student_name}}'s Admission Application — Beginner's Field School`

**Body:**
```
Dear {{parent_name}},

Thank you for your interest in Beginner's Field Nursery & Primary School.

After careful review, we regret to inform you that the admission application
for {{student_name}} into {{class}} has not been successful at this time.

{{rejection_note}}

We appreciate your interest and wish {{student_name}} the very best.
You are welcome to reapply in future sessions.

Yours sincerely,
Mrs. Adaeze Okafor
Principal, Beginner's Field Nursery & Primary School
```

**Template variables:** `parent_name`, `student_name`, `class`, `rejection_note`, `to_email`

> In both templates, set **To Email** to `{{to_email}}`.

---

## Step 4 — Get Your Public Key

Dashboard → **Account** → **General** → copy your **Public Key**

---

## Step 5 — Update the Code

Open **both** `pages/admin.html` and `pages/admission.html` and replace:

```js
const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
```

With your actual values. The template IDs (`bfs_admission_approved` / `bfs_admission_rejected` / `bfs_admission_received`) must exactly match the Template IDs you created in Step 3.

---

## Note on Supabase Admin API (Parent Account Creation)

The `DB.admissions.approve()` function attempts to use `supabase.auth.admin.createUser()` to automatically create the parent's login account.

**This requires a Service Role key** (not the anon key). Two options:

### Option A — Use a Supabase Edge Function (recommended for production)
Create an Edge Function that accepts `{ email, password }` and calls `auth.admin.createUser()` with the service role key server-side. Update `DB.admissions.approve()` to call your function URL instead.

### Option B — Manual account creation (simpler for now)
If the admin API call fails (which it will with the anon key), the system still:
- ✅ Generates the serial number
- ✅ Records the temp password in the database
- ✅ Creates the student record
- ✅ Marks the admission as Approved
- ✅ Sends the email

The admin can then manually create the parent's account in **Supabase Dashboard → Authentication → Users → Add User** using the email and temp password shown in the approval modal.

# 🌹 SainiVerse — Private Couple Memory Sanctuary

A private, zero-trust photo vault and memories app built exclusively for two authenticated partners. Photos, raw download URLs, and metadata are shielded from public discovery, link scraping, search engines, and unauthorized access.

Built with **React + Vite (JavaScript)**, **Firebase**, and **Tailwind CSS**, optimized for deployment on **Vercel**.

---

## 🛡️ Security & Privacy Architecture

### 1. Zero-Trust Couple Whitelist (Auth Guard)
- The app checks the user's authenticated email against `VITE_ALLOWED_EMAILS`.
- Any third-party email attempting to log in via Google or email/password is **instantly kicked, signed out, and presented with a security violation alert**.
- Both `firestore.rules` and `storage.rules` enforce this at the database and storage level.

### 2. In-Browser EXIF & Geolocation Stripping
- Before any photo is transmitted over the network, `src/utils/sanitizeImage.js` re-rasterizes the image onto an off-screen HTML5 `<canvas>`.
- All camera models, GPS coordinates, device timestamps, and sensitive EXIF segments are erased client-side.

### 3. Cryptographic UUID Obfuscation
- Uploaded files are renamed to a randomized UUID (e.g., `crypto.randomUUID() + ".jpg"`).
- Original filenames and device signatures are discarded.

### 4. Ephemeral In-Memory Blob URL Streaming (`blob:` URLs)
- Raw Firebase Storage URLs are **never placed in the DOM**.
- The `SecureImage` component downloads raw image bytes into browser RAM via `getBlob()` and creates a temporary `URL.createObjectURL(blob)`.
- When cards or modals unmount, `URL.revokeObjectURL()` purges the object from memory.

### 5. Anti-Scraping & Anti-Indexing
- Strict `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />` in `index.html`.
- Global crawler block in `public/robots.txt` (`User-agent: *\nDisallow: /`).
- Right-click context menus (`onContextMenu={(e) => e.preventDefault()}`) and drag-and-drop (`onDragStart={(e) => e.preventDefault()}`) are disabled on all memory images.
- Protected CSS layers prevent touch-callout and selection.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Firebase credentials and couple emails:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# The only two emails permitted into the vault:
VITE_ALLOWED_EMAILS=your.email@gmail.com,her.email@gmail.com

# Anniversary Date (for Days Together counter)
VITE_ANNIVERSARY_DATE=2023-10-14
VITE_COUPLE_NAMES=Jith & She
```

*(Note: If left unconfigured, SainiVerse automatically launches in **Local Demo / Sandbox Mode** so you can preview all UI features and security workflows immediately!)*

### 3. Run Locally
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Deploying Firebase Security Rules

### Firestore Rules (`firestore.rules`)
In Firebase Console -> Firestore Database -> Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isCoupleMember() {
      return request.auth != null && (
        request.auth.token.email.lower() in [
          'your.email@gmail.com',
          'her.email@gmail.com'
        ]
      );
    }

    match /memories/{memoryId} {
      allow read, create, update, delete: if isCoupleMember();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Storage Rules (`storage.rules`)
In Firebase Console -> Storage -> Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isCoupleMember() {
      return request.auth != null && (
        request.auth.token.email.lower() in [
          'your.email@gmail.com',
          'her.email@gmail.com'
        ]
      );
    }

    match /memories/{allPaths=**} {
      allow read: if isCoupleMember();
      allow write: if isCoupleMember()
                   && request.resource.size < 25 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if isCoupleMember();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🌐 Deploy to Vercel

1. Push this repository to GitHub/GitLab.
2. Import project into [Vercel](https://vercel.com).
3. Set Framework Preset to **Vite**.
4. Add the Environment Variables from `.env.local` to Vercel Project Settings.
5. Deploy! `vercel.json` already provides SPA rewrites and strict security headers (`X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `no-referrer`).

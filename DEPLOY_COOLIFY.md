# Deploying DocVerify on Coolify

This app is a Node.js (ESM) Express server that serves the vanilla frontend +
REST API. It's containerised with the included `Dockerfile`.

## 0. Security first
- Rotate the root password you shared, switch to SSH keys, disable password login.
- Never commit `.env` (already in `.gitignore`).

## 1. Push the code to Git (Coolify deploys from a repo)
Make the **`docV/` folder the repo root** so paths stay simple:

```bash
cd docV
git init
git add .
git commit -m "DocVerify – production"
git branch -M main
git remote add origin <YOUR_PRIVATE_REPO_URL>   # GitHub/GitLab/Gitea (private!)
git push -u origin main
```
`.env` and `node_modules` are git-ignored, so secrets won't be pushed.

## 2. Create the app in Coolify
1. **+ New → Application** → pick your Git source (connect GitHub or use a private
   repo + deploy key).
2. **Build Pack: `Dockerfile`**.
3. **Base Directory:** `/`  (because the repo root *is* `docV`).
   - If instead you pushed the whole project, set it to the folder containing the
     `Dockerfile` (e.g. `/Final_Doc_V-main/Final_Doc_V-main/docV`).
4. **Port / "Ports Exposes":** `3000`.

## 3. Environment variables (Coolify → the app → Environment Variables)
Copy **every** key from your local `docV/.env`. At minimum:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=...
SESSION_SECRET=...                 # long random string
WEB3_PROVIDER_URL=...              # Sepolia RPC (Infura/Alchemy)
ACCOUNT_ADDRESS=...
PRIVATE_KEY=...                    # server wallet key (sensitive)
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
GEMINI_API_KEY=...
EMAIL_USER=...
EMAIL_PASS=...                     # Gmail app password
DOC_MASTER_KEY=...                 # 32-byte hex; back it up (encrypted docs depend on it)
OCR_SERVICE_URL=                   # optional; leave blank to disable L2 watermark
```

## 4. Domain + HTTPS (REQUIRED, not optional)
- Point a domain/subdomain's **A record → 91.230.110.174**.
- In Coolify, set that domain on the app; Coolify auto-issues a Let's Encrypt cert.
- **Why HTTPS is mandatory here:**
  - Session cookies are `secure` in production → they only work over HTTPS.
  - The Issuer Portal uses the **Web Crypto API** (AES encryption), which only
    runs in a secure context (HTTPS).
  - MetaMask in-page signing expects a secure origin.
  - Visiting via raw `http://91.230.110.174` will break login + issuer encryption.

## 5. Allow the VPS in MongoDB Atlas
Atlas → **Network Access** → add `91.230.110.174/32` (or `0.0.0.0/0` for testing).
Otherwise the DB connection fails on boot.

## 6. Deploy
Hit **Deploy**. Watch the build logs. On success, open your HTTPS domain.

### Post-deploy checklist
- [ ] Landing page loads with styles (CDNs reachable).
- [ ] Sign up / sign in works (session cookie set over HTTPS).
- [ ] Issuer Portal: MetaMask connects, publish works.
- [ ] Email OTP arrives (Gmail app password valid).
- [ ] First OCR/verify call works (tesseract.js downloads its data on first use).

### Notes
- Future `git push` to `main` → Coolify auto-redeploys (if enabled).
- Logs & restarts are in the Coolify app dashboard.
- The server binds `0.0.0.0:$PORT` (Express default) — Coolify's proxy handles TLS.

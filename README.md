# 🌸 bloom · goals tracker

A quiet, beautiful space to track your goals, log weekly progress, and watch the compound effect work.

## Features
- 👥 **Multi-user** — up to ~5 people, each with their own data, stored separately
- 🎯 **Goals** — add goals with category, priority, progress, aspects you're working on, comments
- 📅 **Weekly Log** — track marginal gains week by week
- 📊 **Dashboard** — see your overall progress at a glance
- 🔢 **Compound Calculator** — visualize how small daily improvements multiply over time
- 💾 **Saved in browser** — all data lives in `localStorage`, no backend needed
- 🎨 **White aesthetic** — soft, minimal, a little precious

---

## 🚀 Deploy to GitHub Pages (Private Repo)

### Step 1 — Create a private repo
1. Go to [github.com/new](https://github.com/new)
2. Name it `bloom-goals` (or anything you like)
3. Set it to **Private**
4. Click **Create repository**

### Step 2 — Upload the files
**Option A — drag & drop (easiest)**
1. Open your new repo on GitHub
2. Click **"uploading an existing file"**
3. Drag all 4 files into the window:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
4. Click **Commit changes**

**Option B — using Git CLI**
```bash
git init
git add .
git commit -m "🌸 initial bloom"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bloom-goals.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Wait ~60 seconds, then visit:
   ```
   https://YOUR_USERNAME.github.io/bloom-goals/
   ```

### Step 4 — Share access (optional)
Since the repo is private, GitHub Pages will still serve the site **publicly** (anyone with the link can view it). If you want to restrict access:
- Keep the URL secret and only share with your people
- Or upgrade to GitHub Pro/Team for Pages access controls

---

## 💾 Data & privacy
- All data is stored in **your browser's localStorage**
- Nothing is sent to any server
- Different users on the **same browser** share localStorage — this is intentional (it's designed for a small group on shared or personal devices)
- To back up your data: open DevTools → Application → Local Storage → copy the `bloom_data` value

---

## 🛠 Customization
- Edit `style.css` to change colors (all in `:root` CSS variables at the top)
- Edit the `AVATARS` array in `app.js` to change available emojis
- The app is plain HTML/CSS/JS — no build step, no dependencies, no npm

---

*made with bloom · small gains, compounding quietly*

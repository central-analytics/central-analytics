# Central Analytics — Website

Static site: 5 pages (`index.html`, `services.html`, `approach.html`, `about.html`,
`contact.html`) sharing `styles.css` and `main.js`. No build step — just host the
files as-is.

## Deploy with GitHub Pages (free)

1. **Create a repo.** On GitHub, click **New repository**. Name it something like
   `central-analytics-website`. Leave it **Public** (required for free GitHub Pages
   on a personal account). Don't initialize with a README — you already have one.

2. **Upload the files.** Easiest path with no command line:
   - Open the new repo, click **Add file → Upload files**.
   - Drag in all 7 files from this folder (`index.html`, `services.html`,
     `approach.html`, `about.html`, `contact.html`, `styles.css`, `main.js`) —
     they need to sit at the **root** of the repo, not inside a subfolder.
   - Commit directly to `main`.

   (If you're comfortable with git instead: `git init`, `git add .`,
   `git commit -m "Initial site"`, `git remote add origin <your-repo-url>`,
   `git push -u origin main`.)

3. **Turn on Pages.** In the repo, go to **Settings → Pages**. Under
   **Build and deployment → Source**, choose **Deploy from a branch**. Under
   **Branch**, choose `main` and folder `/ (root)`, then **Save**.

4. **Wait ~1 minute**, then refresh that Pages settings page — it'll show your
   live URL: `https://<your-username>.github.io/central-analytics-website/`.

## Custom domain (optional)

If you want `central-analytics.com` instead of the github.io URL:

1. Open `CNAME` in this folder and replace the placeholder with your real domain,
   then upload/commit it to the repo root (GitHub Pages reads this file to know
   which domain to serve).
2. At your domain registrar (wherever you bought the domain), add these DNS records:
   - Four **A** records for the apex domain (`central-analytics.com`) pointing to
     GitHub's Pages IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`
   - A **CNAME** record for `www` pointing to `<your-username>.github.io`
3. Back in **Settings → Pages**, enter the domain under **Custom domain** and save.
   Check **Enforce HTTPS** once it's verified (can take a few minutes to a few
   hours for DNS to propagate).

## Making edits later

Any file changes committed to `main` go live automatically within a minute or two
— no separate "deploy" step. You can edit files directly in GitHub's web editor
(pencil icon on any file) for small text changes, or re-upload files for bigger
changes.

## Project ledger (internal)

`status.html` is an internal page for project status, invoices and revenue. It is not linked from the site menu; open it by typing `central-analytics.com/status.html`. It is hidden from search engines.

- All data is stored in your own browser (nothing is uploaded anywhere, so nothing is published to GitHub).
- Use the **Backup** tab to download a file after changes, and to restore it on another computer or phone.
- To load the two Clenera projects and their deposit invoices, open Backup > Restore and choose `ledger-starting-data.json` (keep that file off GitHub).

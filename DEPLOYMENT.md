# GitHub Pages Deployment Guide

## Quick Setup

1. **Enable GitHub Pages with GitHub Actions**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **"GitHub Actions"** (NOT a branch)
   - Save the changes

2. **Trigger the Deployment**:
   - Push your code to the `main` branch, OR
   - Go to **Actions** tab → **Deploy to GitHub Pages** workflow → **Run workflow**

3. **Wait for Deployment**:
   - Go to the **Actions** tab to see the workflow progress
   - Wait for it to complete (usually 2-3 minutes)
   - Once complete, your site will be available at: `https://[username].github.io/[repository-name]/`

## Troubleshooting

### If you see the README instead of your app:

**Problem**: GitHub Pages is serving the README file instead of your built app.

**Solution**:
1. Check your repository **Settings** → **Pages**
2. Make sure **Source** is set to **"GitHub Actions"**, NOT a branch
3. If it's set to a branch, change it to "GitHub Actions"
4. Go to **Actions** tab and manually trigger the workflow

### If the workflow fails:

1. Check the **Actions** tab for error messages
2. Common issues:
   - **Build fails**: Check that `package.json` has all dependencies
   - **Base path wrong**: The workflow automatically uses your repository name
   - **Missing files**: Make sure all files are committed and pushed

### Verify the Build Locally:

To test the static export locally before deploying:

```bash
# Set the base path (replace with your repository name)
export NEXT_PUBLIC_BASE_PATH="/tcg-logic-battle"

# Build the static site
npm run export

# The output will be in the 'out' directory
# You can serve it locally with:
npx serve out
```

Then visit `http://localhost:3000/tcg-logic-battle` to see if it works.

### Repository Name

If your repository name is different from `tcg-logic-battle`, you'll need to update the base path in the workflow file (`.github/workflows/deploy.yml`) or set it as an environment variable.

## Important Notes

- **Offline Mode Only**: Since GitHub Pages serves static files, only the offline/PvE mode will work (uses local storage). API routes require a server and won't work.
- **Base Path**: The app automatically uses your repository name as the base path. Your app will be at `https://[username].github.io/[repo-name]/`
- **Custom Domain**: If using a custom domain, update `NEXT_PUBLIC_BASE_PATH` to `/` in the workflow


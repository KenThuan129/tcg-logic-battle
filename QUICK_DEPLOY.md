# Quick Fix: Showing README Instead of App

## The Problem
You're seeing the README file instead of your Next.js app on GitHub Pages.

## The Solution (3 Steps)

### Step 1: Change GitHub Pages Source
1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **"Source"**, change it from a branch (like `main` or `gh-pages`) to **"GitHub Actions"**
4. Save the changes

### Step 2: Trigger the Deployment Workflow
1. Go to the **Actions** tab in your repository
2. Click on **"Deploy to GitHub Pages"** workflow (if it's there)
3. Click **"Run workflow"** button (top right)
4. Select the branch (usually `main`) and click **"Run workflow"**

OR simply push a new commit:
```bash
git add .
git commit -m "Trigger deployment"
git push
```

### Step 3: Wait and Check
1. Go to **Actions** tab
2. Watch the workflow run (green checkmark = success)
3. Once complete, visit: `https://kenthuan129.github.io/tcg-logic-battle/`

## Still Not Working?

- Check the **Actions** tab for error messages
- Make sure your repository name matches: `tcg-logic-battle`
- Verify the workflow file exists at: `.github/workflows/deploy.yml`

## Repository Name Mismatch?

If your repo name is different, update line 36 in `.github/workflows/deploy.yml`:
```yaml
NEXT_PUBLIC_BASE_PATH: /your-actual-repo-name
```


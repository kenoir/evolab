# Evolab

A [Next.js](https://nextjs.org) project configured for deployment to GitHub Pages.

## Features

- ✅ Next.js 16 with App Router
- ✅ TypeScript support
- ✅ Tailwind CSS for styling
- ✅ Static export for GitHub Pages
- ✅ Automated deployment via GitHub Actions

## Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Build

To create a production build:

```bash
npm run build
```

This will generate static files in the `out` directory.

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### Initial Setup

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy on push to the `main` branch

### Configuration

The deployment is configured in:
- `next.config.ts` - Static export and base path settings
- `.github/workflows/deploy.yml` - GitHub Actions workflow

The site will be available at: `https://kenoir.github.io/evolab/`

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the **Actions** tab in your repository
2. Select the **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Deploying Next.js to GitHub Pages](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

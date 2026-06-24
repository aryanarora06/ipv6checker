# ipv6checker

A fast, client-side, browser-based tool to check the IPv6 readiness of any domain. Built with React and Vite.

![ipv6checker UI](https://img.shields.io/badge/UI-Premium_Aesthetics-e11d48) ![Client-side](https://img.shields.io/badge/Privacy-100%25_Client--Side-22c55e) ![Exports](https://img.shields.io/badge/Exports-PDF,_CSV,_JSON-3b82f6)

## Overview

`ipv6checker` allows users to quickly verify if a website, its mail servers, and its name servers are ready for the modern IPv6 internet. 

Because it operates **100% client-side**, all queries are executed directly from the user's browser using Google's DNS-over-HTTPS API (`dns.google`). This means no backend servers are required, your queries remain private, and the tool can be hosted cheaply as a static site on platforms like GitHub Pages, Vercel, or Netlify.

## Features

- **Single Domain Lookup**: Get an instant readiness score (0-100) based on AAAA records.
- **Live Website Screenshot**: Automatically fetches and displays a gorgeous 16:9 widescreen screenshot of the target domain.
- **Deep DNS Inspection**: Automatically discovers and checks all Mail servers (MX) and Name servers (NS) for IPv6 support.
- **Security Checkup**: Validates the presence of crucial DNS security records (DNSSEC, SPF, and DMARC).
- **Interactive Scoring Breakdown**: Click to reveal exactly how your readiness score was calculated point-by-point.
- **Actionable Next Steps**: Automatically generates a prioritized "Next Steps to 100%" list, dynamically sorted by the highest impact actions you need to take to fix your domain.
- **Bulk Processing**: Upload a text or CSV file to check hundreds of domains at once. The app batches queries to respect DNS API rate limits.
- **Premium Reporting & Exports**:
  - Export single domain reports as polished **PDFs**.
  - Export bulk runs as **CSV**, **JSON**, or multi-page **PDFs** containing high-level overviews and detailed summaries for every domain scanned.
- **WHOIS & Registration Info**: Connects to the RDAP protocol to fetch domain registration dates and registrar information.
- **Local History**: Your recent lookups are saved in your browser's `localStorage` for quick access.
- **Shareable URLs**: Easily share a check with others via `?d=domain.com` links.
- **Light & Dark Mode**: A sleek, premium UI that respects your operating system preferences with manual override.

## The Scoring System

Domains are evaluated out of **100 points**, broken down as follows:

- **+40 points**: The main domain has at least one IPv6 (AAAA) record.
- **+10 points**: The domain is Dual-Stack (has both IPv4 and IPv6).
- **+5 points**: The domain has redundant IPv6 addresses (2 or more).
- **+20 points**: The domain's Mail Exchange (MX) servers support IPv6. *(If the domain has no MX records, it automatically receives these points).*
- **+15 points**: The domain's Name Servers (NS) support IPv6.
- **+5 points**: *All* of the domain's MX servers support IPv6.
- **+5 points**: *All* of the domain's NS servers support IPv6.

**Verdicts:**
- `✅ Ready` (80% - 100%)
- `⚠️ Partial` (40% - 79%)
- `❌ Not Ready` (0% - 39%)

## Usage Guide

### Single Domain Check
1. Open the application.
2. Enter a domain name in the search bar (e.g., `google.com`).
   - *Note: URLs like `https://github.com/about` will be automatically stripped down to `github.com`.*
3. Press **Enter** or click **Check**. 
4. The result card will display a live screenshot, the verdict, actionable next steps, exact DNS records found, latency, and domain registration info.
5. Click **Share** to copy a direct link to this result, or **Export** to download a beautiful PDF report.

### Bulk Domain Check
If you have a large list of domains to verify, you can upload them in bulk.
1. Create a `.txt` or `.csv` file.
2. Place **one domain per line**.
3. *Optional*: Use `#` at the start of a line to leave a comment. Duplicates are automatically removed.
4. Click **Choose File** and select your list.
5. Click **Run**.
6. Once finished, choose to export your results as **CSV**, **JSON**, or **PDF**.

#### Exported Format (Data Points)
The generated exports will contain the following comprehensive data for each domain:
- `Domain`
- `Score` (0-100) & `Verdict`
- `Conclusion` (A one-line summary of the domain's state)
- `IPv6`, `IPv4`, & `Dual Stack` Status
- `MX IPv6` & `NS IPv6` Status
- `DNSSEC`, `SPF`, & `DMARC` Validations
- `Latency (ms)`
- `IPv6 Addresses` & `IPv4 Addresses` (Full list)
- `MX Hosts` & `NS Hosts` (Full list)
- `Error` (e.g., NXDOMAIN, SERVFAIL)

## Local Development

### Prerequisites
To run this project locally, you must install **Node.js** (which includes `npm`, the Node Package Manager) and **GitHub CLI**.

1. **Install GitHub CLI:** Download and install from [cli.github.com](https://cli.github.com/).
2. **Install Node.js (v18+ recommended):**
   - **Windows / Mac:** Download the official installer from the [Node.js website](https://nodejs.org/).
   - **Linux:** We recommend using Node Version Manager (nvm). Run:
     ```bash
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
     nvm install 20
     nvm use 20
     ```

### Installation

1. **Clone the repository:**
   ```bash
   gh repo clone aryanarora06/ipv6checker
   cd ipv6checker
   ```

2. **Install all project requirements:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The app will be available at `http://localhost:5173`.*

### Building for Production

To create an optimized production build:
```bash
npm run build
```
The static files will be generated in the `dist/` directory.

### Built With
- **React** & **Vite**
- **Vanilla CSS** (Custom properties, responsive flexbox/grid, seamless animations)
- **jsPDF** & **jsPDF-AutoTable** (Client-side PDF generation)
- **@fontsource** (Self-hosted fonts: JetBrains Mono and Inter)
- **Microlink API** (Live website screenshots)

## License
This project is open-source and available under the MIT License.

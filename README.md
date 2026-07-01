# ipv6checker

A fast, beautifully designed tool to check the IPv6 readiness and real-world reachability of any domain. Built with React and Vite.

![ipv6checker UI](https://img.shields.io/badge/UI-Clean-e11d48) ![Architecture](https://img.shields.io/badge/Architecture-Hybrid_Client/Serverless-22c55e) ![Exports](https://img.shields.io/badge/Exports-PDF,_CSV,_JSON-3b82f6)

## Overview

`ipv6checker` allows users to quickly verify if a website, its mail servers, and its name servers are ready for the modern IPv6 internet. 

The core DNS queries are executed directly from the user's browser using Google's DNS-over-HTTPS API (`dns.google`). However, the tool also features a **Real Reachability Test**, powered by a lightweight Vercel serverless function (`api/reachability.js`), which makes strict IPv6 HTTP and HTTPS connection tests to prove the web server is actively listening for IPv6 traffic.

## Features

- **Single Domain Lookup**: Get an instant readiness score (0-100) based on AAAA records.
- **Real Reachability Test (NEW)**: Connects to the target domain strictly over IPv6 on ports 80 (HTTP) and 443 (HTTPS) to verify the server software is correctly configured to serve traffic, beyond just having a DNS record.
- **Subdomain Scanner (NEW)**: Automatically scans common subdomains (www, mail, blog, api, etc.) to see if they are missing IPv6 support.
- **Live Website Screenshot**: Automatically fetches and displays a gorgeous 16:9 widescreen screenshot of the target domain.
- **Deep DNS Inspection**: Automatically discovers and checks all Mail servers (MX) and Name servers (NS) for IPv6 support.
- **Security Checkup**: Validates the presence of crucial DNS security records (DNSSEC, SPF, and DMARC).
- **Interactive Scoring Breakdown**: Click to reveal exactly how your readiness score was calculated point-by-point.
- **Actionable Next Steps**: Automatically generates a prioritized "Next Steps to 100%" list, dynamically sorted by the highest impact actions you need to take to fix your domain.
- **Bulk Processing**: Upload a text or CSV file to check hundreds of domains at once. The app batches queries to respect DNS API rate limits.
- **Clean Reporting & Exports**:
  - Export single domain reports as polished **PDFs**.
  - Export bulk runs as **CSV**, **JSON**, or multi-page **PDFs** containing high-level overviews and detailed summaries for every domain scanned.
- **WHOIS & Registration Info**: Connects to the RDAP protocol to fetch domain registration dates and registrar information.
- **Local History**: Your recent lookups are saved in your browser's `localStorage` for quick access.
- **Shareable URLs**: Easily share a check with others via `?d=domain.com` links.
- **Light & Dark Mode**: A sleek, premium UI that respects your operating system preferences with manual override.

## The Scoring System

Domains are evaluated out of **100 points**, broken down as follows (pretty much arbitrary - can be set according to requirements):

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

## How It Works

`ipv6checker` evaluates domains through a layered architecture, combining high-speed client-side DNS lookups with server-side application-layer testing to provide a complete picture of IPv6 readiness.

### 1. Client-Side DNS Resolution (Network Layer)
When a domain is queried, the app makes asynchronous requests directly from your browser to Google's DNS-over-HTTPS (DoH) API (`dns.google`). 
- It asks for both **A records (IPv4)** and **AAAA records (IPv6)**.
- Using DoH ensures that local ISP DNS caches don't interfere with the results, and doing it client-side means the app remains blazing fast without requiring a backend to proxy the requests.

### 2. The Real Reachability Test (Application Layer)
Just because a domain has an IPv6 DNS record doesn't mean the web server is actually configured to handle the traffic. To test this:
- The React app pings the `/api/reachability` serverless function.
- The Node.js backend uses native `http` and `https` modules to perform a fast `HEAD` request to both port 80 and port 443 of the target domain.
- **The Magic:** It explicitly passes the `{ family: 6 }` parameter to the network socket. This strictly forces Node.js to connect *only* via the IPv6 network. If the web server's firewall blocks IPv6, or if software like Nginx/Apache isn't listening for IPv6 connections, this test correctly fails, revealing false-positives.

### 3. Deep DNS Inspection (MX & NS Mapping)
A fully IPv6-ready infrastructure isn't just about the web server. The app recursively maps out the domain's backbone:
- **Mail Servers (MX):** It fetches the domain's MX records, extracts the hostnames of the mail servers (e.g., `alt1.aspmx.l.google.com`), and performs secondary AAAA lookups on *every single mail server* to ensure inbound emails can be delivered over IPv6.
- **Name Servers (NS):** It fetches the domain's authoritative NS records and checks them for AAAA records to ensure the DNS resolution process itself is IPv6-ready.

### 4. Security & Compliance Checks
While scanning, the app parses `TXT` records to look for critical security implementations:
- **SPF & DMARC:** It searches the `TXT` strings for `v=spf1` and `v=DMARC1` to verify email sender authentication is configured.
- **DNSSEC:** It queries the DNS API with the `cd` (Checking Disabled) and `do` (DNSSEC OK) flags to verify if cryptographic signatures exist for the domain's records.

## Usage Guide

### Single Domain Check
1. Open the application.
2. Enter a domain name in the search bar (e.g., `google.com`).
   - *Note: URLs like `https://github.com/about` will be automatically stripped down to `github.com`.*
3. Press **Enter** or click **Check**. 
4. The result card will display a live screenshot, the verdict, reachability status, actionable next steps, exact DNS records found, subdomain status, latency, and domain registration info.
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
   - **Linux:** We recommend using Node Version Manager (nvm).

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

### Deployment Note
For the Real Reachability Test to work, this app should be deployed to **Vercel** (or an environment supporting standard serverless functions), as it relies on the `/api/reachability.js` endpoint to perform native Node.js HTTP/HTTPS requests.

### Built With
- **React** & **Vite**
- **Vanilla CSS** (Custom properties, responsive flexbox/grid, seamless animations)
- **Node.js API** (Serverless endpoints)
- **jsPDF** & **jsPDF-AutoTable** (Client-side PDF generation)
- **@fontsource** (Self-hosted fonts: JetBrains Mono and Inter)
- **Microlink API** (Live website screenshots)

## License
This project is open-source and available under the MIT License.

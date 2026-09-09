# WeCertify Verified

Build "WeCertify by Weskill" — a frontend certification verification website.

Brand: WeCertify by Weskill. Premium, trustworthy, modern aesthetic — think fintech/enterprise SaaS polish: refined typography, subtle gradients, soft shadows, generous whitespace, smooth micro-animations, dark/light-friendly color palette (deep navy/charcoal + a gold or emerald accent to signal "certified/verified"). Should feel like a serious credentialing authority, not a template.

Landing page:
- Strong hero with Weskill/WeCertify branding, headline about verifying certificate authenticity instantly, and trust signals (e.g. "Trusted verification for Weskill certificates").
- A prominent verification panel with two clear options: (1) enter a Certificate Number/ID and submit, (2) scan a QR code using the device camera.
- QR scanning should open a camera scanner (with a graceful fallback/upload-image option for devices without camera access) and auto-extract the certificate ID from the QR payload.
- On submit, show a polished loading/checking state, then a clear result screen: a "Verified" success state (green/gold, checkmark, certificate holder name, course/certification title, issue date, expiry if any, issuing authority) or a "Not Found/Invalid" state (clear, non-alarming messaging with guidance).
- Include supporting sections below the fold: how verification works (3-step explainer), why trust WeCertify, and a footer with Weskill branding.

Data/backend: Use Lovable Cloud to store certificates (fields like certificate number, holder name, certification title, issue date, expiry date, status) and power the verification lookup via a backend query so results are real and not hardcoded. Seed a handful of sample certificates (including one expired/revoked) so the flow can be demoed end to end, and generate a working QR code for at least one sample certificate so the scan flow can be tested.

Make it fully responsive and production-quality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3a3f6455-7df7-477f-abc6-f7788111b229).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

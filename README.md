# Asnor Ali Portfolio

A mobile-first portfolio and website-development landing page for Asnor Ali.

## Stack
- HTML/CSS/JavaScript
- Supabase for contact-form submissions
- GitHub for source control
- Vercel-ready static deployment

## Security notes
- The frontend uses a Supabase publishable key only. No service-role secret is included.
- `contact_submissions` has Row Level Security enabled.
- Anonymous clients can only insert contact submissions; public reads/updates/deletes are blocked.
- Client-side validation, length limits, a honeypot field, and a simple submission cooldown reduce accidental/spam submissions.

## Deploy
Import this repository into Vercel as a static project. No build command is required.

# PlayHub logo + welcome message in emails

## What changes

1. **Logo on every account email** – replace the plain "PlayHub" text at the top of all six account emails (sign-up confirmation, sign-in link, password reset, email change, invite, verification code) with the pink film-strip PlayHub logo, shown on a dark strip so it looks exactly like the website header.
2. **Welcome message in the sign-up email** – the sign-up confirmation email keeps its "Verify Email" button near the top, followed by your full "Hey, PlayHub Family!" letter word-for-word (emojis included): thank-you, "What's Coming Next?" list of five items, "A Little Note From Our Team", and the "With love, Team PLAYHUB" sign-off.
3. Subject for sign-up becomes "Welcome to PlayHub – confirm your email".

## Technical details

- Upload the existing pink logo (the same artwork used by the site) to the CDN and reference it by absolute URL (`https://playhubz.lovable.app/__l5e/assets-v1/...`) because email clients need absolute image URLs; add `alt="PlayHub"` and fixed width (~180px).
- Add a shared `BrandHeader` component in `src/lib/email-templates/brand.tsx` (dark `#0b0b0f` cell + logo `Img`) and use it in all six templates.
- Add welcome sections to `signup.tsx` using inline styles from `emailBrand`; update subject in `webhook.ts`.
- Verify by rendering all six templates through the preview route and screenshotting the signup email.
- Note: the logo only appears in inboxes once the app is published (the image is served from the live site).  
  
  
and send this emial to evey user
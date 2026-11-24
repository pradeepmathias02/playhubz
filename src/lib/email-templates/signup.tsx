import * as React from 'react'
import { emailBrand } from './brand'
import { BrandHeader } from './BrandHeader'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Heading style={h2}>Hey, PlayHub Family! ❤️🍿</Heading>
        <Text style={text}>First of all, THANK YOU!</Text>
        <Text style={text}>
          Thank you for joining PlayHub and being part of our growing
          entertainment community. Whether you're here to discover movies,
          explore TV shows, check ratings, or keep track of your favourite
          titles, we're glad to have you with us.
        </Text>
        <Text style={text}>But this is just the beginning! 🚀</Text>
        <Heading style={h2}>🎬 What's Coming Next?</Heading>
        <Text style={text}>
          We're continuously working behind the scenes to make PlayHub even
          better.
        </Text>
        <Text style={text}>Here's a little glimpse of what's ahead:</Text>
        <Text style={text}>
          ✨ A refreshed and improved user experience.<br />
          🎥 Exciting new features and improvements.<br />
          🍿 Better ways to discover movies and TV shows.<br />
          ❤️ More personal touches for our growing community.<br />
          🚀 Plenty of surprises we've been working on!
        </Text>
        <Heading style={h2}>A Little Note From Our Team</Heading>
        <Text style={text}>
          PlayHub is growing, and we're committed to making it a better place
          for every movie and TV enthusiast.
        </Text>
        <Text style={text}>
          Your support means a lot to us. We're building this step by step, and
          we're excited to have you along for the journey.
        </Text>
        <Text style={text}>Stay tuned. The best is yet to come! 🔥</Text>
        <Text style={text}>
          With love,<br />
          <strong style={{ color: emailBrand.primary }}>Team PLAYHUB ❤️</strong>
        </Text>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: emailBrand.background, fontFamily: 'Arial, sans-serif' }
const container = { padding: '40px 28px', maxWidth: '520px', borderTop: `4px solid ${emailBrand.primary}` }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: emailBrand.foreground,
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: emailBrand.muted,
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: emailBrand.foreground, margin: '32px 0 14px' }
const button = {
  backgroundColor: emailBrand.primary,
  color: '#ffffff',
  fontSize: '14px',
  border: `1px solid ${emailBrand.primary}`,
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #FF4F8B !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #FF4F8B !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #FF4F8B !important; color: #ffffff !important; }
`

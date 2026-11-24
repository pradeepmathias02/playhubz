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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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

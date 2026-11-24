import * as React from 'react'
import { emailBrand } from './brand'
import { BrandHeader } from './BrandHeader'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: emailBrand.foreground,
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

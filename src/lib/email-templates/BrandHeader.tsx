import * as React from 'react'
import { Img, Section } from '@react-email/components'
import logo from '@/assets/playhub-logo-email.png.asset.json'

// Email clients need an absolute image URL, served from the live site.
const LOGO_URL = `https://playhubz.lovable.app${logo.url}`

export const BrandHeader = () => (
  <Section style={{ backgroundColor: '#0b0b0f', borderRadius: '10px', padding: '18px 20px', margin: '0 0 28px' }}>
    <Img src={LOGO_URL} alt="PlayHub" width="180" style={{ display: 'block', height: 'auto' }} />
  </Section>
)

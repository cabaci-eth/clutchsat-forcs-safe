/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

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
} from 'npm:@react-email/components@0.0.22'

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
    <Head />
    <Preview>You're almost in — confirm your email for ClutchSAT</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>⚡ ClutchSAT</Text>
        <Heading style={h1}>Welcome aboard! 🎯</Heading>
        <Text style={text}>
          You just signed up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>ClutchSAT</strong>
          </Link>
          — smart SAT prep built for students like you.
        </Text>
        <Text style={text}>
          Confirm your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to unlock thousands of practice questions, flashcards, and your personalized study plan.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify & Get Started
        </Button>
        <Text style={footer}>
          Didn't sign up? No worries — just ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const brand = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#3B82F6',
  margin: '0 0 24px',
  fontFamily: "'Space Grotesk', Arial, sans-serif",
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 16px',
  fontFamily: "'Space Grotesk', Arial, sans-serif",
}
const text = {
  fontSize: '15px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: '#3B82F6', textDecoration: 'underline' }
const button = {
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  driverName?: string
  passengerName?: string
  originAddress?: string
  destinationAddress?: string
  pickupAddress?: string
  departureTime?: string
  pricePerSeat?: string
  manageUrl?: string
}

const Email = ({
  driverName,
  passengerName,
  originAddress,
  destinationAddress,
  pickupAddress,
  departureTime,
  pricePerSeat,
  manageUrl,
}: Props) => (
  <Html lang="sk" dir="ltr">
    <Head />
    <Preview>
      {passengerName || 'Cestujúci'} sa chce pripojiť k vašej jazde — reagujte čo najskôr
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>TakeMe</Text>
        <Heading style={heading}>🙋 Nová žiadosť o jazdu!</Heading>
        <Text style={paragraph}>
          {driverName ? `Dobrý deň, ${driverName},` : 'Dobrý deň,'}
        </Text>
        <Text style={paragraph}>
          <strong>{passengerName || 'Cestujúci'}</strong> sa chce pripojiť k vašej jazde.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailRow}>
            <strong>Trasa:</strong> {originAddress || '—'} → {destinationAddress || '—'}
          </Text>
          {pickupAddress ? (
            <Text style={detailRow}>
              <strong>Vyzdvihnutie:</strong> {pickupAddress}
            </Text>
          ) : null}
          {departureTime ? (
            <Text style={detailRow}>
              <strong>Odchod:</strong> {departureTime}
            </Text>
          ) : null}
          {pricePerSeat ? (
            <Text style={detailRow}>
              <strong>Cena za miesto (hotovosť):</strong> {pricePerSeat}
            </Text>
          ) : null}
        </Section>

        <Text style={paragraph}>
          Čím skôr žiadosť potvrdíte alebo odmietnete, tým lepšia skúsenosť pre cestujúceho.
        </Text>

        {manageUrl ? (
          <Section style={buttonSection}>
            <Button style={button} href={manageUrl}>
              Otvoriť žiadosť
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          Tento e-mail ste dostali, pretože ste vodičom jazdy v aplikácii TakeMe.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `🙋 Nová žiadosť o jazdu — ${data.passengerName || 'cestujúci'} sa chce pripojiť`,
  displayName: 'Nová žiadosť o jazdu (vodič)',
  previewData: {
    driverName: 'Ján',
    passengerName: 'Mária Kováčová',
    originAddress: 'Prievidza',
    destinationAddress: 'Nitra',
    pickupAddress: 'Prievidza, autobusová stanica',
    departureTime: '22. 10. 2026 o 6:00',
    pricePerSeat: '5,00 €',
    manageUrl: 'https://www.takeme.sk',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: '#e11d48', margin: '0 0 16px' }
const heading = { fontSize: '22px', color: '#111827', margin: '0 0 12px' }
const paragraph = { fontSize: '15px', lineHeight: '1.5', color: '#374151', margin: '0 0 12px' }
const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 16px',
}
const detailRow = { fontSize: '14px', color: '#374151', margin: '0 0 6px' }
const buttonSection = { textAlign: 'center' as const, margin: '20px 0' }
const button = {
  backgroundColor: '#e11d48',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }

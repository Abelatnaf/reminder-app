import Stripe from 'stripe'
import { config } from './config.js'
import { getUser, upsertUser } from './users.js'

function getStripe() {
  if (!config.stripeSecretKey) throw Object.assign(new Error('Stripe is not configured.'), { status: 503 })
  return new Stripe(config.stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
}

export async function createCheckoutSession(userId, email) {
  const stripe = getStripe()
  const user = getUser(userId) || {}

  // Reuse existing customer or create a new one.
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } })
    customerId = customer.id
    upsertUser(userId, { stripeCustomerId: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: config.stripePriceId, quantity: 1 }],
    success_url: `${config.appUrl}/billing?success=1`,
    cancel_url: `${config.appUrl}/billing?cancelled=1`,
    metadata: { userId },
  })

  return session.url
}

export async function createPortalSession(userId) {
  const stripe = getStripe()
  const user = getUser(userId)
  if (!user?.stripeCustomerId) throw Object.assign(new Error('No billing account found.'), { status: 404 })

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.appUrl}/billing`,
  })
  return session.url
}

export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe()
  if (!config.stripeWebhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set.')

  const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret)

  const getUid = (obj) => obj?.metadata?.userId

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = getUid(session)
      if (userId) upsertUser(userId, { plan: 'pro' })
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const customer = await stripe.customers.retrieve(sub.customer)
      const userId = getUid(customer)
      if (userId) {
        const plan = sub.status === 'active' ? 'pro' : 'free'
        upsertUser(userId, { plan })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const customer = await stripe.customers.retrieve(sub.customer)
      const userId = getUid(customer)
      if (userId) upsertUser(userId, { plan: 'free' })
      break
    }
  }
}

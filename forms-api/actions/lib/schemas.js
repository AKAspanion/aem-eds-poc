/*
 * Validation schemas, ported from the Next.js app (src/services/forms/types.ts).
 * The site's forms post every value as a string, so inputs are normalised here:
 * phone/age/postcode lose spaces and dashes, consentAccepted "true" -> true.
 */
const { z } = require('zod');

const CITIES = [
  'Kuala Lumpur', 'Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Johor Bahru', 'George Town',
  'Ipoh', 'Malacca', 'Kuching', 'Kota Kinabalu', 'Seremban', 'Kuantan',
];
const PRODUCTS = ['prohance', 'prohance-hp', 'prohance-dm'];

const digits = (min, max) => z.preprocess(
  (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\s-]/g, '') : v),
  z.string().regex(new RegExp(`^\\d{${min},${max}}$`)),
);
const text = (max) => z.string().trim().min(1).max(max);
const honeypot = z.string().max(0).default('');

const contactSchema = z.object({
  fullName: text(100),
  email: z.email(),
  phone: digits(7, 15),
  age: digits(1, 3),
  gender: z.enum(['male', 'female', 'other']),
  consentAccepted: z.preprocess((v) => v === true || v === 'true' || v === 'on', z.literal(true)),
  website: honeypot,
});

const newsletterSchema = z.object({
  email: z.email(),
  source: z.enum(['footer', 'homeNutriverse', 'blog', 'videos']),
  website: honeypot,
});

const trialRequestSchema = z.object({
  fullName: text(100),
  email: z.email(),
  phone: digits(7, 15),
  address: text(200),
  city: z.enum(CITIES),
  pincode: digits(5, 6),
  product: z.enum(PRODUCTS),
  website: honeypot,
});

module.exports = {
  CITIES, PRODUCTS, contactSchema, newsletterSchema, trialRequestSchema,
};

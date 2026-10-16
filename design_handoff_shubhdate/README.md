# Handoff: ShubhDate — Indian Astrology App

## Overview
ShubhDate is a premium Indian astrology mobile app that helps users (primarily Indian women aged 15–40) find auspicious dates and times (muhurtas) for major life events — marriage meetings, proposals, griha pravesh, business launches, travel, and more. The design is high-fidelity, production-ready, and should feel like a premium spiritual luxury product — not a cheesy horoscope app.

## About the Design Files
The files in this bundle (`ShubhDate.html`, `ios-frame.jsx`) are **HTML design references** — interactive prototypes showing the intended look, feel, and navigation behavior. They are **not production code**. The task is to **recreate these designs in a React Native (recommended) or native iOS/Android codebase** using the project's established patterns and libraries.

If starting from scratch, React Native with Expo is the recommended framework given the cross-platform target audience.

## Fidelity
**High-fidelity.** This is a pixel-precise mockup with final colors, typography, spacing, component styles, and interactions. Recreate the UI as closely as possible using the target codebase's component primitives.

---

## Design Tokens

### Colors
```
Background layers (darkest to lightest):
  bg-0:        #0B1020   (primary background)
  bg-1:        #121A2F   (card backgrounds, modals)
  bg-2:        #1A2440   (elevated surfaces)

Gold accents:
  gold:        #D4A84F   (primary accent, borders, icons)
  gold-light:  #E6C97A   (text on dark, highlights)
  gold-deep:   #D97706   (gradient start, CTA backgrounds)

Other:
  purple:      #A8B4FF   (soft accent, future use)
  text:        #F8F3E8   (primary text)
  text-muted:  rgba(248,243,232,0.55)
  text-dim:    rgba(248,243,232,0.30)

Glass surfaces:
  glass-bg:    rgba(255,255,255,0.04)
  glass-border: rgba(212,168,79,0.18)
  glass-border-hover: rgba(212,168,79,0.55)
```

### Typography
```
Headings:   Cormorant Garamond (Google Font)
            Weights: 300, 400, 500, 600, 700
            Also used italic variants

Body/UI:    DM Sans (Google Font)
            Weights: 300, 400, 500, 600
```

### Spacing
```
Screen horizontal padding:  24px
Section vertical gap:       20–28px
Card internal padding:      14–16px
Card gap (list):            12px
Card gap (grid):            12px
```

### Border Radius
```
Cards (glassmorphism):  16px
Buttons (primary):      14px
Icon containers:        12px
Pills / badges:         20px
Circular avatars:       50%
```

### Shadows & Glow
```
Gold glow (selected card):  0 0 20px rgba(212,168,79,0.20), inset 0 0 20px rgba(212,168,79,0.08)
CTA button shadow:          0 4px 20px rgba(212,168,79,0.35)
Modal shadow:               0 -20px 60px rgba(0,0,0,0.50)
Mandala glow:               drop-shadow(0 0 24px #D4A84F88)
```

### Glassmorphism Card Pattern
```
background:     rgba(255,255,255,0.04)
border:         1px solid rgba(212,168,79,0.18)
border-radius:  16px
backdrop-filter: blur(12px)
transition:     all 0.2s
Hover state → border: rgba(212,168,79,0.55), box-shadow: 0 0 14px rgba(212,168,79,0.12)
Selected state → background: rgba(212,168,79,0.10), gold border + inner glow
```

### Gold CTA Button Pattern
```
background:     linear-gradient(135deg, #D97706, #D4A84F, #E6C97A)
color:          #0B1020
border-radius:  14px
padding:        14px 0 (full width)
font:           DM Sans 600, 15px, letter-spacing 0.03em
box-shadow:     0 4px 20px rgba(212,168,79,0.35)
Press state:    scale(0.97), reduced shadow
```

---

## Screens / Views

### Screen 0 — Language Welcome
**Purpose:** First-launch screen. User selects their language and chooses to create a profile or continue as guest. Tab bar is hidden.

**Layout:**
- Full screen scroll, no tab bar
- Top: Mandala graphic (120×120px), centered, with radial gold glow behind it, top padding 52px
- Below mandala: "ShubhDate" serif heading (32px, weight 300), subtitle "Choose your preferred language" (DM Sans 13px, muted)
- Language grid: 2-column, 8 cells, 10px gap, 24px horizontal padding
  - Each cell: 14px border-radius, 14px vertical padding, centered text
  - Native script label: Cormorant Garamond 20px (primary text color)
  - English label below: DM Sans 11px (muted)
  - Selected state: gold border, gold-tinted background, gold underline bar (16×2px)
- CTAs: "Create Profile ✨" (gold filled) + "Continue as Guest" (outlined), 12px gap, 24px padding

**Languages:** English, हिन्दी (Hindi), मराठी (Marathi), தமிழ் (Tamil), తెలుగు (Telugu), বাংলা (Bengali), ગુજરાતી (Gujarati), ಕನ್ನಡ (Kannada)

**State:** `language: string` (default 'en')

---

### Screen 1 — Home Dashboard
**Purpose:** Returning user home. Shows mandala hero, CTAs to start a query, and saved dates (or empty state for new users).

**Layout:**
- Animated star field background (SVG, ~50 twinkling stars)
- Top: "✦ Vedic Astrology ✦" (DM Sans 12px, gold, 0.18em letter-spacing, uppercase), then "ShubhDate" heading (serif 36px weight 300), top padding 60px
- Mandala SVG (200×200px), centered, with radial glow. Mandala rotates 360° over 60s
- Tagline: "Find Your Perfect Moment" (serif 26px italic weight 400), subtitle (DM Sans 13px muted)
- CTAs: "✨ Get My Auspicious Dates" (gold) + "Guest Mode" (outlined)
- Bottom section title: "Your Saved Dates" (serif 18px) + "See all →" link

**Empty States:**
- New user (no queries): card with 🌙 emoji, "Your journey begins here", explanation text, "Find My First Date ✨" CTA
- Has queried but nothing saved: card with 🔖 emoji, prompt to bookmark from results
- Has saves: list of GlassCards showing saved dates (icon, label, date·time, score ring)

**State:** `savedDates: Date[]`, `hasQueried: boolean`

---

### Screen 2 — Birth Profile Onboarding
**Purpose:** Capture user's birth details for personalized muhurta calculation. Step 2 of 3 in onboarding flow.

**Layout:**
- Star field background (~35 stars)
- Progress bar: 3 equal segments, first 2 filled with gold gradient (D97706→D4A84F), third empty (rgba white 10%)
- Progress label: "STEP 2 OF 3 — BIRTH DETAILS" (DM Sans 12px, muted, uppercase)
- Heading: "Your Cosmic Identity" (serif 30px weight 400), description (DM Sans 13px muted)
- Form fields (top padding 24px):
  - Full Name (text input)
  - Date of Birth (date picker)
  - Time of Birth (time picker)
  - City of Birth (text input)
  - All inputs: dark background (rgba white 5%), gold border, 12px radius, 13px 16px padding, DM Sans 14px
  - Labels above each input: DM Sans 11px gold uppercase 0.1em tracking
- Privacy note: GlassCard with 🔒 icon + "Your birth data is used only for astrological calculations…"
- CTA: "Continue →" gold button

**Navigation:** Continue → Event Type Selection

---

### Screen 3 — Event Type Selection
**Purpose:** User selects what type of event they want a muhurta for.

**Layout:**
- Star field background (~30 stars)
- Header: "✦ Step 3 of 3", "What Are You Planning?" (serif 30px), description (DM Sans 13px muted)
- 2-column grid of 8 event cards, 12px gap, 24px horizontal padding
- Each card: 20px vertical 12px horizontal padding, centered, flex column, 10px gap
  - Emoji icon (28px)
  - Label (DM Sans 12px weight 500, white-space: pre-line for 2-line labels)
  - Selected: gold underline bar (20×2px)
- Selected card: gold border, gold-tinted background, emoji gets gold drop-shadow glow
- CTA: "Find My Dates ✨" — disabled (0.45 opacity) until a card is selected

**Events:**
```
💍 Marriage Meeting
💒 Proposal
🏠 Griha Pravesh
💼 Business Launch
🛍️ Shop Opening
🚗 Vehicle Purchase
✈️ Travel
🎓 Exam & Interview
```

---

### Screen 4 — Results
**Purpose:** Show top 3 recommended auspicious dates. Cards 2 & 3 are paywalled.

**Layout:**
- Star field (~25 stars)
- Back button (← Back, DM Sans 13px muted)
- Category label (e.g. "💍 Marriage Meeting" — DM Sans 11px gold uppercase)
- Title: "Your Auspicious Dates" (serif 28px), subtitle: "Calculated for [Name] · [City]"
- 3 result cards, 14px gap, 24px horizontal padding. Each card:
  - Rank badge top-left: "#1 DATE" etc. — gold gradient for #1, dark glass for others
  - **Bookmark button** top-right (unlocked cards only): pill with bookmark SVG icon + "Save"/"Saved ✓" text. Tapping adds to savedDates.
  - Score ring (60px): SVG circle with gold stroke, score number centered in gold
  - Date (serif 17px weight 500), Time in gold (DM Sans 12px, "⏰ HH:MM AM – HH:MM PM")
  - Verdict pill: "Highly Auspicious ✨" etc. — glass background, gold border, gold-light text
  - Reason text (DM Sans 12px muted, line-height 1.5)
  - Cards 2 & 3: blur overlay (backdrop-filter blur 6px), 🔒 emoji + "Unlock Premium" in gold
- Sticky bottom CTA panel (above tab bar):
  - Dark glass card, "Unlock All 5 Dates & Full Analysis" (serif 15px)
  - Gold button: "Unlock All 5 Dates — ₹49/month"
  - Tapping locked cards OR sticky CTA opens Paywall Modal (Screen 5)

**Score Ring Component:**
- SVG size: 60px (configurable)
- Track: circle stroke rgba(212,168,79,0.15), strokeWidth 3
- Fill: circle stroke #D4A84F, strokeWidth 3, strokeLinecap round
- Dash = (score/100) × circumference, rotated -90°
- Score number centered, DM Sans 700 16px gold

---

### Screen 5 — Paywall Modal (Bottom Sheet)
**Purpose:** Upsell to Premium. Shown when user taps locked content or sticky CTA.

**Layout:**
- Full-screen scrim: rgba black 0.70, backdrop-filter blur 4px (tap to dismiss)
- Bottom sheet: slides up from bottom
  - Background: linear-gradient(160deg, #121A2F, #1A2440)
  - Top border-radius: 24px
  - Gold inner top border: inset 0 1px 0 rgba(212,168,79,0.15)
  - Handle: 36×4px, rgba white 15%, centered, 12px top margin
  - ✕ close button: 30px circle, top-right, rgba white 8%
- "✨ 7-Day Free Trial Included" badge: gold border pill, centered
- Headline: "Unlock Your Full Cosmic Blueprint" (serif 26px weight 400, centered, line-height 1.25)
- Subtitle: DM Sans 13px muted, centered
- Benefits list (4 items, 10px gap):
  - Gold circle checkmark (20px, gold border + "✓")
  - Benefit text (DM Sans 13px, line-height 1.45)
- Plan toggle (2 columns, 10px gap):
  - Monthly: ₹49/month | Lifetime: ₹399
  - Selected: gold border, gold-tinted bg, "#Most Popular" / "Best Value" badge above card (gold gradient)
  - Price: serif 20px, label: DM Sans 11px muted, centered
- "Start Free Trial →" gold button
- "No charge for 7 days · Cancel anytime" (DM Sans 11px dim, centered)

**Benefits copy:**
1. All 5 auspicious dates with full analysis
2. Personal Kundali chart & planetary report
3. Unlimited event queries per month
4. Priority access to expert astrologer consults

---

### Screen: My Events (Tab)
**Purpose:** View past queries and start new ones.

**Layout:**
- Header: "✦ Your Journey" label, "My Events" (serif 30px)
- "➕ Plan New Event" gold button
- "Recent queries" section label (DM Sans 13px muted)
- List of past event GlassCards: icon, label, "Queried [date]", "Results ready" status in gold

---

### Screen: Consult (Tab)
**Purpose:** Browse and connect with live Vedic astrologers.

**Layout:**
- Header: "✦ Live Experts", "Consult an Astrologer" (serif 30px)
- Subtitle: "Talk to verified Vedic experts in real-time"
- List of astrologer cards (GlassCard):
  - 50px circular avatar with green online indicator dot (10px, #4ade80, white border)
  - Name (DM Sans 14px weight 600), Specialization (11px muted)
  - ★ Rating + session count
  - CTA: "Talk Now" (gold gradient) or "Schedule" (outlined) depending on online status

---

### Screen: Saved (Tab)
**Purpose:** View bookmarked auspicious dates.

**Layout:**
- Header: "✦ Bookmarked", "Saved Dates" (serif 30px)
- List of saved date GlassCards (same as Home saved dates section)
- Empty state: 🪷 emoji, "No saved dates yet", explanation, "View Results →" CTA

---

### Screen: Profile (Tab)
**Purpose:** User settings, birth profile editing, language, notifications, subscription.

**Layout:**
- Avatar: 72px circle with gradient bg + gold border + 🌸 emoji
- Name (serif 24px), "✨ Premium Member" (DM Sans 12px gold), birth info (DM Sans 12px muted)
- Stats card: Queries / Saved / Consults (3 columns, serif 22px gold numbers)
- Settings list (GlassCard per item, 10px gap):
  - Icon (18px) + Label (DM Sans 14px) + optional value + "›" chevron
  - "Daily Panchang" item has inline toggle switch instead of chevron

**Settings items:**
```
👤 Edit Birth Profile    → modal with birth detail form
🌐 Language             → language picker grid (same as welcome screen)
🔔 Notifications        → toggle sheet (3 notification types)
🌙 Daily Panchang       → inline toggle + modal
💎 Manage Subscription  → plan details + upgrade/cancel
🔒 Privacy & Data       → policy + delete account
⭐ Rate ShubhDate       → 5-star rating sheet
```

All items open **bottom sheet modals** (ModalSheet pattern).

---

## Interactions & Behavior

### Navigation
- Stack-based navigation with 5 bottom tabs
- Tab bar hidden on Language Welcome screen
- Active tab icon/label: gold (#D4A84F), inactive: rgba white 30%
- Tab bar: 80px height, bottom 16px padding for home indicator

### Animations
- Star field: SVG opacity animation (twinkle), random duration 2–5s, staggered delay
- Mandala: CSS/SVG rotation 360° over 60s, `animateTransform` on SVG element
- GlassCard hover: border color + box-shadow transition, 0.2s
- Button press: `scale(0.97)`, 0.18s transition
- Toggle switches: left position transition 0.2s, background color transition 0.2s

### Bottom Sheet Modals
- Backdrop tap dismisses
- ✕ button dismisses
- Slide-up animation (React Native: use `Animated` or `react-native-reanimated` with `useSharedValue`)
- Gold top glow: `inset 0 1px 0 rgba(212,168,79,0.15)` on sheet container

### Score Ring
- SVG-based, not a third-party library
- Stroke dash animation optional (animate from 0 to final value on mount)

---

## State Management

### Global State (Context or Zustand store recommended)
```typescript
interface AppState {
  language: string;              // 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'gu' | 'kn'
  hasQueried: boolean;           // whether user has ever run a muhurta query
  savedDates: SavedDate[];       // bookmarked auspicious dates
  userProfile: UserProfile | null;
  notifications: {
    daily: boolean;
    muhurta: boolean;
    consult: boolean;
  };
  subscriptionPlan: 'free' | 'monthly' | 'lifetime';
}

interface SavedDate {
  label: string;       // e.g. "Marriage Meeting"
  icon: string;        // emoji
  date: string;        // e.g. "May 4, 2026"
  shortDate: string;   // unique key, e.g. "May 4, 2026"
  time: string;        // e.g. "10:30 AM – 1:00 PM"
  score: number;       // 0–100
}

interface UserProfile {
  name: string;
  dob: string;         // ISO date string
  tob: string;         // HH:MM
  city: string;
}
```

### Local State per Screen
- **EventSelectScreen**: `selectedEvent: number | null`
- **ResultsScreen**: `showPaywall: boolean`
- **PaywallModal**: `selectedPlan: 'monthly' | 'lifetime'`
- **ProfileScreen**: `openModal: string | null`, `editingProfile: UserProfile`, `notifications: object`

---

## Assets

### Mandala
The mandala is a custom SVG geometric pattern with:
- Concentric circles (5 rings, alternating gold/goldLight strokes, 0.2–0.6 opacity)
- 12 radial spokes with circle accent dots at the outer end
- 8 diamond/petal shapes between spokes
- Center dot (gold, 60% opacity)
- Continuous rotation animation (60s, infinite)
- Drop shadow glow filter: `drop-shadow(0 0 24px #D4A84F88)`

Recreate as a React Native SVG component using `react-native-svg`.

### Star Field
- ~25–50 SVG circle elements, random position, radius 0.3–1.8px, gold fill
- Each star has an SVG `animate` element for opacity pulse (twinkle)
- In React Native, implement with `react-native-svg` + `Animated` API

### Icons
All icons are SVG line icons (strokeWidth 1.8, no fill, 20×20px viewport). Recommended library: `lucide-react-native`. Icons used:
- Home, Calendar, Star (polygon), Heart, User (for tab bar)
- Bookmark (for save button on results)
- Lock (for privacy, paywall)

### Fonts
Load via Expo Google Fonts:
```
@expo-google-fonts/cormorant-garamond
@expo-google-fonts/dm-sans
```

---

## API Integration Notes

The prototype uses hardcoded mock data. The real app will need:

1. **Muhurta Calculation API** — takes birth details (lat/lng, date, time) + event type → returns ranked auspicious windows with scores and reasons
2. **Astrologer Listing API** — real-time availability, ratings, session counts
3. **Payment Gateway** — Razorpay recommended for INR billing (₹49/month, ₹399 lifetime)
4. **User Auth** — phone number OTP (common in India, no email required)

---

## Files in This Package

| File | Description |
|---|---|
| `ShubhDate.html` | Full interactive prototype — all 9 screens connected. Open in browser to explore. |
| `ios-frame.jsx` | iOS device frame component used to wrap the prototype in a phone bezel. Not needed for production. |
| `README.md` | This document. |

---

## Implementation Recommendations

1. **Framework**: React Native + Expo (SDK 51+)
2. **Navigation**: `expo-router` with tab-based layout
3. **Animations**: `react-native-reanimated` v3 for bottom sheets and transitions
4. **Bottom Sheets**: `@gorhom/bottom-sheet` for the modal pattern
5. **SVG**: `react-native-svg` for mandala, star field, score rings
6. **Blur**: `expo-blur` for glassmorphism effects
7. **Gradients**: `expo-linear-gradient`
8. **Fonts**: `@expo-google-fonts/cormorant-garamond` + `@expo-google-fonts/dm-sans`
9. **Icons**: `lucide-react-native`
10. **State**: `zustand` for global state, React `useState` for local screen state
11. **Payments**: Razorpay React Native SDK
12. **Auth**: Firebase Phone Auth or Supabase with OTP

---

*Designed in April 2026. For questions about design intent, refer to the interactive prototype in `ShubhDate.html`.*

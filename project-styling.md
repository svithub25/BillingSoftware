# SV's BizzSaathi - Project Styling Guide

This document serves as the **source of truth** for all styling decisions in the SV's BizzSaathi application. Always refer to this guide when implementing UI components.

## Core Principle

**Always use standard Tailwind utility classes. Do NOT use arbitrary values like `w-[43px]` or `text-[#3b82f6]` unless absolutely necessary.**

Use semantic class names from Tailwind's design system. This ensures consistency, maintainability, and adherence to the design system.

---

## Color Palette

### Primary (Blue)
Used for primary actions, active states, and brand elements.

| Semantic Name | Tailwind Class | Usage |
|--------------|----------------|-------|
| Primary Background | `bg-blue-600` | Primary buttons, active elements |
| Primary Hover | `bg-blue-700` | Hover state for primary buttons |
| Primary Light | `bg-blue-50` | Active navigation items, light backgrounds |
| Primary Text | `text-blue-700` | Active navigation text, emphasized text |
| Primary Border | `border-blue-700` | Active state borders |
| Primary Medium | `bg-blue-500` | Alternative primary actions |

### Neutral (Gray)
Used for text, borders, backgrounds, and secondary actions.

| Semantic Name | Tailwind Class | Usage |
|--------------|----------------|-------|
| Text Primary | `text-gray-900` | Main headings, primary text |
| Text Secondary | `text-gray-700` | Secondary headings, body text |
| Text Tertiary | `text-gray-600` | Muted text, inactive navigation |
| Text Muted | `text-gray-500` | Helper text, icons |
| Background Light | `bg-gray-50` | Page backgrounds, hover states |
| Background Medium | `bg-gray-100` | Secondary hover states |
| Border | `border-gray-200` | Default borders, dividers |
| Border Dark | `border-gray-300` | Emphasized borders |
| White | `bg-white` | Card backgrounds, containers |

### Destructive (Red)
Used for delete actions, errors, and warnings.

| Semantic Name | Tailwind Class | Usage |
|--------------|----------------|-------|
| Destructive Background | `bg-red-600` | Delete buttons, error states |
| Destructive Hover | `bg-red-700` | Hover state for destructive buttons |
| Destructive Light | `bg-red-50` | Error backgrounds, alerts |
| Destructive Text | `text-red-700` | Error text |
| Destructive Medium | `bg-red-500` | Alternative destructive actions |

### Success (Green)
Used for success states and positive actions.

| Semantic Name | Tailwind Class | Usage |
|--------------|----------------|-------|
| Success Background | `bg-green-600` | Success buttons |
| Success Hover | `bg-green-700` | Hover state for success buttons |
| Success Light | `bg-green-50` | Success backgrounds |
| Success Text | `text-green-700` | Success messages |

---

## Border Radius

| Size | Tailwind Class | Rem Value | Usage |
|------|----------------|-----------|-------|
| Small | `rounded-md` | 0.375rem | Input fields, small buttons |
| Medium | `rounded-lg` | 0.5rem | Cards, buttons, large containers |
| Default | `rounded` | 0.25rem | General purpose rounding |
| Full | `rounded-full` | 9999px | Circular elements, badges |

**Standard Usage:**
- **Cards**: `rounded-lg`
- **Buttons**: `rounded-md`
- **Inputs**: `rounded-md`
- **Modals**: `rounded-lg`

---

## Spacing Scale

### Padding

| Size | Tailwind Class | Rem Value | Px Value | Usage |
|------|----------------|-----------|----------|-------|
| Extra Small | `p-1` | 0.25rem | 4px | Icon padding, tight spacing |
| Small | `p-2` | 0.5rem | 8px | Button padding, compact elements |
| Medium | `p-3` | 0.75rem | 12px | Navigation items, form elements |
| Large | `p-4` | 1rem | 16px | Container padding, headers |
| Extra Large | `p-6` | 1.5rem | 24px | Card padding, section spacing |

### Horizontal Padding

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| Small | `px-3` | Buttons, small inputs |
| Medium | `px-4` | Navigation items, inputs |
| Large | `px-6` | Cards, wide containers |

### Vertical Padding

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| Small | `py-1` | Compact buttons, badges |
| Medium | `py-2` | Buttons, inputs |
| Large | `py-3` | Navigation items |
| Extra Large | `py-4` | Large buttons, headers |

### Margin

Use the same scale as padding (m-1, m-2, m-3, m-4, m-6, etc.)

### Spacing Between Elements

| Tailwind Class | Usage |
|----------------|-------|
| `space-x-2` | Small gaps between inline elements |
| `space-x-4` | Medium gaps between buttons |
| `space-y-2` | Small vertical gaps in forms |
| `space-y-4` | Medium vertical gaps in sections |

---

## Shadows

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| Small | `shadow-sm` | Cards, subtle elevation |
| Medium | `shadow-lg` | Modals, dropdowns |
| Large | `shadow-xl` | Overlays, important modals |
| None | `shadow-none` | Remove shadow |

**Standard Usage:**
- **Cards**: `shadow-sm`
- **Buttons on hover**: No shadow (use color transition)
- **Modals**: `shadow-xl`
- **Sidebars**: `shadow-lg`

---

## Typography

### Font Sizes

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| Extra Small | `text-xs` | Helper text, badges |
| Small | `text-sm` | Body text, navigation items |
| Base | `text-base` | Default text |
| Large | `text-lg` | Section headings |
| Extra Large | `text-xl` | Page titles |

### Font Weights

| Weight | Tailwind Class | Usage |
|--------|----------------|-------|
| Normal | `font-normal` | Body text |
| Medium | `font-medium` | Navigation, buttons |
| Semibold | `font-semibold` | Headings, emphasized text |
| Bold | `font-bold` | Important headings |

---

## Component Primitives

### Buttons

#### Primary Button
```jsx
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
```

**Usage:** Main actions, form submissions, confirmations

#### Secondary Button
```jsx
className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
```

**Usage:** Cancel actions, secondary options

#### Destructive Button
```jsx
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
```

**Usage:** Delete actions, dangerous operations

#### Ghost Button (Text Only)
```jsx
className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
```

**Usage:** Less prominent actions, menu items

#### Icon Button
```jsx
className="p-2 rounded-md hover:bg-gray-100 transition-colors"
```

**Usage:** Toolbar actions, close buttons

### Inputs

#### Text Input
```jsx
className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

#### Input Label
```jsx
className="block text-sm font-medium text-gray-700 mb-1"
```

#### Input Error State
```jsx
className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
```

### Cards

#### Standard Card
```jsx
className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
```

**Usage:** Content containers, sections

#### Stat Card (Dashboard)
```jsx
className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
```

With icon container:
```jsx
className="bg-blue-50 p-3 rounded-lg"
```

### Navigation

#### Active Navigation Item
```jsx
className="bg-blue-50 text-blue-700 border-r-2 border-blue-700 px-4 py-3 text-sm font-medium transition-colors"
```

#### Inactive Navigation Item
```jsx
className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-4 py-3 text-sm font-medium transition-colors"
```

### Tabs

#### Active Tab
```jsx
className="border-b-2 border-blue-500 text-blue-600 px-4 py-2 text-sm font-medium"
```

#### Inactive Tab
```jsx
className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-4 py-2 text-sm font-medium"
```

### Modals

#### Modal Overlay
```jsx
className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50"
```

#### Modal Container
```jsx
className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
```

#### Modal Header
```jsx
className="text-lg font-semibold text-gray-900 mb-4"
```

### Headers

#### Page Header
```jsx
className="bg-white shadow-sm border-b border-gray-200"
```

#### Section Header
```jsx
className="text-lg font-semibold text-gray-900"
```

---

## Transitions

Always use smooth transitions for interactive elements:

```jsx
className="transition-colors"  // For color changes
className="transition-all"     // For multiple properties
className="duration-300"        // Optional: custom duration
```

**Standard transition classes:**
- `transition-colors`: For hover states on buttons, links
- `transition-all`: For complex animations (sidebar collapse, etc.)
- Default duration is fine (150ms) for most cases

---

## Borders

| Type | Tailwind Class | Usage |
|------|----------------|-------|
| Default | `border` | General borders (1px) |
| Thick | `border-2` | Emphasized borders, active states |
| Bottom only | `border-b` | Dividers, headers |
| Right only | `border-r-2` | Active navigation indicators |
| Color | `border-gray-200` | Default border color |
| Dark | `border-gray-300` | Emphasized borders |

---

## Common Patterns

### Container Layout
```jsx
<div className="min-h-screen bg-gray-50">
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    {/* Content */}
  </div>
</div>
```

### Form Field
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Field Label
  </label>
  <input
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
```

### Button Group
```jsx
<div className="flex items-center space-x-4">
  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
    Save
  </button>
  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors">
    Cancel
  </button>
</div>
```

### Icon with Text
```jsx
<div className="flex items-center space-x-2">
  <Icon className="w-5 h-5 text-gray-500" />
  <span className="text-sm text-gray-700">Label</span>
</div>
```

---

## Grid & Layout

### Common Grid Patterns
```jsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

### Flex Patterns
```jsx
className="flex items-center justify-between"  // Horizontal layout with space-between
className="flex flex-col space-y-4"            // Vertical layout with spacing
```

---

## Responsive Design

### Breakpoints
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

### Common Responsive Patterns
```jsx
className="hidden lg:block"          // Show only on desktop
className="lg:hidden"                // Show only on mobile/tablet
className="w-full lg:w-1/2"          // Full width on mobile, half on desktop
```

---

## Icons

**Icon Library:** Lucide React (`lucide-react`)

**Standard Icon Sizes:**
- Small: `w-4 h-4` (16px)
- Medium: `w-5 h-5` (20px)
- Large: `w-6 h-6` (24px)

**Icon Colors:**
- Default: `text-gray-500`
- Active: `text-blue-700`
- Error: `text-red-700`
- Success: `text-green-700`

---

## Z-Index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Base | `z-0` | Default layer |
| Above | `z-10` | Dropdowns, tooltips |
| Sidebar | `z-30` | Side navigation |
| Overlay | `z-40` | Modal overlays |
| Modal | `z-50` | Modal content |

---

## Do's and Don'ts

### ✅ Do
- Use standard Tailwind utility classes
- Follow the established color palette
- Use consistent spacing from the scale
- Apply transitions to interactive elements
- Use semantic color names (primary, destructive, etc.)
- Maintain consistent border radius across similar components

### ❌ Don't
- Use arbitrary values like `w-[43px]` or `text-[#3b82f6]`
- Mix different spacing scales inconsistently
- Create custom CSS when Tailwind utilities exist
- Use inline styles
- Deviate from the established color palette without discussion
- Use different border radius values for similar components

---

## Notes

- This styling guide is based on the existing components in the codebase (Layout, Dashboard, Admin, Billing, etc.)
- When in doubt, refer to existing implementations of similar components
- For new components not covered here, follow the established patterns and update this guide
- All colors are based on Tailwind's default color palette
- Focus states use `focus:ring-2 focus:ring-blue-500 focus:outline-none` for accessibility

---

**Last Updated:** 2025-11-28
**Maintainer:** Development Team

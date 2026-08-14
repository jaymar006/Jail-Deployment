# Jail Information System — Modern Minimal + Material Design UI Redesign

You are working on an existing **Jail Information System** web application.

Your task is to **redesign the frontend UI/UX** using a **Modern Minimal + Material Design** visual style.

## IMPORTANT

* Do **NOT** rewrite or remove existing functionality.
* Do **NOT** change the backend API unless absolutely necessary.
* Do **NOT** change database logic.
* Do **NOT** remove existing pages, routes, features, or components.
* Preserve all existing functionality.
* Focus primarily on **frontend visual design, layout, consistency, usability, and UX**.
* Before making changes, inspect the existing frontend structure, components, pages, routing, and styling system.
* Reuse existing components where practical.
* Avoid unnecessary dependencies unless they provide significant value.

---

# 1. Overall Design Direction

Use:

> **Modern Minimal + Material Design + Professional Government/Institutional Dashboard**

The application should feel:

* Professional
* Trustworthy
* Clean
* Organized
* Modern
* Serious
* Easy to use
* Appropriate for a government/jail management environment

Avoid making it look like:

* A gaming dashboard
* A futuristic/cyberpunk application
* A cryptocurrency dashboard
* A flashy startup landing page
* A heavily glassmorphic interface
* A heavily neumorphic interface

The design should prioritize **readability and usability over visual effects**.

---

# 2. Color System

Use a restrained professional color palette.

Primary:

* Deep navy / institutional blue

Secondary:

* Slate
* Gray
* White
* Light blue accents

Background:

* Very light gray or off-white

Cards:

* White

Text:

* Dark charcoal / near-black

Use colors consistently throughout the application.

Status colors should be semantic:

* Green → Active / Allowed / Successful
* Yellow/Amber → Pending / Warning
* Red → Denied / Error / Restricted
* Blue → Information
* Gray → Inactive / Disabled

Do not overuse bright colors.

---

# 3. Layout

Create a professional dashboard structure.

Use:

### Sidebar

A persistent navigation sidebar containing the major modules.

Example:

* Dashboard
* PDL Management
* Visitors
* Visitation
* QR Scanner
* Logs
* Reports
* Cells
* Denied Visitors
* Settings

The sidebar should clearly show:

* Current page
* Icons
* Labels
* Hover states
* Active state
* Optional collapsed state if appropriate

Keep it compact and professional.

---

# 4. Header

Create a clean application header.

Include where appropriate:

* Current page/breadcrumb
* Search
* Notifications
* User profile
* Username
* Logout
* Optional system status

Avoid unnecessary header elements.

---

# 5. Dashboard

Redesign the dashboard into a clean information overview.

Use Material-style cards for important metrics.

Example:

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Total PDLs     │ │ Visitors Today │ │ Active Visits  │
│      128       │ │       43       │ │       17       │
└────────────────┘ └────────────────┘ └────────────────┘
```

Cards should have:

* Clear title
* Large number
* Small supporting information
* Optional subtle icon
* Consistent spacing

Avoid excessive gradients.

---

# 6. Tables

Tables are extremely important because this is a management system.

Create clean, professional data tables.

Requirements:

* Clear column headers
* Good spacing
* Row hover state
* Alternating rows only if useful
* Pagination
* Search/filter controls
* Sortable columns where appropriate
* Clear action buttons
* Status badges
* Responsive behavior

Example:

```text
┌──────────────────────────────────────────────────────────┐
│ Search PDL...                         Filter ▼   Add PDL +│
├──────────────┬──────────────┬──────────┬─────────────────┤
│ Name         │ PDL ID       │ Cell     │ Status          │
├──────────────┼──────────────┼──────────┼─────────────────┤
│ Juan Cruz    │ PDL-001      │ Cell A1  │ ● Active        │
│ Pedro Santos │ PDL-002      │ Cell B2  │ ● Active        │
│ Mario Reyes  │ PDL-003      │ Cell C1  │ ● Inactive      │
└──────────────┴──────────────┴──────────┴─────────────────┘
```

Avoid overly decorative tables.

---

# 7. Forms

Redesign forms using Material Design principles.

Use:

* Clear labels
* Consistent input sizes
* Proper spacing
* Input validation
* Helpful error messages
* Clear required-field indicators
* Group related fields
* Logical sections

For large forms, use sections/cards instead of one giant form.

Example:

```text
Personal Information
────────────────────────────────────

First Name       Last Name
[____________]   [____________]

Date of Birth    Gender
[____________]   [____________]


PDL Information
────────────────────────────────────

PDL Number       Cell
[____________]   [____________]

Status
[ Active ▼ ]
```

---

# 8. Buttons

Use clear Material-style buttons.

Primary actions:

* Filled button

Secondary actions:

* Outlined button

Low-priority actions:

* Text button

Dangerous actions:

* Clearly communicate destructive intent

Examples:

* Add PDL
* Add Visitor
* Save Changes
* Scan QR
* Export
* Edit
* Delete

Do not make every button visually dominant.

---

# 9. Modals / Dialogs

Use clean Material-style dialogs.

For destructive actions, require confirmation.

Example:

```text
Delete Visitor?

Are you sure you want to delete this visitor?
This action cannot be undone.

             Cancel     Delete
```

Dialogs should have:

* Clear title
* Short explanation
* Appropriate action buttons
* Good spacing

---

# 10. Status Badges

Use compact status badges.

Examples:

```text
● Active
● Allowed
● Pending
● Denied
● Inactive
```

Make status immediately understandable.

Do not rely only on color. Include text/icons as well.

---

# 11. QR Scanner

The QR functionality should remain functional.

Improve the UI around the scanner.

Make the scanner page feel like a dedicated operational tool.

Include:

* Clear scanning area
* Instructions
* Scanner status
* Success state
* Error state
* Visitor information after successful scan

Example:

```text
              Scan Visitor QR

        ┌──────────────────────┐
        │                      │
        │       QR AREA        │
        │                      │
        └──────────────────────┘

           Position QR code
             inside frame

              [ Cancel ]
```

---

# 12. Notifications / Toasts

Use clean Material-style feedback.

Examples:

Success:

> Visitor successfully registered.

Warning:

> Visitor already has an active visitation record.

Error:

> Unable to save visitor information.

Keep notifications concise.

---

# 13. Typography

Use a modern readable sans-serif font.

Prioritize:

* Clear hierarchy
* Readability
* Appropriate font weights
* Consistent heading sizes

Recommended hierarchy:

```text
Page Title
  ↓
Section Title
  ↓
Card Title
  ↓
Body Text
  ↓
Supporting Text
```

Do not use excessive font sizes.

---

# 14. Spacing

Use a consistent spacing system.

Prefer predictable spacing such as:

```text
4px
8px
12px
16px
24px
32px
48px
```

Avoid random margins and padding throughout components.

---

# 15. Border Radius

Use moderate rounding.

Recommended:

* Buttons: 6–8px
* Inputs: 6–8px
* Cards: 8–12px
* Dialogs: 10–12px

Avoid extremely rounded/pill-shaped everything.

---

# 16. Shadows

Use subtle Material-style elevation.

Example hierarchy:

* Normal card → very subtle shadow
* Hover → slightly stronger
* Dialog → stronger elevation
* Sidebar → subtle separation

Avoid huge shadows.

---

# 17. Responsive Design

The application must remain usable on:

* Desktop
* Laptop
* Tablet
* Smaller screens

Desktop is the primary target because this is an administrative system, but the UI should degrade gracefully.

Tables should have appropriate horizontal scrolling or responsive layouts.

Do not simply shrink everything.

---

# 18. Accessibility

Improve accessibility wherever possible.

Ensure:

* Good contrast
* Keyboard navigation
* Visible focus states
* Labels for inputs
* Accessible buttons
* Meaningful icons
* Tooltips for icon-only buttons
* Don't rely solely on color to communicate status

---

# 19. Icons

Use a consistent icon library if one already exists in the project.

Do not mix multiple icon styles.

Icons should support the UI rather than dominate it.

Examples:

Dashboard → Dashboard icon
PDLs → People icon
Visitors → Person Add icon
QR Scanner → QR Code icon
Logs → History icon
Reports → Assessment icon
Settings → Settings icon

---

# 20. Animations

Use subtle animations only.

Good:

* Button hover
* Sidebar transitions
* Modal appearance
* Toast appearance
* Table hover
* Loading states

Avoid:

* Excessive bouncing
* Large page transitions
* Constant motion
* Decorative animations that distract users

The application should feel fast and professional.

---

# 21. Loading States

Improve loading experiences.

Use:

* Skeleton loaders
* Spinners where appropriate
* Disabled states
* Progress indicators

Avoid displaying a blank page while data loads.

---

# 22. Empty States

Create professional empty states.

Example:

```text
No Visitors Found

There are currently no visitors matching your search.

             + Add Visitor
```

Avoid showing completely blank areas.

---

# 23. Error States

Make errors understandable to users.

Bad:

> Error 500

Better:

> Unable to load visitor records.
> Please try again.

Include a retry action when appropriate.

---

# 24. Login Page

Redesign the login page to match the institutional theme.

It should feel:

* Secure
* Professional
* Simple
* Trustworthy

Possible layout:

```text
┌───────────────────────────────────────────┐
│                                           │
│             🏛️ JAIL INFORMATION           │
│                   SYSTEM                  │
│                                           │
│        Username                           │
│        [________________________]         │
│                                           │
│        Password                           │
│        [________________________]         │
│                                           │
│              [     LOGIN     ]            │
│                                           │
└───────────────────────────────────────────┘
```

Avoid flashy login animations.

---

# 25. Overall UX Principles

Follow these principles throughout the redesign:

1. **Clarity over decoration**
2. **Consistency over creativity**
3. **Functionality over visual effects**
4. **Readable data over dense layouts**
5. **Professional over flashy**
6. **Fast interactions over animations**
7. **Clear feedback after every important action**

---

# 26. Code Quality

While redesigning:

* Keep components reusable.
* Avoid duplicating styles.
* Create reusable UI components where appropriate.
* Maintain the existing architecture where possible.
* Do not introduce unnecessary complexity.
* Do not break existing API integrations.
* Do not remove existing functionality.
* Keep responsive behavior in mind.
* Keep styling consistent across all pages.

If the project already uses a UI/component library, determine whether it can be leveraged before adding another one.

---

# 27. Implementation Process

Before making changes:

### Step 1

Inspect the existing frontend.

Identify:

* Framework
* Routing
* Component structure
* CSS/styling system
* Existing UI library
* Existing reusable components
* API/service structure

### Step 2

Identify the major pages.

### Step 3

Create a consistent design system.

Define:

* Colors
* Typography
* Spacing
* Border radius
* Shadows
* Buttons
* Inputs
* Cards
* Tables
* Modals
* Badges

### Step 4

Redesign the shared layout first:

* Sidebar
* Header
* Navigation
* Global styles

### Step 5

Redesign pages consistently.

Prioritize:

1. Login
2. Dashboard
3. PDL Management
4. Visitor Management
5. Visitation
6. QR Scanner
7. Logs
8. Reports
9. Cells
10. Denied Visitors
11. Settings

### Step 6

Test every existing feature after the redesign.

Verify:

* Login
* CRUD operations
* Search
* Filtering
* Pagination
* QR scanning
* Visitor registration
* PDL management
* Logs
* Reports
* Excel import/export
* Logout

---

# FINAL DESIGN GOAL

The final application should look like a **professional government/institutional information management system**.

Think:

> **Modern Minimal + Material Design + Enterprise Dashboard**

Not:

> flashy startup website

Not:

> cyberpunk dashboard

Not:

> excessive glassmorphism

Not:

> excessive neumorphism

The user should immediately feel:

**"This is a serious, secure, professional system used for managing important records."**

Make the UI polished enough to be suitable for a real-world jail/government environment while preserving all existing functionality.

---
title: "@intcloudsysops/components"
description: "Shared React components and design system"
---
# @intcloudsysops/components

Shared React components and design system for all Opsly UI applications (portal, admin, local-services).

## Components

### UI

- **Button** — Interactive button with variants (primary, secondary, danger)
- **Form** — Container with layout options (vertical, horizontal, inline)
- **Card** — Content container with elevation
- **Modal** — Dialog component with overlay

### Hooks

- **useAuth** — Get current user, loading state
- **useTheme** — Toggle dark/light theme, persist preference
- **useAPI** — Fetch data with loading, error, data states

## Usage

```typescript
import { Button, Form, FormField, Card, useAuth, useTheme } from '@intcloudsysops/components';

export function MyComponent() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Card>
      <h2>Hello, {user?.name}</h2>
      <Button variant="primary" onClick={toggleTheme}>
        Switch to {theme === 'light' ? 'dark' : 'light'} mode
      </Button>
    </Card>
  );
}
```

## Storybook

View components in isolation:

```bash
npm run storybook --workspace=@intcloudsysops/components
```

Browse at `http://localhost:6006`

## Design System

- **Colors** — See `styles/tokens.ts`
- **Spacing** — 4px, 8px, 12px, 16px, 24px, 32px
- **Typography** — 12px–32px scale, system fonts
- **Accessibility** — WCAG 2.1 AA compliant

## Versioning

- PATCH: Bug fixes, style adjustments
- MINOR: New components, props
- MAJOR: Removed components, breaking props

## Integration

### Portal

```typescript
import { Button, Modal } from '@intcloudsysops/components';

export function SettingsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <Button variant="primary">Save</Button>
    </Modal>
  );
}
```

### Admin

```typescript
import { Form, FormField, Card } from '@intcloudsysops/components';

export function TenantForm() {
  return (
    <Card>
      <Form>
        <FormField label="Name" required>
          <input type="text" />
        </FormField>
      </Form>
    </Card>
  );
}
```

## See Also

- `GOVERNANCE.md` — Component standards, review process
- `.storybook/` — Storybook configuration
- `__tests__/` — Component tests

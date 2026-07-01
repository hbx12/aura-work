# Aura Work — Accessibility Guide

Guide for making Aura Work accessible to all users.

## Table of Contents

- [Overview](#overview)
- [Standards](#standards)
- [Implementation](#implementation)
- [Testing](#testing)
- [Resources](#resources)

---

## Overview

Aura Work is committed to accessibility for all users, including those with disabilities.

### Key Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and roles
- **High Contrast**: High contrast theme available
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Text Scaling**: Supports up to 200% text scaling
- **RTL Support**: Full right-to-left layout support

---

## Standards

### WCAG 2.1 AA Compliance

Aura Work aims for WCAG 2.1 AA compliance:

1. **Perceivable**
   - Text alternatives for images
   - Captions for multimedia
   - Adaptable content
   - Distinguishable content

2. **Operable**
   - Keyboard accessible
   - Enough time
   - Navigable
   - Input modalities

3. **Understandable**
   - Readable
   - Predictable
   - Input assistance

4. **Robust**
   - Compatible
   - Valid markup

---

## Implementation

### ARIA Labels

```tsx
// Good: Descriptive aria-label
<button aria-label="Toggle theme">
  <Icon name="sun" />
</button>

// Good: aria-labelledby
<div aria-labelledby="settings-title">
  <h2 id="settings-title">Settings</h2>
</div>
```

### Keyboard Navigation

```tsx
// Support keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      openSearch();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Focus Management

```tsx
// Trap focus in modals
const Modal = ({ children, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();
  }, []);

  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {children}
    </div>
  );
};
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast

```css
@media (prefers-contrast: high) {
  :root {
    --border-1: #000000;
    --border-2: #000000;
  }
}
```

### Text Scaling

```css
:root {
  --text-scale: 1;
}

html {
  font-size: calc(16px * var(--text-scale));
}
```

---

## Testing

### Manual Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators
   - Test keyboard shortcuts

2. **Screen Reader**
   - Test with NVDA (Windows)
   - Test with VoiceOver (macOS)
   - Test with Orca (Linux)

3. **Color Contrast**
   - Use browser DevTools
   - Check all themes
   - Verify text readability

4. **Zoom**
   - Test at 100%, 150%, 200%
   - Verify no content overflow
   - Check responsive layout

### Automated Testing

```typescript
// Test ARIA labels
it('should have aria-label on buttons', () => {
  render(<Button aria-label="Submit" />);
  expect(screen.getByLabelText('Submit')).toBeInTheDocument();
});

// Test keyboard navigation
it('should be keyboard accessible', () => {
  render(<Component />);
  userEvent.tab();
  expect(screen.getByRole('button')).toHaveFocus();
});
```

### Accessibility Tools

1. **axe DevTools**: Browser extension
2. **Lighthouse**: Performance and accessibility
3. **WAVE**: Web accessibility evaluation
4. **Color Contrast Analyzer**: Color checking

---

## Common Issues

### Missing Alt Text

```tsx
// Bad
<img src="icon.svg" />

// Good
<img src="icon.svg" alt="Settings icon" />
```

### Missing Labels

```tsx
// Bad
<input type="text" />

// Good
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

### Missing Roles

```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<div 
  role="button" 
  tabIndex={0} 
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Click me
</div>
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Accessibility](https://react.dev/reference/react-dom/components/common#react-18-accessibility)
- [axe-core](https://github.com/dequelabs/axe-core)

---

## Contributing

When contributing to Aura Work:

1. Add ARIA labels to interactive elements
2. Ensure keyboard navigation works
3. Test with screen readers
4. Check color contrast
5. Support reduced motion
6. Add focus indicators

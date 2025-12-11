# CSS Organization

## Global Styles (`global.css`)
- **Purpose**: Application-wide styles, theme definitions, and Mantine component overrides
- **Contains**:
  - CSS resets and base styles
  - Theme-specific styles (dark/light mode)
  - Global Mantine component overrides (Slider, Card, Button, etc.)
  - Scrollbar styling
  - Focus and selection styles

## Module CSS Files
- **Purpose**: Component-specific styles with CSS Modules for scoping
- **Pattern**: `ComponentName.module.css`
- **Benefits**:
  - Scoped styles (no global conflicts)
  - Co-located with components
  - Type-safe class names

## Current Structure
```
src/
├── global.css                          # Global styles and theme
├── VolumeControlApp.module.css         # Main app layout
└── components/
    ├── common/
    │   └── StatusIndicator/
    │       └── StatusIndicator.module.css
    └── volume-control/
        ├── ApplicationCard/
        │   └── ApplicationCard.module.css
        ├── CardModal/
        │   └── CardModal.module.css
        └── VolumeSlider/
            └── VolumeSlider.module.css
```

## Best Practices
1. **Global CSS**: Only for truly global styles and theme definitions
2. **Module CSS**: For all component-specific styles
3. **No inline styles**: Use CSS classes for maintainability
4. **Theme consistency**: Use CSS custom properties from Mantine theme

## Cleanup Completed
- ✅ Removed unused `App.css`
- ✅ Removed duplicate background gradients from `VolumeControlApp.module.css`
- ✅ Consolidated theme styles in `global.css`

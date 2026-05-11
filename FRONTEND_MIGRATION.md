# Frontend TypeScript + Tailwind Migration Guide

## Overview
The frontend is being migrated from JSX + CSS to TypeScript (.tsx) + Tailwind CSS. This preserves all visual behavior and functionality while improving type safety and maintainability.

## Migration Strategy

### Phase 1: Infrastructure (Done)
- ✅ TypeScript configuration (`tsconfig.json`)
- ✅ Tailwind CSS setup (`tailwind.config.js`)
- ✅ Type stubs and utility types

### Phase 2: Foundational Conversions (In Progress)
1. **API Client** - Add full TypeScript types for API responses/requests
2. **Auth Context** - Convert with proper Context typing
3. **Hooks** - Add return types and parameter types
4. **Utility functions** - Add parameter and return types

### Phase 3: Component Conversion (Batched by feature)
- Convert `components/3d/` (Three.js/Cesium components)
- Convert `components/hero/` (Landing page components)
- Convert `features/` (Feature components)
- Convert `pages/` (Page components)
- Convert `layouts/` (Layout components)

### Phase 4: CSS to Tailwind Migration
- Preserve design tokens (already in Tailwind config)
- Convert class names systematically
- Use Tailwind's `@apply` for complex utilities
- Keep responsive design patterns

### Phase 5: TanStack Query + State Management
- Replace fetch calls with TanStack Query hooks
- Add cache invalidation patterns
- Keep Zustand for UI-only state

## File Naming Conversion
- `Component.jsx` → `Component.tsx`
- Component props interfaces: `interface ComponentProps { }`
- Test files: `Component.test.jsx` → `Component.test.tsx`

## Type Patterns

### Component Props
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, ...props }: ButtonProps) {
  // ...
}
```

### API Client
```typescript
interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
}

export async function fetchLocations(): Promise<Location[]> {
  // ...
}
```

### Hooks
```typescript
interface UseThreeSceneOptions {
  densityVariant?: 'normal' | 'dense';
}

export function useThreeScene(container: HTMLElement, options?: UseThreeSceneOptions) {
  // ...
}
```

## CSS to Tailwind Examples

### Before (CSS)
```css
.button-primary {
  border-radius: 0.5rem;
  background: var(--primary);
  padding: 8px 16px;
  font-weight: 500;
}
```

### After (Tailwind)
```tsx
<button className="rounded px-4 py-2 font-medium bg-primary text-white">
  Click me
</button>
```

## Testing Updates
- Update test files to use `.tsx` extension
- Add type checking in tests
- Keep test patterns consistent

## Build & Validation
```bash
# Type check
npm run typecheck

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Progress Tracking
- [x] Infrastructure setup
- [ ] API client types
- [ ] Auth context conversion
- [ ] Hooks conversion
- [ ] Components conversion (3d, hero, features, pages)
- [ ] CSS to Tailwind migration
- [ ] TanStack Query integration
- [ ] Full typecheck passing

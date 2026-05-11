# ADR-006: React + TypeScript for Frontend

## Status
**ACCEPTED**

## Context

Need a frontend UI for satellite visualization, location management, alerts. Must support:
- Real-time 3D globe rendering
- Authentication flows
- Responsive design (desktop + mobile)
- Fast build times for iteration

Options:
1. **React + TypeScript**: Most popular, large ecosystem, TypeScript support
2. **Vue**: Lighter, good developer experience
3. **Svelte**: Modern, smallest bundle size
4. **Angular**: Full framework, steeper learning curve

## Decision

**Use React 19 with TypeScript for the frontend.**

## Rationale

1. **Market Dominance**
   - 40%+ of jobs require React
   - Largest ecosystem: 3rd-party libraries
   - Best for FAANG/Big Tech hiring
   - Demonstrates market-relevant skills

2. **TypeScript Adoption**
   ```typescript
   interface Location {
     id: number;
     name: string;
     latitude: number;  // -90 to 90
     longitude: number; // -180 to 180
   }

   // Component is type-safe
   const LocationCard: React.FC<{location: Location}> = ({location}) => (
     <div>{location.name}</div>
   );
   ```
   - Catches errors before runtime
   - Better IDE support (intellisense)
   - Self-documenting code

3. **3D Visualization**
   - Three.js has excellent React bindings
   - Cesium (web GIS) works well with React
   - Can render satellite orbits in 3D

4. **Rich Ecosystem**
   - React Router: client-side routing
   - Framer Motion: animations
   - Testing Library: testing best practices
   - Vite: fast build tooling
   - Tailwind CSS: utility-first styling

5. **Performance**
   - React 19 with automatic batching
   - Concurrent rendering
   - Component memoization for expensive 3D renders
   - Bundle size can be optimized with code-splitting

## Architecture

```
App.tsx
├── AuthContext (global auth state)
├── Layouts
│   ├── AuthLayout (login/register)
│   └── SpaceLayout (dashboard)
└── Features
    ├── auth/ (login, register)
    ├── locations/ (CRUD)
    ├── passes/ (predictions)
    └── alerts/ (notifications)
```

## Tooling Stack

| Tool | Purpose |
|------|---------|
| **Vite** | Lightning-fast build (30ms rebuild) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first styling |
| **Vitest** | Fast unit testing |
| **Playwright** | E2E testing |
| **ESLint** | Code quality |
| **Prettier** | Code formatting |

## Migrating to TypeScript

All `.jsx` files converted to `.tsx`:
- 35+ component files
- Strict mode enabled (eventually)
- No `any` types (long-term goal)

## Testing Strategy

- **Unit tests**: Component logic, hooks
- **Integration tests**: Feature workflows
- **E2E tests**: User journeys (Playwright)
- **Visual regression**: Screenshots on changes

## Performance Optimization

- Code splitting: Route-based bundles
- Lazy loading: Components loaded on-demand
- Asset optimization: Images, fonts
- CDN caching: Static assets

## Alternatives Considered

### Vue
**Pros:** Lighter, single-file components
**Cons:** Smaller ecosystem, less market demand
**Why not:** React is industry standard

### Svelte
**Pros:** Smallest bundle, best DX
**Cons:** Smaller ecosystem, emerging (risky for production)
**Why not:** Need mature, proven ecosystem

## Benefits for Portfolio

- React is de facto frontend standard
- TypeScript demonstrates modern practices
- Full-stack JavaScript proficiency
- Attractive to FAANG companies
- Responsive design shows mobile-first thinking

## Related Decisions

- ADR-001: FastAPI backend (REST API for React to consume)
- ADR-004: Docker Compose (includes frontend service)

## Future Improvements

- [ ] Performance monitoring (Web Vitals)
- [ ] Error boundary with Sentry integration
- [ ] Storybook for component library
- [ ] Visual regression testing
- [ ] Accessibility audit (WCAG 2.1)

---

**Decision Made:** May 2026
**Last Updated:** May 11, 2026

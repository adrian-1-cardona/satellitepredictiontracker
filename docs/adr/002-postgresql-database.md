# ADR-002: PostgreSQL for Relational Data

## Status
**ACCEPTED**

## Context

Needed to choose a database for user data (locations, alerts, satellites, predictions).

Options:
1. **PostgreSQL**: Mature RDBMS, ACID, strong type system
2. **MongoDB**: Document store, flexible schema, eventual consistency
3. **Firebase/Cloud Firestore**: Serverless, managed, vendor lock-in

## Decision

**Use PostgreSQL** as the primary production database.

## Rationale

1. **Relational Data Model Fits Well**
   - Users have many Locations
   - Locations have many Passes
   - Alerts reference Locations
   - Foreign key relationships are natural
   - Join queries are common (user → locations → passes)

2. **ACID Guarantees**
   - Critical for financial/scientific data accuracy
   - Satellite predictions must be consistent
   - User alerts must not be lost
   - Transaction support ensures data integrity

3. **Mature & Battle-tested**
   - Used by NASA, ESA, and space agencies
   - 30+ years of production hardening
   - Excellent performance at our scale
   - Strong ecosystem

4. **Type Safety**
   - Strong typing enforces data correctness
   - Constraints prevent invalid states (NOT NULL, CHECK, UNIQUE, FK)
   - Comparison: MongoDB allows `{ lat: "not-a-number" }`

5. **Full-text Search** (bonus)
   - Can search satellites by name via PostgreSQL FTS
   - Would need separate search service with MongoDB

## Consequences

### Positive ✅
- Strong consistency guarantees
- Efficient JOIN queries for complex relationships
- Rich data types (numeric precision for coordinates)
- Mature, stable, performant
- Great admin tools (pgAdmin)

### Negative ⚠️
- Vertical scaling limitations (but horizontal scaling possible with replicas)
- Schema migrations required (less flexible than MongoDB)
- Slightly higher latency vs NoSQL (but negligible at our scale)

## Migration Strategy

If scalability becomes issue:
1. Read replicas for reporting queries
2. Database sharding by user_id
3. Keep hot data in Redis cache
4. Move archival data to separate cold storage

## References

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- SQLAlchemy ORM: https://www.sqlalchemy.org/
- Alembic Migrations: https://alembic.sqlalchemy.org/

## Related Decisions

- ADR-001: FastAPI (uses SQLAlchemy ORM with PostgreSQL)
- ADR-004: Docker Compose (includes PostgreSQL service)

---

**Decision Made:** May 2026
**Last Updated:** May 11, 2026

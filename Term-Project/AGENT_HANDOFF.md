# RMUTL Shuttle Agent Handoff

## Objective

Transform the existing Campus Service full-stack project into an
RMUTL Shuttle Booking System.

Application source code is located in:

- `./source/api`
- `./source/frontend`

Both agents must read this file before making changes and update it
after completing each phase.

## Agent Roles

### Gemini CLI: Primary Implementation Agent

Responsible for:

- Repository-wide analysis
- Database schema and seed data
- Backend API
- Frontend and API integration
- Booking and cancellation
- Waitlist FIFO logic
- Integration and concurrency tests
- Running tests and builds

### Cline with Qwen 27B: Review and Fix Agent

Responsible for:

- Reviewing the latest Git diff or commit
- Finding broken imports and regressions
- Checking frontend/API contract consistency
- Checking authentication and validation
- Checking booking race conditions
- Checking FIFO waitlist behavior
- Making only necessary fixes
- Running relevant tests after fixes

Agents must not edit the repository at the same time.

## Existing Project

The current Campus Service project already includes:

- React frontend
- Node.js API
- SQLite database
- Authentication
- Middleware
- Controllers and services
- Validation
- Unit and integration tests

The existing Request domain should be reused where practical, but the
final domain must use Shuttle-specific concepts and naming.

## Final Requirements

### Authentication

- Login using institutional email ending with `@rmutl.ac.th`
- Return and use a JWT token
- Validate required fields
- Show clear errors for invalid domain and invalid credentials
- Protect authenticated endpoints

### Campus and Route Data

Supported campuses:

- Doi Saket
- Jed Yod
- Chiang Mai

Users must be able to select:

- Origin
- Destination
- Travel date

Origin and destination must not be the same.

### Schedules

Each schedule must contain:

- Route
- Travel date
- Departure time
- Capacity
- Confirmed booking count
- Available seats
- Status

Requirements:

- Obtain schedule information from the API and database
- Calculate or return available seats correctly
- Mark past schedules as expired
- Expired schedules cannot be booked
- Support filtering by origin, destination, and date

### Booking

- Authenticated users can book a schedule
- One user can book each schedule only once
- Prevent duplicate bookings
- Prevent booking an expired schedule
- Prevent overbooking
- Users can view their bookings
- Users can cancel confirmed bookings
- Booking changes must be atomic

### Waitlist

- If no seats remain, add the user to the waitlist
- Prevent duplicate waitlist entries
- FIFO order uses `created_at`, then `id` as a tie-breaker
- When a confirmed booking is cancelled, promote the first waiting user
- Cancellation and promotion must occur within one atomic transaction

### Frontend

Required pages and flows:

- Login
- Dashboard
- Schedule search
- Schedule list
- Schedule detail
- My bookings
- Booking and cancellation actions

Required states:

- Loading
- Empty
- Error
- Success
- Expired
- Full or waitlisted

The interface must work on desktop and mobile layouts.

### Testing

Required verification:

- Authentication success
- Invalid institutional email domain
- Missing required fields
- Route and schedule API
- Filtering schedules
- Expired schedule behavior
- Duplicate booking prevention
- Overbooking prevention
- Booking cancellation
- FIFO waitlist promotion
- Concurrent booking requests
- Frontend production build

Agents must not claim that tests pass unless the commands were actually
executed successfully.

## Implementation Order

1. Analyze the existing repository
2. Preserve the working Campus Service baseline
3. Define database schema and API contract
4. Implement route and schedule database tables
5. Add seed data
6. Implement route and schedule APIs
7. Integrate authentication
8. Transform the frontend into the Shuttle UI
9. Connect the frontend to real API data
10. Implement booking and cancellation
11. Implement waitlist and FIFO promotion
12. Add concurrency and integration tests
13. Run all tests and production builds
14. Prepare screenshots and deployment documentation

## Current Status

### Completed

- [x] Existing Campus Service repository available
- [x] Frontend foundation available
- [x] Backend foundation available
- [x] SQLite database foundation available
- [x] Authentication foundation available
- [x] Existing test structure available

### In Progress

- [ ] Repository analysis and migration plan

### Pending

- [ ] Shuttle database schema
- [ ] Seed routes and schedules
- [ ] Routes API
- [ ] Schedules API
- [ ] Shuttle frontend
- [ ] Frontend/API integration
- [ ] Booking
- [ ] Cancellation
- [ ] Waitlist
- [ ] FIFO promotion
- [ ] Concurrency tests
- [ ] Final test and build verification
- [ ] Deployment and handover evidence

## Current Phase

Repository analysis only.

The first agent must inspect the entire repository and update this
document before changing implementation files.

## Decisions

- Keep the existing React, Node.js, and SQLite stack
- Reuse the existing authentication implementation where possible
- Reuse existing components and service patterns where practical
- Do not retain Request terminology in the final user-facing system
- Do not replace working architecture without a documented reason
- Do not use mock data in the final primary user flow
- Commit after each successful implementation phase

## Safety Rules for Agents

- Do not delete existing tests to make the test suite pass
- Do not overwrite environment files or secrets
- Do not commit API keys, tokens, or passwords
- Do not modify unrelated files
- Do not perform large rewrites without documenting the reason
- Do not report completion without running tests
- Do not allow both agents to edit files simultaneously
- Stop the current phase if the baseline project no longer runs

## Test Results

Not executed for the Shuttle implementation yet.

| Check | Status |
|---|---|
| Backend tests | NOT RUN |
| Frontend tests | NOT RUN |
| Frontend build | NOT RUN |
| API integration tests | NOT RUN |
| Concurrency tests | NOT RUN |

## Changed Files

No Shuttle implementation files changed yet.

## Known Issues

- Exact current database schema still needs inspection
- Existing authentication behavior needs verification
- Existing Request model must be mapped to the Shuttle domain
- Booking and waitlist logic do not appear to be implemented yet
- Deployment configuration must be checked before final delivery

## Instructions for the Next Agent

1. Read this entire file
2. Inspect both `./source/api` and `./source/frontend`
3. Inspect all package scripts and existing tests
4. Do not modify implementation files yet
5. Update this document with:
   - Current architecture
   - Reusable files
   - Files to modify
   - Files to create
   - Proposed database schema
   - Proposed API contract
   - Implementation risks
6. Report the analysis before starting implementation
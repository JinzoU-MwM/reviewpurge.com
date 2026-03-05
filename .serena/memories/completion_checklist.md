When finishing a coding task in this repository:
1. Run `pnpm lint`.
2. Run `pnpm build` for type/build verification.
3. If schema changed, run `pnpm db:generate` (and optionally `pnpm db:push` for local sync).
4. Confirm route-level behavior manually for changed pages/endpoints.
5. Update README or env example when setup requirements change.
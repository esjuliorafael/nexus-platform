# Reusable Prompts

## Strategy-to-Execution Handoff
> **Prompt:** Based on the diagnosis in `docs/ai/STRATEGY.md`, please execute the following steps in Window 2: [Insert Steps]. Verify the fix by running [Build/Test Command] and report the output.

## Safe Code Edit Request
> **Prompt:** Surgically update `[File Path]` to [Change Description]. Ensure you follow the project conventions defined in `GEMINI.md`. Do not perform unrelated refactoring.

## Build Verification
> **Prompt:** Run `pnpm -F @nexus/api build` to verify the resolution of the TypeScript errors. If failures persist, provide the full error trace for further diagnosis in Window 1.

## Environment Sync
> **Prompt:** Run `pnpm db:generate` followed by `pnpm -F @nexus/db exec prisma migrate dev` to ensure the local database and Prisma clients are in sync with the current schemas.

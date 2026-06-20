# Task Approval Continuation

## Problem

A task could stop after the user approved the generated plan. The state became running, but the UI did not immediately continue the execution loop.

The same pattern could also affect approvals for pending edits and pending permissions.

## Fix

The UI now resumes the task loop after these approvals:

- task plan approval
- pending edit approval
- pending permission approval

## Expected behavior

1. The user starts a task.
2. Aura Work creates a plan.
3. The user approves the plan.
4. Aura Work continues execution without another user message.
5. If another approval is needed later, the task pauses only for that new approval.
6. After that approval, execution resumes again.

## Manual test

- Create a task that writes a small file.
- Approve the generated plan.
- Verify that the task continues and reaches the pending edit approval.
- Approve the edit.
- Verify that the task continues to completion.

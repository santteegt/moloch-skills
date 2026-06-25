# DAO Community Memory

This folder is the DAO's shared memory root. Pin this directory to IPFS and publish the CID in DAO metadata as `communityMemoryURI`.

Agents and members use this memory root for:

- one versioned community-state file containing purpose, goals, rules, roles, and join rules
- proposal drafts and onchain proposal workspaces
- discussions, negotiations, action items, and vote reasons
- public agent mandates and action logs

Chain state remains the source of truth for permissions, votes, proposal lifecycle, and execution.

IPFS is immutable. Create a new version directory and new CID for every state change.

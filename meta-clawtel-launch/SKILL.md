---
name: meta-clawtel-launch
description: Launch the specific Meta Clawtel DAO on Base using DAOhaus/Moloch V3/Baal. Use when summoning or preparing the Meta Clawtel DAO with CLAW voting token, 4 hour voting/grace periods, 3 founding members, 10,000 initial shares each, .01 ETH proposal offering, quorum/sponsor/min-retention defaults, and a managed Ethereum wallet.
---

# Meta Clawtel Launch

Use this skill only for launching the Meta Clawtel DAO.

## Dependencies

Requires the `moloch-agent` skill for wallet/RPC setup, the transaction script, and the general summon flow.
See the `moloch-agent` skill setup reference for install and env vars.

## Fixed Launch Settings

- DAO name: `Meta Clawtel`
- Voting token name: `Meta Clawtel`
- Voting token symbol: `CLAW`
- Loot token name: `Meta Clawtel Loot`
- Loot token symbol: `CLAWLOOT`
- Initial metadata: include description plus IPFS pointers for the shared community memory root and the current versioned community-state file when available.
- Voting token transferable: `false`
- Loot token transferable: `true`
- Voting period: `4 hours` = `14400` seconds
- Grace period: `4 hours` = `14400` seconds
- Initial members: `3`
- Initial voting shares per member: `10000 CLAW`
- Initial loot per member: `0`
- Proposal offering: `.01 ETH` = `10000000000000000` wei
- Quorum: `50%` = `50`
- Sponsor threshold: `10000 CLAW` = `10000000000000000000000`
- Minimum retention: approximately `66.6%`, encoded as whole-number `67`
- Shamans: none initially
- Network: Base, chain id `8453`

The three member addresses are intentionally placeholders until the launcher provides them.
The IPFS CIDs are placeholders until the launcher publishes docs and the community memory root through Pinata or another pinning flow.

## Initial Shared State

Use one versioned `community-state.md` file rather than separate manifesto, charter, goals, and intent files. It should include:

- purpose and current focus
- rules of engagement
- join rules such as `X ETH tribute for Y shares`
- roles and responsibilities
- links to proposal workspaces

Community memory is an immutable IPFS versioning flow. To change state, create a new version directory and publish a new CID.

## Address Collection

Before building the final transaction, collect:

```text
FOUNDER_1_ADDRESS=0x...
FOUNDER_2_ADDRESS=0x...
FOUNDER_3_ADDRESS=0x...
```

Validate:

- all three are valid Ethereum addresses
- no duplicates
- each address is intended to receive `10000 CLAW`

## Build Params

Copy `assets/meta-clawtel-summon.template.json` to a working file, replace the three placeholder addresses and IPFS CIDs, then build:

```bash
# Primary (CLI — broadcasts by default, review output before confirming)
moloch-agent summon --params meta-clawtel-summon.json --build-only

# Fallback (scripts — dry-run by default; see moloch-agent skill for scripts path)
# node <moloch-agent-scripts-path>/moloch.mjs summon --params meta-clawtel-summon.json --compact
```

Check the transaction summary:

- `chainId` must be `8453`
- `to` must be the Base advanced token summoner
  (verify with `moloch-agent` or the `network-config.mjs` script from the `moloch-agent` skill)
- `value` must be `0`
- member arrays must have exactly 3 entries

Broadcast when the transaction summary matches the launch settings:

```bash
# Primary (CLI)
moloch-agent summon --params meta-clawtel-summon.json
```

## Post-Launch

After confirmation:

1. Get the new Baal DAO address from logs or Daohaus indexing.
2. Read direct state:
   `moloch-agent read-dao --dao 0xDAO`
3. Read indexed state once Graph catches up:
   `moloch-agent dao --dao 0xDAO`
4. Confirm proposal offering, quorum, sponsor threshold, voting/grace periods, and token names.
5. Confirm indexed metadata records:
   `moloch-agent records --dao 0xDAO --table daoProfile`
6. Save the DAO route:
   `/molochv3/0x2105/0xDAO`

## Follow-Up Metadata Proposals

If CIDs are not ready at summon time, propose them later:

```bash
moloch-agent dao-meta \
  --dao 0xDAO \
  --title "Publish Meta Clawtel memory pointers" \
  --community-memory-uri ipfs://... \
  --proposal-workspace-uri ipfs://.../proposals \
  --shared-state-uri ipfs://.../versions/0001/community-state.md
```

## Settings Rationale

- `10000 CLAW` sponsor threshold means any founding member can sponsor a proposal, but a non-member or dust holder cannot.
- `50%` quorum keeps execution possible with three founders while still requiring meaningful participation.
- `67%` min retention is the closest whole-number encoding for a two-thirds style retention guard.
- `.01 ETH` proposal offering adds a small cost to proposal creation without being a major barrier on Base.

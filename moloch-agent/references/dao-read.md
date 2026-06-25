# Moloch DAO Read

Use this reference before any write action.

## Basic Reads

For environment variables and setup, see `setup.md` (same references folder).
The subgraph ID and gateway URL are in `config/networks.json`.

```bash
# Primary (moloch-agent CLI)
moloch-agent read-dao --dao 0xDAO
moloch-agent dao --dao 0xDAO
moloch-agent proposal --dao 0xDAO --proposal 1
moloch-agent proposals --dao 0xDAO --first 20
moloch-agent members --dao 0xDAO
moloch-agent records --dao 0xDAO --table daoProfile
moloch-agent records --dao 0xDAO --table signal
moloch-agent records --dao 0xDAO --table communityMemory
moloch-agent proposal-lifecycle --dao 0xDAO --proposal 1
moloch-agent process-queue --dao 0xDAO

# Fallback (shared scripts — use for commands not yet in the CLI)
node scripts/moloch.mjs read-proposal --dao 0xDAO --proposal 1
node scripts/moloch.mjs graph-dao-history --dao 0xDAO --first 100
node scripts/moloch.mjs graph-member --dao 0xDAO --member 0xMEMBER
node scripts/moloch.mjs process-queue --dao 0xDAO --first 100
```

## What To Check

Prefer Graph batch reads for history and context. Avoid looping over many direct RPC calls unless the user needs fresh contract truth for each item.

DAO-level:

- `proposalCount`
- `proposalOffering`
- `sponsorThreshold`
- `latestSponsoredProposalId`

Proposal-level:

- raw `proposals(id)` tuple
- named `getProposalStatus(id)` flags: `cancelled`, `processed`, `passed`, `actionFailed`
- derived lifecycle status from `proposal-lifecycle`
- whether the relevant action is currently valid
- exact `proposalData` for processing, preferably from the indexed proposal payload
- indexed `details`, `title`, `description`, `proposalType`, and vote history from Graph
- member `shares`, `loot`, delegation, and vote history from Graph
- DAO database records such as `daoProfile`, `signal`, `communityMemory`, `communityStateVersions`, charter/join-rule pointers, and proposal workspace announcements

## Daohaus Frontend Context

DAOhaus admin uses routes like:

```text
/molochv3/0x2105/0xDAO
/molochv3/0x2105/0xDAO/proposals
/molochv3/0x2105/0xDAO/proposal/1
```

The frontend source is `https://github.com/HausDAO/daohaus-admin`. In that app, Baal is the Moloch V3 DAO contract, and proposal write methods are on the Baal address.

## Preflight Rule

Read before writing, write once, then read again after confirmation. If indexed state and direct contract state disagree, prefer direct contract state for permissions/timing and indexed state for metadata/action decoding.

#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  http,
  parseAbiParameters,
  parseEther,
  parseUnits,
  getAddress,
  toFunctionSelector,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { generatePrivateKey } from 'viem/accounts';
import { base } from 'viem/chains';
import { request, gql } from 'graphql-request';

const ZERO = '0x0000000000000000000000000000000000000000';
const BAAL_ETH_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _NETWORKS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'networks.json'), 'utf8'));
const BASE_CHAIN_ID = Number(process.env.CHAIN_ID || 8453);
const _NET = _NETWORKS[String(BASE_CHAIN_ID)];
if (!_NET) throw new Error(`Unknown chain ID: ${BASE_CHAIN_ID}. Add it to moloch-shared/config/networks.json.`);

const SUMMONER = _NET.contracts.V3_FACTORY_ADV_TOKEN;
const POSTER = _NET.contracts.POSTER;
const TRIBUTE_MINION = _NET.contracts.TRIBUTE_MINION;
const BASE_WETH = _NET.contracts.BASE_WETH;
const GNOSIS_MULTISEND = _NET.contracts.GNOSIS_MULTISEND;
const DAOHAUS_BASE_SUBGRAPH_ID = _NET.subgraphId;
const THE_GRAPH_GATEWAY = 'https://gateway.thegraph.com/api';
const POSTER_TAG_DAO_DB = _NET.tags.POSTER_DAO_DATABASE;
const POSTER_TAG_SUMMONER = _NET.tags.POSTER_DAO_PROFILE_SUMMONER;
const POSTER_TAG_DAO_PROFILE_UPDATE = _NET.tags.POSTER_DAO_PROFILE_UPDATE;
const POSTER_TAG_MEMBER_DB = _NET.tags.POSTER_MEMBER_DATABASE;
const POSTER_TAG_SHARES_DB = _NET.tags.POSTER_SHARES_DATABASE;
const POSTER_POST_SELECTOR = toFunctionSelector('post(string,string)');
const ACTION_GAS_LIMIT_ADDITION = 150000n;
const PROCESS_PROPOSAL_GAS_LIMIT_ADDITION = 400000n;
const DEFAULT_PROCESS_GAS_LIMIT = 800000n;
const BAAL_TOKEN_DECIMALS = 18;

const BAAL_ABI = [
  { type: 'function', name: 'submitProposal', stateMutability: 'payable', inputs: [{ name: 'proposalData', type: 'bytes' }, { name: 'expiration', type: 'uint32' }, { name: 'baalGas', type: 'uint256' }, { name: 'details', type: 'string' }], outputs: [] },
  { type: 'function', name: 'sponsorProposal', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint32' }], outputs: [] },
  { type: 'function', name: 'submitVote', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint32' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'processProposal', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint32' }, { name: 'proposalData', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'cancelProposal', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint32' }], outputs: [] },
  { type: 'function', name: 'setGovernanceConfig', stateMutability: 'nonpayable', inputs: [{ name: '_governanceConfig', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'setAdminConfig', stateMutability: 'nonpayable', inputs: [{ name: 'pauseShares', type: 'bool' }, { name: 'pauseLoot', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'ragequit', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'sharesToBurn', type: 'uint256' }, { name: 'lootToBurn', type: 'uint256' }, { name: 'tokens', type: 'address[]' }], outputs: [] },
  { type: 'function', name: 'mintShares', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address[]' }, { name: 'amount', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'setShamans', stateMutability: 'nonpayable', inputs: [{ name: '_shamans', type: 'address[]' }, { name: '_permissions', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'executeAsBaal', stateMutability: 'nonpayable', inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }, { name: '_data', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'proposalCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'proposalOffering', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sponsorThreshold', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'latestSponsoredProposalId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'getProposalStatus', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint32' }], outputs: [{ type: 'bool[4]' }] },
  { type: 'function', name: 'state', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint32' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'avatar', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'target', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'memberVoted', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'uint32' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'proposals', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ name: 'id', type: 'uint32' }, { name: 'prevProposalId', type: 'uint32' }, { name: 'votingStarts', type: 'uint32' }, { name: 'votingEnds', type: 'uint32' }, { name: 'graceEnds', type: 'uint32' }, { name: 'expiration', type: 'uint32' }, { name: 'baalGas', type: 'uint256' }, { name: 'yesVotes', type: 'uint256' }, { name: 'noVotes', type: 'uint256' }, { name: 'maxTotalSharesAndLootAtVote', type: 'uint256' }, { name: 'maxTotalSharesAtSponsor', type: 'uint256' }, { name: 'sponsor', type: 'address' }, { name: 'proposalDataHash', type: 'bytes32' }] },
];

const POSTER_ABI = [
  { type: 'function', name: 'post', stateMutability: 'nonpayable', inputs: [{ name: 'content', type: 'string' }, { name: 'tag', type: 'string' }], outputs: [] },
];

const SUMMONER_ABI = [
  { type: 'function', name: 'summonBaalFromReferrer', stateMutability: 'nonpayable', inputs: [{ name: '_safeAddr', type: 'address' }, { name: '_forwarderAddr', type: 'address' }, { name: '_saltNonce', type: 'uint256' }, { name: 'initializationMintParams', type: 'bytes' }, { name: 'initializationTokenParams', type: 'bytes' }, { name: 'postInitializationActions', type: 'bytes[]' }], outputs: [] },
];

const TRIBUTE_MINION_ABI = [
  { type: 'function', name: 'submitTributeProposal', stateMutability: 'payable', inputs: [{ name: 'baal', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'shares', type: 'uint256' }, { name: 'loot', type: 'uint256' }, { name: 'expiration', type: 'uint32' }, { name: 'baalgas', type: 'uint256' }, { name: 'details', type: 'string' }], outputs: [] },
];

const MULTISEND_ABI = [
  { type: 'function', name: 'multiSend', stateMutability: 'payable', inputs: [{ name: 'transactions', type: 'bytes' }], outputs: [] },
];

const GNOSIS_MODULE_ABI = [
  { type: 'function', name: 'execTransactionFromModule', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'operation', type: 'uint8' }], outputs: [{ type: 'bool' }] },
];

const ERC20_APPROVE_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
];

const WETH_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function has(name) {
  return process.argv.includes(`--${name}`);
}

function boolArg(name, fallback = false) {
  const value = arg(name);
  if (value == null) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function decimalArg(name, fallback) {
  const value = arg(name, fallback);
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error(`${name} must be a positive decimal number.`);
  const [whole, frac = ''] = normalized.split('.');
  const scale = 1000n;
  const scaled = BigInt(whole) * scale + BigInt((frac + '000').slice(0, 3));
  if (scaled < 0n) throw new Error(`${name} must be positive.`);
  return scaled;
}

function jsonFile(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function stringify(value) {
  return JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
}

function tx(to, data, value = 0n, extra = {}) {
  return { chainId: Number(process.env.CHAIN_ID || BASE_CHAIN_ID), to, value: value.toString(), data, ...extra };
}

function withSummary(unsigned, summary) {
  return { summary: { chainId: unsigned.chainId, to: unsigned.to, value: unsigned.value, gas: unsigned.gas, baalGas: unsigned.baalGas, estimatedBaalGas: unsigned.estimatedBaalGas, baalGasRawEstimate: unsigned.baalGasRawEstimate, baalGasBuffer: unsigned.baalGasBuffer, baalGasEstimateError: unsigned.baalGasEstimateError, ...summary }, ...unsigned };
}

function compact(value) {
  if (!has('compact')) return value;
  const clone = JSON.parse(stringify(value));
  delete clone.data;
  delete clone.proposalData;
  if (clone.unsigned) {
    delete clone.unsigned.data;
    delete clone.unsigned.proposalData;
    delete clone.unsigned.gas;
  }
  return clone;
}

function normalizeToken(value) {
  if (!value || value.toUpperCase() === 'ETH' || value.toUpperCase() === 'NATIVE') return ZERO;
  if (value.toLowerCase() === BAAL_ETH_TOKEN.toLowerCase()) return BAAL_ETH_TOKEN;
  return value;
}

function listArg(name, fallback = '') {
  const value = arg(name, fallback);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function ragequitTokensArg() {
  const tokens = listArg('tokens').map((token) => /^(ETH|NATIVE)$/i.test(token) ? BAAL_ETH_TOKEN : token);
  const sorted = [...tokens].sort((a, b) => BigInt(a.toLowerCase()) < BigInt(b.toLowerCase()) ? -1 : 1);
  if (tokens.some((token, index) => token.toLowerCase() !== sorted[index].toLowerCase())) {
    throw new Error('Baal ragequit token list must be sorted ascending. Use ETH/NATIVE for the Baal ETH sentinel.');
  }
  return tokens;
}

function parseBaalTokenUnits(name, value) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error(`${name} must be a positive decimal number.`);
  return parseUnits(normalized, BAAL_TOKEN_DECIMALS);
}

function baalTokenArg(name, fallback = '0') {
  const raw = arg(`${name}-raw`);
  if (raw != null) return { value: BigInt(raw), input: raw, mode: 'raw' };
  const input = arg(name, fallback);
  return { value: parseBaalTokenUnits(name, input), input, mode: 'human-18-decimal' };
}

function baalTokenListArg(name) {
  const rawValues = listArg(`${name}-raw`);
  if (rawValues.length) return { values: rawValues.map((value) => BigInt(value)), inputs: rawValues, mode: 'raw' };
  const inputs = listArg(name);
  return { values: inputs.map((value) => parseBaalTokenUnits(name, value)), inputs, mode: 'human-18-decimal' };
}

function encodeValues(types, values) {
  return encodeAbiParameters(parseAbiParameters(types.join(',')), values);
}

function rawPercent(name, value) {
  const normalized = String(value).trim().replace(/%$/, '');
  if (normalized.includes('.')) {
    throw new Error(`${name} must be a whole-number percent from 0 to 100. Baal does not accept decimal or 18-decimal percentages.`);
  }
  const percent = BigInt(normalized);
  if (percent < 0n || percent > 100n) {
    throw new Error(`${name} must be a raw percent from 0 to 100, not 18-decimal fixed point.`);
  }
  return percent;
}

function encodeMultiSend(txs) {
  const packed = txs.map((t) => {
    const op = Number(t.operation ?? 0).toString(16).padStart(2, '0');
    const to = t.to.toLowerCase().replace(/^0x/, '').padStart(40, '0');
    const value = BigInt(t.value ?? 0).toString(16).padStart(64, '0');
    const data = (t.data ?? '0x').replace(/^0x/, '');
    const len = (data.length / 2).toString(16).padStart(64, '0');
    return `${op}${to}${value}${len}${data}`;
  }).join('');
  return `0x${packed}`;
}

function decodeMultiSendBytes(bytes) {
  const clean = bytes.replace(/^0x/, '');
  const txs = [];
  let i = 0;
  while (i < clean.length) {
    const operation = Number.parseInt(clean.slice(i, i + 2), 16);
    i += 2;
    const to = `0x${clean.slice(i, i + 40)}`;
    i += 40;
    const value = BigInt(`0x${clean.slice(i, i + 64) || '0'}`);
    i += 64;
    const dataLength = Number(BigInt(`0x${clean.slice(i, i + 64) || '0'}`));
    i += 64;
    const data = `0x${clean.slice(i, i + dataLength * 2)}`;
    i += dataLength * 2;
    txs.push({ operation, to, value: value.toString(), data });
  }
  return txs;
}

function decodeAction(action) {
  const selector = (action.data || '0x').slice(0, 10);
  if ((action.to || '').toLowerCase() === POSTER.toLowerCase()) {
    try {
      const decoded = decodeFunctionData({ abi: POSTER_ABI, data: action.data });
      const [content, tag] = decoded.args;
      let parsedContent = content;
      try { parsedContent = JSON.parse(content); } catch {}
      return { ...action, decoded: { contract: 'Poster', functionName: decoded.functionName, selector, expectedSelector: POSTER_POST_SELECTOR, tag, content: parsedContent } };
    } catch (error) {
      return { ...action, decoded: { contract: 'Poster', selector, expectedSelector: POSTER_POST_SELECTOR, error: `Could not decode as Poster post(string,string): ${error.shortMessage || error.message}` } };
    }
  }
  try {
    const decoded = decodeFunctionData({ abi: BAAL_ABI, data: action.data });
    return { ...action, decoded: { contract: 'Baal', functionName: decoded.functionName, selector, args: decoded.args } };
  } catch {}
  return { ...action, decoded: { selector } };
}

function encodeMultiAction(actions) {
  return encodeFunctionData({ abi: MULTISEND_ABI, functionName: 'multiSend', args: [encodeMultiSend(actions)] });
}

function details({ title, description, link, proposalType }) {
  return JSON.stringify({
    title,
    description,
    contentURI: link || '',
    contentURIType: link ? 'url' : '',
    proposalType,
  });
}

function compactLinks(p) {
  const labels = [
    ['discord', 'Discord'],
    ['github', 'Github'],
    ['blog', 'Blog'],
    ['telegram', 'Telegram'],
    ['twitter', 'Twitter'],
    ['web', 'Web'],
    ['charterURI', 'Charter'],
    ['joinRulesURI', 'Join Rules'],
    ['goalsURI', 'Goals'],
    ['manifestoURI', 'Manifesto'],
    ['docsURI', 'Docs'],
    ['communityMemoryURI', 'Community Memory'],
    ['proposalWorkspaceURI', 'Proposal Workspace'],
    ['sharedStateURI', 'Shared State'],
  ];
  const links = labels
    .filter(([key]) => p[key])
    .map(([key, label]) => ({ url: p[key], label }));
  for (const i of [1, 2, 3]) {
    if (p[`custom${i}`]) links.push({ url: p[`custom${i}`], label: p[`custom${i}Label`] || `Custom ${i}` });
  }
  return links;
}

function daoRecordContent(dao, table, content, queryType = 'latest') {
  return {
    daoId: dao,
    table,
    queryType,
    ...content,
  };
}

function memoryPostContent(dao, table, content) {
  return daoRecordContent(dao, table, Object.fromEntries(Object.entries({
    schema: content.schema || 'community-memory/v1',
    type: content.type || 'proposal-commons-post',
    title: content.title,
    body: content.body,
    threadId: content.threadId || content.topicId,
    topicId: content.topicId,
    parentId: content.parentId,
    proposalId: content.proposalId,
    draftId: content.draftId,
    contentURI: content.contentURI || content.link,
    contentHash: content.contentHash,
    workspaceURI: content.workspaceURI,
    stateURI: content.stateURI,
    agent: content.agent,
    version: content.version,
    createdAt: content.createdAt || new Date().toISOString(),
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')), content.queryType || 'list');
}

function daoProfileContent(dao, p) {
  return daoRecordContent(dao, 'daoProfile', Object.fromEntries(Object.entries({
    name: p.name,
    description: p.description,
    longDescription: p.longDescription || p.long_description,
    avatarImg: p.avatarImg || p.icon,
    tags: p.tags,
    links: p.links || compactLinks(p),
    charterURI: p.charterURI,
    joinRulesURI: p.joinRulesURI,
    goalsURI: p.goalsURI,
    manifestoURI: p.manifestoURI,
    communityMemoryURI: p.communityMemoryURI,
    proposalWorkspaceURI: p.proposalWorkspaceURI,
    sharedStateURI: p.sharedStateURI,
  }).filter(([, value]) => value !== undefined && value !== null && value !== '')));
}

function looksLikeMembershipIntent(text) {
  return /\b(join|member|membership|admission|admit|shares?|loot|tribute|steward|delegate shares?)\b/i.test(text || '');
}

function ensureSignalIntent({ title, description }) {
  if (has('force-signal')) return;
  if (looksLikeMembershipIntent(`${title}\n${description}`)) {
    throw new Error('This looks like a membership/shares/loot request. Use `tribute` / `join-dao` for executable tokens-for-shares proposals, or add --force-signal if you intentionally want text-only signaling.');
  }
}

function graphUrl() {
  const key = process.env.GRAPH_API_KEY || arg('graph-key');
  const url = process.env.GRAPH_URL || arg('graph-url');
  if (url) return url;
  if (!key) throw new Error('Set GRAPH_API_KEY, pass --graph-key, or pass --graph-url');
  return `${THE_GRAPH_GATEWAY}/${key}/subgraphs/id/${DAOHAUS_BASE_SUBGRAPH_ID}`;
}

const DAO_FIELDS = `
  id name createdAt createdBy txHash safeAddress
  lootPaused sharesPaused gracePeriod votingPeriod proposalOffering
  quorumPercent sponsorThreshold minRetentionPercent
  shareTokenName shareTokenSymbol sharesAddress lootTokenName lootTokenSymbol lootAddress
  totalShares totalLoot latestSponsoredProposalId proposalCount activeMemberCount
  shamen: shaman(orderBy: createdAt, orderDirection: desc) {
    id shamanAddress permissions
  }
  vaults(where: { active: true }) {
    id name safeAddress ragequittable active
  }
`;

const PROPOSAL_FIELDS = `
  id createdAt createdBy proposedBy txHash proposalId prevProposalId
  proposalDataHash proposalData actionGasEstimate details title description
  proposalType contentURI contentURIType sponsorTxHash sponsored selfSponsor sponsor sponsorTxAt
  votingStarts votingEnds graceEnds expiration cancelled cancelledTxHash
  yesBalance noBalance yesVotes noVotes processed passed actionFailed processTxHash
  proposalOffering
  sponsorMembership { memberAddress shares delegateShares }
  dao { id totalShares quorumPercent minRetentionPercent }
  votes { id txHash createdAt approved balance member { memberAddress } }
`;

const MEMBER_FIELDS = `
  id
  createdAt
  txHash
  memberAddress
  shares
  loot
  sharesLootDelegateShares
  delegatingTo
  delegateShares
  delegateOfCount
  lastDelegateUpdateTxHash
  votes { txHash createdAt approved balance }
`;

const RECORD_FIELDS = `
  id
  createdAt
  createdBy
  tag
  table
  contentType
  content
  queryType
  dao { id name }
`;

async function graphDao(dao) {
  return request(graphUrl(), gql`query dao($daoid: String!) { dao(id: $daoid) { ${DAO_FIELDS} } }`, { daoid: dao.toLowerCase() });
}

async function treasuryTokens(dao) {
  const result = await graphDao(dao);
  const safeAddress = result?.dao?.safeAddress ? getAddress(result.dao.safeAddress) : undefined;
  if (!safeAddress) throw new Error('Could not resolve DAO Safe address from Graph.');
  const res = await fetch(`https://safe-transaction-base.safe.global/api/v1/safes/${safeAddress}/balances/?trusted=false`);
  if (!res.ok) throw new Error(`Safe balances request failed: ${res.status}`);
  const balances = await res.json();
  const tokens = balances
    .filter((item) => BigInt(String(item.balance || '0')) > 0n)
    .map((item) => ({
      tokenAddress: item.tokenAddress || BAAL_ETH_TOKEN,
      symbol: item.token?.symbol || (item.tokenAddress ? '' : 'ETH'),
      name: item.token?.name || (item.tokenAddress ? '' : 'Ether'),
      decimals: item.token?.decimals,
      balance: item.balance,
    }));
  const ragequitTokens = tokens
    .map((item) => item.tokenAddress)
    .sort((a, b) => BigInt(a.toLowerCase()) < BigInt(b.toLowerCase()) ? -1 : 1);
  return { dao, safeAddress, tokens, ragequitTokens, ragequitTokensCsv: ragequitTokens.join(','), note: 'Use ragequitTokensCsv as --tokens. Native ETH is represented with Baal ETH sentinel.' };
}

async function graphProposal(dao, proposal) {
  const proposalid = `${dao.toLowerCase()}-proposal-${proposal}`;
  return request(graphUrl(), gql`query proposal($proposalid: String!) { proposal(id: $proposalid) { ${PROPOSAL_FIELDS} } }`, { proposalid });
}

async function graphProposals(dao) {
  return request(graphUrl(), gql`query proposals($daoid: String!, $first: Int!, $skip: Int!) {
    proposals(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc, where: { dao: $daoid }) {
      ${PROPOSAL_FIELDS}
    }
  }`, { daoid: dao.toLowerCase(), first: Number(arg('first', 20)), skip: Number(arg('skip', 0)) });
}

async function graphDaoHistory(dao) {
  return request(graphUrl(), gql`query history($daoid: String!, $first: Int!, $skip: Int!) {
    dao(id: $daoid) { ${DAO_FIELDS} }
    proposals(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc, where: { dao: $daoid }) {
      ${PROPOSAL_FIELDS}
    }
  }`, { daoid: dao.toLowerCase(), first: Number(arg('first', 100)), skip: Number(arg('skip', 0)) });
}

async function graphMembers(dao) {
  return request(graphUrl(), gql`query members($daoid: String!, $first: Int!, $skip: Int!) {
    members(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc, where: { dao: $daoid }) {
      ${MEMBER_FIELDS}
    }
  }`, { daoid: dao.toLowerCase(), first: Number(arg('first', 100)), skip: Number(arg('skip', 0)) });
}

async function graphMember(dao, member) {
  if (!member) throw new Error('Missing --member 0x...');
  return request(graphUrl(), gql`query member($memberid: String!) {
    member(id: $memberid) { ${MEMBER_FIELDS} }
  }`, { memberid: `${dao.toLowerCase()}-member-${member.toLowerCase()}` });
}

async function graphRecords(dao) {
  const table = arg('table', 'daoProfile');
  return request(graphUrl(), gql`query records($daoid: String!, $table: String!, $first: Int!, $skip: Int!) {
    records(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc, where: { dao: $daoid, table: $table }) {
      ${RECORD_FIELDS}
    }
  }`, { daoid: dao.toLowerCase(), table, first: Number(arg('first', 20)), skip: Number(arg('skip', 0)) });
}

async function readDaoDirect(dao) {
  const c = client();
  const [proposalCount, proposalOffering, sponsorThreshold, latestSponsoredProposalId] = await Promise.all([
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'proposalCount' }),
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'proposalOffering' }),
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'sponsorThreshold' }),
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'latestSponsoredProposalId' }),
  ]);
  return { dao, proposalCount, proposalOffering, sponsorThreshold, latestSponsoredProposalId };
}

const STATE_NAMES = ['unborn', 'submitted', 'voting', 'cancelled', 'grace', 'ready', 'processed', 'defeated'];
const PREV_PROCESS_ELIGIBLE = new Set([0, 3, 6, 7]);

function namedProposalStatus(status) {
  const values = Array.from(status || []);
  return {
    cancelled: Boolean(values[0]),
    processed: Boolean(values[1]),
    passed: Boolean(values[2]),
    actionFailed: Boolean(values[3]),
    raw: values.map(Boolean),
  };
}

function namedProposalTuple(tuple) {
  const names = ['id', 'prevProposalId', 'votingStarts', 'votingEnds', 'graceEnds', 'expiration', 'baalGas', 'yesVotes', 'noVotes', 'maxTotalSharesAndLootAtVote', 'maxTotalSharesAtSponsor', 'sponsor', 'proposalDataHash'];
  return Object.fromEntries(names.map((name, index) => [name, tuple?.[index]?.toString?.() ?? String(tuple?.[index] ?? '')]));
}

function hasQuorum(proposal) {
  const totalShares = BigInt(proposal.dao?.totalShares || '0');
  const quorumPercent = BigInt(proposal.dao?.quorumPercent || '0');
  const yes = BigInt(proposal.yesBalance || proposal.yesVotes || '0');
  if (totalShares === 0n) return false;
  return yes * 100n >= quorumPercent * totalShares;
}

function deriveProposalLifecycle(proposal, now = Math.floor(Date.now() / 1000), chain = {}) {
  const sponsored = Boolean(proposal.sponsored);
  const chainStatus = chain.namedStatus || {};
  const hasChainStatus = Array.isArray(chainStatus.raw);
  const cancelled = hasChainStatus ? Boolean(chainStatus.cancelled) : Boolean(proposal.cancelled);
  const processed = hasChainStatus ? Boolean(chainStatus.processed) : Boolean(proposal.processed);
  const passed = hasChainStatus ? Boolean(chainStatus.passed) : Boolean(proposal.passed);
  const actionFailed = hasChainStatus ? Boolean(chainStatus.actionFailed) : Boolean(proposal.actionFailed);
  const votingStarts = Number(proposal.votingStarts || 0);
  const votingEnds = Number(proposal.votingEnds || 0);
  const graceEnds = Number(proposal.graceEnds || 0);
  const yes = BigInt(proposal.yesBalance || proposal.yesVotes || '0');
  const no = BigInt(proposal.noBalance || proposal.noVotes || '0');
  const quorum = hasQuorum(proposal);
  const afterGrace = sponsored && !cancelled && !processed && now > graceEnds;
  const needsSponsor = !sponsored && !cancelled;
  const inVoting = sponsored && !cancelled && !processed && votingStarts < now && votingEnds > now;
  const inGrace = sponsored && !cancelled && !processed && votingEnds < now && graceEnds > now;
  const graphReady = afterGrace && yes > no && quorum;
  const prevStateEligible = chain.prevState == null ? undefined : PREV_PROCESS_ELIGIBLE.has(Number(chain.prevState));
  const prevProposalId = String(chain.proposal?.prevProposalId || proposal.prevProposalId || '');
  const chainState = chain.state == null ? undefined : Number(chain.state);
  const chainStateName = chainState == null ? undefined : STATE_NAMES[chainState] || `unknown-${chain.state}`;
  const prevStateName = chain.prevState == null ? undefined : STATE_NAMES[Number(chain.prevState)] || `unknown-${chain.prevState}`;
  const stateReady = chainState == null ? undefined : chainState === 5;
  const stateDefeated = chainState == null ? undefined : chainState === 7;
  const failedQuorum = afterGrace && chainState == null && !quorum;
  const failedVote = afterGrace && (stateDefeated == null ? yes <= no : stateDefeated);
  const readyByChainOrGraph = stateReady == null ? graphReady : stateReady;
  const blockedByPreviousProposal = Boolean(readyByChainOrGraph && proposal.proposalData && prevStateEligible === false);
  const processableNow = Boolean(readyByChainOrGraph && proposal.proposalData && !blockedByPreviousProposal);

  let status = 'unknown';
  if (needsSponsor) status = 'unsponsored';
  if (cancelled) status = 'cancelled';
  else if (actionFailed) status = 'actionFailed';
  else if (processed && passed) status = 'processedPassed';
  else if (processed && !passed) status = 'processedFailed';
  else if (inVoting) status = 'voting';
  else if (inGrace) status = 'grace';
  else if (processableNow) status = 'needsProcessing';
  else if (blockedByPreviousProposal) status = 'blockedByPreviousProposal';
  else if (stateDefeated || failedQuorum || failedVote) status = 'failed';

  return {
    proposalId: String(proposal.proposalId ?? ''),
    status,
    needsSponsor,
    needsVote: inVoting,
    inVoting,
    inGrace,
    graphReady,
    chainReady: stateReady,
    processableNow,
    blockedByPreviousProposal,
    failedQuorum,
    failedVote,
    processed,
    passed,
    actionFailed,
    hasProposalData: Boolean(proposal.proposalData),
    chainState: chainStateName,
    prevProposalId,
    prevState: prevStateName,
    prevStateEligible,
  };
}

async function chainProposalContext(dao, proposal) {
  const c = client();
  const id = Number(proposal.proposalId);
  const [rawStatus, state, raw] = await Promise.all([
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'getProposalStatus', args: [id] }),
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'state', args: [id] }),
    c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'proposals', args: [BigInt(id)] }),
  ]);
  const tuple = namedProposalTuple(raw);
  const prevId = Number(tuple.prevProposalId || proposal.prevProposalId || 0);
  const prevState = await c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'state', args: [prevId] });
  return { namedStatus: namedProposalStatus(rawStatus), state, prevState, proposal: tuple };
}

async function lifecycleForProposal(dao, proposalId) {
  const { proposal } = await graphProposal(dao, proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found in Graph`);
  let chain = {};
  if (process.env.RPC_URL || arg('rpc')) {
    try { chain = await chainProposalContext(dao, proposal); } catch (error) { chain = { error: error.shortMessage || error.message }; }
  }
  const lifecycle = deriveProposalLifecycle(proposal, Math.floor(Date.now() / 1000), chain);
  return { proposal: { id: proposal.id, proposalId: proposal.proposalId, title: proposal.title, proposalType: proposal.proposalType }, lifecycle, chain };
}

function processingCandidatesFromProposals(proposals, now = Math.floor(Date.now() / 1000)) {
  return proposals
    .map((proposal) => ({ proposal, lifecycle: deriveProposalLifecycle(proposal) }))
    .filter((item) => (
      item.proposal.proposalId != null &&
      Number(item.proposal.graceEnds || 0) < now &&
      Boolean(item.proposal.proposalData)
    ));
}

function queueItem(item) {
  return {
    proposalId: item.proposal.proposalId,
    title: item.proposal.title,
    proposalType: item.proposal.proposalType,
    prevProposalId: item.proposal.prevProposalId,
    status: item.lifecycle.status,
    hasProposalData: item.lifecycle.hasProposalData,
    chainReady: item.lifecycle.chainReady,
    processableNow: item.lifecycle.processableNow,
    previousProposalProcessed: item.lifecycle.prevStateEligible,
    indexedPassed: Boolean(item.proposal.passed),
    indexedProcessed: Boolean(item.proposal.processed),
    indexedCancelled: Boolean(item.proposal.cancelled),
  };
}

async function processQueueFromProposals(dao, proposals) {
  const candidates = processingCandidatesFromProposals(proposals);
  if (!(process.env.RPC_URL || arg('rpc'))) {
    return candidates
      .sort((a, b) => Number(a.proposal.proposalId) - Number(b.proposal.proposalId))
      .map((item, index) => ({ ...queueItem(item), queueIndex: index, processFirst: index === 0, status: 'needsChainPreflight', note: 'Set RPC_URL or pass --rpc to verify direct chain processability.' }));
  }
  const checked = await Promise.all(candidates.map(async (item) => {
    try {
      const chain = await chainProposalContext(dao, item.proposal);
      return { proposal: item.proposal, lifecycle: deriveProposalLifecycle(item.proposal, Math.floor(Date.now() / 1000), chain), chain };
    } catch (error) {
      return { proposal: item.proposal, lifecycle: { ...item.lifecycle, status: 'chainPreflightError', processableNow: false, error: error.shortMessage || error.message } };
    }
  }));
  return checked
    .filter((item) => item.lifecycle.processableNow)
    .sort((a, b) => Number(a.proposal.proposalId) - Number(b.proposal.proposalId))
    .map((item, index) => ({ ...queueItem(item), queueIndex: index, processFirst: index === 0 }));
}

function summarizeProposals(proposals) {
  const now = Math.floor(Date.now() / 1000);
  const items = (proposals || []).map((proposal) => ({
    proposalId: proposal.proposalId,
    title: proposal.title,
    proposalType: proposal.proposalType,
    lifecycle: deriveProposalLifecycle(proposal, now),
  }));
  return {
    count: items.length,
    votingCount: items.filter((item) => item.lifecycle.inVoting).length,
    unsponsoredCount: items.filter((item) => item.lifecycle.needsSponsor).length,
    graceCount: items.filter((item) => item.lifecycle.inGrace).length,
    needsProcessingCount: items.filter((item) => item.lifecycle.graphReady).length,
    passedProcessedCount: items.filter((item) => item.lifecycle.status === 'processedPassed').length,
    failedCount: items.filter((item) => item.lifecycle.status === 'failed' || item.lifecycle.status === 'processedFailed').length,
    items,
  };
}

function summarizeMembers(members = []) {
  return {
    count: members.length,
    members: members.map((member) => ({
      memberAddress: member.memberAddress,
      shares: member.shares,
      loot: member.loot,
      delegateShares: member.delegateShares,
      delegatingTo: member.delegatingTo,
      voteCount: member.votes?.length || 0,
    })),
  };
}

function latestRecord(records = []) {
  return records[0] || null;
}

function safeJsonParse(value) {
  try { return JSON.parse(value); } catch { return value || null; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${stringify(value)}\n`);
}

async function taskSnapshot(dao) {
  const outDir = arg('out-dir', path.join(process.cwd(), 'artifacts', dao.toLowerCase()));
  const first = Number(arg('first', 100));
  const timestamp = new Date().toISOString();
  const [direct, history, membersResult, profileRecords, charterRecords, joinRulesRecords] = await Promise.all([
    process.env.RPC_URL || arg('rpc') ? readDaoDirect(dao) : Promise.resolve(null),
    graphDaoHistory(dao),
    graphMembers(dao),
    graphRecordsWithTable(dao, 'daoProfile'),
    graphRecordsWithTable(dao, 'charter'),
    graphRecordsWithTable(dao, 'joinRules'),
  ]);
  const proposals = history.proposals || [];
  const members = membersResult.members || [];
  const summary = summarizeProposals(proposals);
  const membershipSummary = summarizeMembers(members);
  const processQueue = await processQueueFromProposals(dao, proposals);
  const checkpointFile = path.join(outDir, 'checkpoint.json');
  let previousCheckpoint = {};
  if (fs.existsSync(checkpointFile)) {
    try { previousCheckpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')); } catch {}
  }
  const checkpoint = {
    dao,
    updatedAt: timestamp,
    lastProcessedProposalId: previousCheckpoint.lastProcessedProposalId || null,
    currentOperatingContext: previousCheckpoint.currentOperatingContext || null,
    openProposalCount: summary.votingCount,
    pendingActionList: processQueue.map((item) => ({ action: 'process', proposalId: item.proposalId })),
    mandateChecklistStatus: previousCheckpoint.mandateChecklistStatus || null,
    lastGraphProposalIdSeen: proposals.reduce((max, p) => Math.max(max, Number(p.proposalId || 0)), Number(previousCheckpoint.lastGraphProposalIdSeen || 0)),
    lastPassedProposalIdIncorporated: previousCheckpoint.lastPassedProposalIdIncorporated || null,
    votingCount: summary.votingCount,
    needsProcessingCount: processQueue.length,
  };
  const files = {
    directState: path.join(outDir, 'direct-state.json'),
    graphHistory: path.join(outDir, 'graph-history.json'),
    proposalSummary: path.join(outDir, 'proposal-summary.json'),
    membershipSummary: path.join(outDir, 'membership-summary.json'),
    daoRecords: path.join(outDir, 'dao-records.json'),
    operatingContext: path.join(outDir, 'operating-context.json'),
    processQueue: path.join(outDir, 'process-queue.json'),
    checkpoint: checkpointFile,
  };
  if (direct) writeJson(files.directState, direct);
  writeJson(files.graphHistory, { dao: history.dao, proposals });
  writeJson(files.proposalSummary, summary);
  writeJson(files.membershipSummary, membershipSummary);
  const records = {
    daoProfile: profileRecords.records || [],
    charter: charterRecords.records || [],
    joinRules: joinRulesRecords.records || [],
  };
  writeJson(files.daoRecords, records);
  writeJson(files.operatingContext, {
    dao,
    updatedAt: timestamp,
    currentProfile: safeJsonParse(latestRecord(records.daoProfile)?.content),
    currentCharter: safeJsonParse(latestRecord(records.charter)?.content),
    currentJoinRules: safeJsonParse(latestRecord(records.joinRules)?.content),
    membershipSummaryPath: files.membershipSummary,
    proposalSummaryPath: files.proposalSummary,
    processQueuePath: files.processQueue,
  });
  writeJson(files.processQueue, { queue: processQueue });
  writeJson(files.checkpoint, checkpoint);
  return {
    dao,
    outDir,
    first,
    updatedAt: timestamp,
    files,
    summary: {
      proposalCount: summary.count,
      votingCount: summary.votingCount,
      openProposalThrottleBlocked: summary.votingCount >= Number(arg('max-voting', 3)),
      needsProcessingCount: processQueue.length,
      oldestProcessableProposalId: processQueue[0]?.proposalId || null,
    },
  };
}

async function graphRecordsWithTable(dao, table) {
  return request(graphUrl(), gql`query records($daoid: String!, $table: String!) {
    records(first: 20, orderBy: createdAt, orderDirection: desc, where: { dao: $daoid, table: $table }) {
      ${RECORD_FIELDS}
    }
  }`, { daoid: dao.toLowerCase(), table });
}

function summonProfile(p) {
  return Object.fromEntries(Object.entries({
    name: p.daoName,
    description: p.description,
    longDescription: p.longDescription,
    avatarImg: p.avatarImg,
    bannerImg: p.bannerImg,
    links: p.links,
    goalsURI: p.goalsURI,
    charterURI: p.charterURI,
    joinRulesURI: p.joinRulesURI,
    rulesURI: p.rulesURI,
    manifestoURI: p.manifestoURI,
    communityMemoryURI: p.communityMemoryURI,
    proposalWorkspaceURI: p.proposalWorkspaceURI,
    sharedStateURI: p.sharedStateURI,
  }).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

async function safeAddressForDao(dao) {
  const explicit = arg('safe') || arg('safe-address') || process.env.SAFE_ADDRESS;
  if (explicit) return explicit;
  if (process.env.RPC_URL || arg('rpc')) {
    try {
      return await client().readContract({ address: dao, abi: BAAL_ABI, functionName: 'avatar' });
    } catch {}
  }
  if (!(process.env.GRAPH_URL || process.env.GRAPH_API_KEY || arg('graph-url') || arg('graph-key'))) return null;
  try {
    const { dao: indexedDao } = await graphDao(dao);
    return indexedDao?.safeAddress || null;
  } catch {
    return null;
  }
}

async function estimateBaalGas(dao, actions, proposalData) {
  const safeAddress = await safeAddressForDao(dao);
  if (!safeAddress) throw new Error('Missing DAO Safe address for DAOhaus-style baalGas estimation. Pass --safe 0xSAFE or configure Graph.');
  const c = client();
  const moduleData = encodeFunctionData({
    abi: GNOSIS_MODULE_ABI,
    functionName: 'execTransactionFromModule',
    args: [GNOSIS_MULTISEND, 0n, proposalData, 1],
  });
  const estimate = await c.estimateGas({
    account: dao,
    to: safeAddress,
    value: 0n,
    data: moduleData,
  });
  return BigInt(estimate || 0) + BigInt(actions.length) * ACTION_GAS_LIMIT_ADDITION;
}

function applyGasBuffer(gas, bufferScale) {
  return (gas * bufferScale + 999n) / 1000n;
}

async function processGasLimit(dao, proposalId) {
  if (arg('gas-limit') != null) return BigInt(arg('gas-limit'));
  if (arg('process-gas-limit') != null) return BigInt(arg('process-gas-limit'));
  try {
    const c = client();
    const raw = await c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'proposals', args: [BigInt(proposalId)] });
    const baalGas = BigInt(raw[6] || 0);
    const limit = baalGas > 0n ? baalGas + PROCESS_PROPOSAL_GAS_LIMIT_ADDITION : DEFAULT_PROCESS_GAS_LIMIT;
    return limit > DEFAULT_PROCESS_GAS_LIMIT ? limit : DEFAULT_PROCESS_GAS_LIMIT;
  } catch {
    return DEFAULT_PROCESS_GAS_LIMIT;
  }
}

async function proposalOfferingValue(dao, fallback) {
  if (has('proposal-offering')) return BigInt(arg('proposal-offering'));
  if (has('value')) return BigInt(arg('value'));
  if (fallback != null) return BigInt(fallback);
  const daoState = await readDaoDirect(dao);
  return BigInt(daoState.proposalOffering || 0);
}

async function proposalTx({ dao, actions, title, description, link, proposalType, expiration = 0, baalGas, value }) {
  const proposalData = encodeMultiAction(actions);
  const txValue = value == null ? await proposalOfferingValue(dao) : BigInt(value);
  let resolvedBaalGas = baalGas == null ? 0n : BigInt(baalGas);
  let estimatedBaalGas = false;
  let baalGasRawEstimate;
  let baalGasBuffer;
  let baalGasEstimateError;
  if (baalGas == null && has('estimate-baal-gas')) {
    try {
      const bufferScale = decimalArg('baal-gas-buffer', 1.2);
      const rawEstimate = await estimateBaalGas(dao, actions, proposalData);
      resolvedBaalGas = applyGasBuffer(rawEstimate, bufferScale);
      baalGasRawEstimate = rawEstimate.toString();
      baalGasBuffer = (Number(bufferScale) / 1000).toString();
      estimatedBaalGas = true;
    } catch (error) {
      baalGasEstimateError = error.shortMessage || error.message;
      if (has('require-baal-gas-estimate')) throw error;
      resolvedBaalGas = 0n;
    }
  }
  const data = encodeFunctionData({
    abi: BAAL_ABI,
    functionName: 'submitProposal',
    args: [proposalData, Number(expiration), resolvedBaalGas, details({ title, description, link, proposalType })],
  });
  return { ...tx(dao, data, txValue), proposalData, baalGas: resolvedBaalGas.toString(), proposalOffering: txValue.toString(), estimatedBaalGas, baalGasRawEstimate, baalGasBuffer, baalGasEstimateError };
}

function requireDao() {
  const dao = arg('dao');
  if (!dao) throw new Error('Missing --dao 0x...');
  return dao;
}

function client() {
  const url = process.env.RPC_URL || arg('rpc');
  if (!url) throw new Error('Set RPC_URL or pass --rpc');
  return createPublicClient({ chain: base, transport: http(url) });
}

async function sendIfRequested(unsigned) {
  if (!has('send')) return unsigned;
  const privateKey = process.env.PRIVATE_KEY || getPrivateKeyFromVault();
  if (!privateKey) throw new Error('Set PRIVATE_KEY to send, or use --vault-provider 1password --vault-item <item> [--vault-field private_key]');
  const account = privateKeyToAccount(privateKey);
  const c = client();
  const wallet = createWalletClient({ account, chain: base, transport: http(process.env.RPC_URL || arg('rpc')) });
  const request = await c.prepareTransactionRequest({
    account,
    to: unsigned.to,
    value: BigInt(unsigned.value || 0),
    data: unsigned.data,
    gas: unsigned.gas == null ? undefined : BigInt(unsigned.gas),
    nonce: await c.getTransactionCount({ address: account.address, blockTag: 'pending' }),
  });
  const hash = await wallet.sendTransaction(request);
  const result = { hash, from: account.address, summary: unsigned.summary, unsigned };
  if (has('wait') && has('no-wait')) throw new Error('Use either --wait or --no-wait, not both.');
  const confirmations = Number(arg('confirmations', 1));
  if (!Number.isInteger(confirmations) || confirmations < 1) throw new Error('--confirmations must be a positive integer');
  if (has('no-wait') && confirmations !== 1) throw new Error('--confirmations requires waiting; remove --no-wait.');
  if (!has('no-wait') && (has('wait') || process.env.MOLOCH_WAIT_DEFAULT !== 'false')) {
    result.receipt = await c.waitForTransactionReceipt({ hash, confirmations, timeout: Number(arg('wait-ms', 180000)) });
  }
  if (unsigned.summary?.dao && unsigned.summary?.proposalId) {
    try { result.postActionState = await lifecycleForProposal(unsigned.summary.dao, unsigned.summary.proposalId); } catch (error) { result.postActionStateError = error.message; }
  }
  return result;
}

function getPrivateKeyFromVault() {
  const provider = arg('vault-provider');
  if (!provider) return undefined;
  if (provider !== '1password') throw new Error(`Unsupported vault provider: ${provider}`);
  const item = arg('vault-item');
  const field = arg('vault-field', 'private_key');
  const vault = arg('vault');
  if (!item) throw new Error('Missing --vault-item for 1Password');
  const args = ['item', 'get', item, '--field', field, '--reveal'];
  if (vault) args.push('--vault', vault);
  return execFileSync('op', args, { encoding: 'utf8' }).trim();
}

function repoCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function main() {
  const command = process.argv[2];
  if (!command || command === '--help') {
    console.log(`Moloch CLI commands:
  capabilities         Show supported proposal families and configured read/send capabilities
  task-snapshot        Cron-friendly combined DAO/proposal/lifecycle artifact writer
  new-account          Generate a fresh local Ethereum account
  read-dao             Direct contract state for a DAO
  read-proposal        Direct contract proposal tuple plus named getProposalStatus
  graph-dao            Indexed DAO context from DAOhaus subgraph
  graph-proposal       Indexed proposal details, votes, proposalData
  graph-proposals      Indexed proposal list
  graph-dao-history    DAO plus proposal history in one Graph query
  graph-members        Indexed members with shares, loot, delegation, vote history
  graph-member         One indexed member: --member 0x...
  graph-records        DAO Poster records: --table daoProfile|signal|communityMemory
  treasury-tokens      DAO Safe balances plus sorted ragequit token list
  proposal-lifecycle   Derived status: unsponsored/voting/grace/needsProcessing/failed/processed
  process-queue        Oldest ready-to-process proposals first
  wrap-eth             Wrap native ETH to Base WETH
  unwrap-eth           Unwrap Base WETH to native ETH
  approve-token        Approve ERC-20 spending, default spender is Tribute Minion
  ragequit             Direct member ragequit: serious exit action; requires --confirm-ragequit with --send
  signal               Text/metadata governance signal. Not for membership, shares, or loot.
  dao-meta             Proposal to update daoProfile metadata/links through Poster
  dao-record           Proposal to post a charter/joinRules/manifesto record through Poster
  memory-post          Direct Poster post for DAO forum/memory/discussion records
  tribute, join-dao    Real tokens-for-shares or tokens-for-loot proposal via Tribute Minion
  mint-shares          Direct Baal proposal to mint voting shares to member address(es)
  gov-settings         Governance config proposal
  token-settings       Share/loot pause config proposal
  sponsor, vote, process, cancel  Proposal lifecycle actions
  summon               Summon a DAO

Options:
  --compact            Hide large calldata/proposalData in output
  --estimate-baal-gas  Opt in to DAOhaus-style submitProposal baalGas estimation
  --no-estimate-baal-gas  Legacy no-op; baalGas is 0 by default unless explicitly set
  --baal-gas <n>       Explicit submitProposal baalGas; low nonzero values can make processing fail
  --baal-gas-buffer <n>  Multiplier for opt-in estimated baalGas; default 1.2
  --require-baal-gas-estimate  Error if baalGas cannot be estimated
  --safe 0xSAFE        DAO Safe address for DAOhaus-style baalGas estimation
  --gas-limit <n>      Explicit transaction gas limit for sends
  --amount-raw <n>     Raw 18-decimal base units for mint-shares amount
  --shares-raw <n>     Raw 18-decimal base units for Tribute Minion shares
  --loot-raw <n>       Raw 18-decimal base units for Tribute Minion loot
  --community-memory-uri ipfs://...  DAO profile pointer to shared memory root
  --proposal-workspace-uri ipfs://... DAO profile pointer to proposal workspaces
  --shared-state-uri ipfs://... DAO profile pointer to current shared state
  --send               Broadcast a write tx
  --wait               Explicitly wait for receipt after send
  --no-wait            Return immediately after broadcast
  --confirmations <n>  Wait for n confirmations; default 1
  --vault-provider 1password --vault-item <item> [--vault-field private_key]

Share and loot quantities default to human 18-decimal units:
  --amount 10000 on mint-shares encodes 10000000000000000000000
  --shares 1 on tribute encodes 1000000000000000000

Proposal offering is native tx value for submitProposal. Tribute/join uses ERC-20 tokens only; native ETH tribute is not supported by the DAOhaus Tribute Minion.
For native ETH-to-shares flows, use wrap-eth, approve-token, then tribute/join with Base WETH: ${BASE_WETH}
Ragequit is not a proposal. It burns caller shares/loot and should be treated as an irreversible DAO exit action. Use --tokens ETH,0xERC20 for the sorted treasury token list; ETH maps to Baal's ETH sentinel.
`);
    return;
  }

  if (command === 'capabilities' || command === 'doctor') {
    console.log(stringify({
      version: 'moloch-skills-local',
      gitCommit: repoCommit(),
      proposalFamilies: {
        signal: true,
        tribute: true,
        joinDao: true,
        mintShares: true,
        governanceSettings: true,
        tokenSettings: true,
        customMulticall: 'manual helper only',
      },
      lifecycleHelpers: ['proposal-lifecycle', 'process-queue', 'read-proposal named status'],
      configured: {
        rpc: Boolean(process.env.RPC_URL || arg('rpc')),
        graph: Boolean(process.env.GRAPH_URL || process.env.GRAPH_API_KEY || arg('graph-url') || arg('graph-key')),
        privateKey: Boolean(process.env.PRIVATE_KEY),
        vaultProvider: arg('vault-provider') || null,
      },
      maintainedAt: 'https://github.com/HausDAO/moloch-skills',
      graphEndpoint: `${THE_GRAPH_GATEWAY}/<api-key>/subgraphs/id/${DAOHAUS_BASE_SUBGRAPH_ID}`,
      warning: 'If tribute/join-dao or mint-shares is missing from --help, the local skill bundle is outdated.',
    }));
    return;
  }

  if (command === 'task-snapshot') {
    console.log(stringify(await taskSnapshot(requireDao())));
    return;
  }

  if (command === 'new-account') {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    console.log(stringify({ address: account.address, privateKey }));
    return;
  }

  if (command === 'details') {
    console.log(details({
      title: arg('title', ''),
      description: arg('description', ''),
      link: arg('link', ''),
      proposalType: arg('proposal-type', 'MULTICALL'),
    }));
    return;
  }

  if (command === 'decode-proposal-data') {
    const data = arg('data') || arg('proposal-data');
    if (!data) throw new Error('Missing --data 0x...');
    const decoded = decodeFunctionData({ abi: MULTISEND_ABI, data });
    console.log(stringify({ functionName: decoded.functionName, actions: decodeMultiSendBytes(decoded.args[0]).map(decodeAction) }));
    return;
  }

  if (command === 'decode-submit-proposal') {
    const data = arg('data');
    if (!data) throw new Error('Missing --data 0x...');
    const decoded = decodeFunctionData({ abi: BAAL_ABI, data });
    const [proposalData, expiration, baalGas, rawDetails] = decoded.args;
    let parsedDetails = rawDetails;
    try { parsedDetails = JSON.parse(rawDetails); } catch {}
    let actions = [];
    try {
      const multi = decodeFunctionData({ abi: MULTISEND_ABI, data: proposalData });
      actions = decodeMultiSendBytes(multi.args[0]).map(decodeAction);
    } catch {}
    console.log(stringify({ functionName: decoded.functionName, proposalData, expiration, baalGas, details: parsedDetails, actions }));
    return;
  }

  if (command === 'graph-dao') {
    console.log(stringify(await graphDao(requireDao())));
    return;
  }

  if (command === 'graph-proposal') {
    console.log(stringify(await graphProposal(requireDao(), Number(arg('proposal')))));
    return;
  }

  if (command === 'graph-proposals') {
    console.log(stringify(await graphProposals(requireDao())));
    return;
  }

  if (command === 'graph-dao-history') {
    console.log(stringify(await graphDaoHistory(requireDao())));
    return;
  }

  if (command === 'graph-members') {
    console.log(stringify(await graphMembers(requireDao())));
    return;
  }

  if (command === 'graph-member') {
    console.log(stringify(await graphMember(requireDao(), arg('member'))));
    return;
  }

  if (command === 'graph-records') {
    console.log(stringify(await graphRecords(requireDao())));
    return;
  }

  if (command === 'treasury-tokens' || command === 'ragequit-tokens') {
    console.log(stringify(await treasuryTokens(requireDao())));
    return;
  }

  if (command === 'proposal-lifecycle') {
    console.log(stringify(await lifecycleForProposal(requireDao(), Number(arg('proposal')))));
    return;
  }

  if (command === 'process-queue') {
    const dao = requireDao();
    const { proposals } = await graphProposals(dao);
    console.log(stringify({ queue: await processQueueFromProposals(dao, proposals || []) }));
    return;
  }

  if (command === 'read-dao') {
    const dao = requireDao();
    console.log(stringify(await readDaoDirect(dao)));
    return;
  }

  if (command === 'read-proposal') {
    const dao = requireDao();
    const id = Number(arg('proposal'));
    const c = client();
    const [raw, status, state] = await Promise.all([
      c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'proposals', args: [BigInt(id)] }),
      c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'getProposalStatus', args: [id] }),
      c.readContract({ address: dao, abi: BAAL_ABI, functionName: 'state', args: [id] }),
    ]);
    console.log(stringify({ dao, proposal: id, raw, status: namedProposalStatus(status), state, stateName: STATE_NAMES[Number(state)] || `unknown-${state}` }));
    return;
  }

  let out;
  if (command === 'wrap-eth' || command === 'wrap-weth') {
    const amount = parseEther(arg('amount', '0'));
    const weth = arg('weth', BASE_WETH);
    const data = encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit' });
    out = withSummary(tx(weth, data, amount), { action: 'wrap-eth', token: weth, amount: amount.toString(), note: 'Wraps native ETH into WETH. Use WETH as the ERC-20 token for Tribute Minion swaps.' });
  } else if (command === 'unwrap-eth' || command === 'unwrap-weth') {
    const amount = parseEther(arg('amount', '0'));
    const weth = arg('weth', BASE_WETH);
    const data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amount] });
    out = withSummary(tx(weth, data), { action: 'unwrap-eth', token: weth, amount: amount.toString(), note: 'Unwraps WETH back to native ETH.' });
  } else if (command === 'approve-token' || command === 'approve') {
    const token = arg('token', BASE_WETH);
    const spender = arg('spender', TRIBUTE_MINION);
    const amount = has('max') ? (1n << 256n) - 1n : has('amount-raw') ? BigInt(arg('amount-raw')) : arg('decimals') ? parseUnits(arg('amount', '0'), Number(arg('decimals'))) : parseEther(arg('amount', '0'));
    const data = encodeFunctionData({ abi: ERC20_APPROVE_ABI, functionName: 'approve', args: [spender, amount] });
    out = withSummary(tx(token, data), { action: 'approve-token', token, spender, amount: amount.toString(), note: 'Approves ERC-20 spending. Tribute Minion needs allowance before token-for-shares/loot proposals can be submitted.' });
  } else if (command === 'ragequit' || command === 'rage-quit') {
    if (has('send') && !has('confirm-ragequit')) throw new Error('ragequit burns DAO shares/loot and exits treasury value. Re-run with --confirm-ragequit to broadcast, or omit --send to inspect.');
    const dao = requireDao();
    const to = arg('to');
    if (!to) throw new Error('Missing --to 0xRECIPIENT');
    const sharesParsed = baalTokenArg('shares', '0');
    const lootParsed = baalTokenArg('loot', '0');
    const tokens = ragequitTokensArg();
    const data = encodeFunctionData({ abi: BAAL_ABI, functionName: 'ragequit', args: [to, sharesParsed.value, lootParsed.value, tokens] });
    out = withSummary(tx(dao, data), { action: 'ragequit', dao, to, sharesToBurn: sharesParsed.value.toString(), lootToBurn: lootParsed.value.toString(), tokens, note: 'Direct member action. Burns caller shares/loot and claims proportional treasury assets. Token list must be sorted ascending for Baal.' });
  } else if (command === 'memory-post' || command === 'poster-post') {
    const dao = requireDao();
    const p = arg('content-file') ? jsonFile(arg('content-file')) : {};
    const table = arg('table', p.table || 'communityMemory');
    const content = memoryPostContent(dao, table, {
      ...p,
      schema: arg('schema', p.schema),
      type: arg('type', p.type),
      title: arg('title', p.title),
      body: arg('body', p.body || arg('description', '')),
      threadId: arg('thread-id', p.threadId),
      topicId: arg('topic-id', p.topicId),
      parentId: arg('parent-id', p.parentId),
      proposalId: arg('proposal', p.proposalId),
      draftId: arg('draft-id', p.draftId),
      contentURI: arg('content-uri', p.contentURI || arg('link', p.link)),
      contentHash: arg('content-hash', p.contentHash),
      workspaceURI: arg('workspace-uri', p.workspaceURI),
      stateURI: arg('state-uri', p.stateURI),
      agent: arg('agent', p.agent),
      version: arg('version', p.version),
      queryType: arg('query-type', p.queryType || 'list'),
    });
    const tag = arg('tag', POSTER_TAG_MEMBER_DB);
    const data = encodeFunctionData({ abi: POSTER_ABI, functionName: 'post', args: [JSON.stringify(content), tag] });
    out = withSummary(tx(POSTER, data), { action: 'post', proposalKind: 'MEMORY_POST', submissionTarget: 'POSTER', dao, recordTable: table, tag, queryType: content.queryType, type: content.type, title: content.title, threadId: content.threadId, topicId: content.topicId, proposalId: content.proposalId, draftId: content.draftId, contentURI: content.contentURI, note: 'Direct Poster post using the DAOhaus member database tag. The sender must be a DAO member for current DAOhaus indexing.' });
  } else if (command === 'signal') {
    const dao = requireDao();
    const title = arg('title');
    const description = arg('description', '');
    const link = arg('link', '');
    if (!title) throw new Error('Missing --title');
    ensureSignalIntent({ title, description });
    const postData = encodeFunctionData({ abi: POSTER_ABI, functionName: 'post', args: [JSON.stringify({ daoId: dao, table: 'signal', queryType: 'list', title, description, link }), POSTER_TAG_DAO_DB] });
    out = withSummary(await proposalTx({ dao, title, description, link, proposalType: 'SIGNAL', expiration: Number(arg('expiration', 0)), baalGas: arg('baal-gas') == null ? undefined : BigInt(arg('baal-gas')), actions: [{ to: POSTER, value: 0, data: postData, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'SIGNAL', submissionTarget: 'BAAL', dao });
  } else if (command === 'dao-meta') {
    const dao = requireDao();
    const p = arg('params') ? jsonFile(arg('params')) : {};
    const title = arg('title', p.title || 'Update DAO metadata');
    const description = arg('description', p.proposalDescription || p.description || '');
    const content = daoProfileContent(dao, { ...p, name: arg('name', p.name), description: arg('dao-description', p.description), charterURI: arg('charter-uri', p.charterURI), joinRulesURI: arg('join-rules-uri', p.joinRulesURI), goalsURI: arg('goals-uri', p.goalsURI), manifestoURI: arg('manifesto-uri', p.manifestoURI), communityMemoryURI: arg('community-memory-uri', p.communityMemoryURI), proposalWorkspaceURI: arg('proposal-workspace-uri', p.proposalWorkspaceURI), sharedStateURI: arg('shared-state-uri', p.sharedStateURI), web: arg('web', p.web) });
    const postData = encodeFunctionData({ abi: POSTER_ABI, functionName: 'post', args: [JSON.stringify(content), POSTER_TAG_DAO_PROFILE_UPDATE] });
    out = withSummary(await proposalTx({ dao, title, description, link: arg('link', p.link || ''), proposalType: 'UPDATE_METADATA_SETTINGS', expiration: Number(arg('expiration', p.expiration || 0)), baalGas: arg('baal-gas') == null && p.baalGas == null ? undefined : BigInt(arg('baal-gas', p.baalGas)), value: p.value == null ? undefined : BigInt(p.value), actions: [{ to: POSTER, value: 0, data: postData, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'UPDATE_METADATA_SETTINGS', submissionTarget: 'BAAL', dao, recordTable: 'daoProfile' });
  } else if (command === 'dao-record') {
    const dao = requireDao();
    const table = arg('table');
    if (!table) throw new Error('Missing --table, for example charter or joinRules');
    const p = arg('params') ? jsonFile(arg('params')) : {};
    const contentFile = arg('content-file');
    const content = contentFile ? jsonFile(contentFile) : p.content || p;
    const record = daoRecordContent(dao, table, content);
    const title = arg('title', p.title || `Update ${table} record`);
    const description = arg('description', p.proposalDescription || `Post latest ${table} record for DAO agents and members.`);
    const postData = encodeFunctionData({ abi: POSTER_ABI, functionName: 'post', args: [JSON.stringify(record), POSTER_TAG_DAO_PROFILE_UPDATE] });
    out = withSummary(await proposalTx({ dao, title, description, link: arg('link', p.link || content.uri || content.contentURI || ''), proposalType: 'UPDATE_METADATA_SETTINGS', expiration: Number(arg('expiration', p.expiration || 0)), baalGas: arg('baal-gas') == null && p.baalGas == null ? undefined : BigInt(arg('baal-gas', p.baalGas)), value: p.value == null ? undefined : BigInt(p.value), actions: [{ to: POSTER, value: 0, data: postData, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'UPDATE_METADATA_SETTINGS', submissionTarget: 'BAAL', dao, recordTable: table });
  } else if (command === 'tribute' || command === 'join-dao') {
    const dao = requireDao();
    const title = arg('title', 'Tribute for DAO tokens');
    const description = arg('description', '');
    const link = arg('link', '');
    const token = normalizeToken(arg('token'));
    if (token === ZERO || token.toLowerCase() === BAAL_ETH_TOKEN.toLowerCase()) throw new Error('Tribute/join proposals require a nonzero ERC-20 --token address. Native ETH, Baal ETH sentinel, and 0x0000000000000000000000000000000000000000 tribute are not supported by the DAOhaus Tribute Minion.');
    const amount = BigInt(arg('amount', '0'));
    const sharesParsed = baalTokenArg('shares', '0');
    const lootParsed = baalTokenArg('loot', '0');
    const shares = sharesParsed.value;
    const loot = lootParsed.value;
    const value = await proposalOfferingValue(dao);
    const data = encodeFunctionData({
      abi: TRIBUTE_MINION_ABI,
      functionName: 'submitTributeProposal',
      args: [dao, token, amount, shares, loot, Number(arg('expiration', 0)), BigInt(arg('baal-gas', 0)), details({ title, description, link, proposalType: 'TOKENS_FOR_SHARES' })],
    });
    out = withSummary(tx(TRIBUTE_MINION, data, value), { action: 'submitTributeProposal', proposalKind: 'TOKENS_FOR_SHARES', submissionTarget: 'TRIBUTE_MINION', dao, token, amount: amount.toString(), shares: shares.toString(), loot: loot.toString(), proposalOffering: value.toString(), sharesInput: sharesParsed.input, lootInput: lootParsed.input, shareLootUnitMode: sharesParsed.mode === lootParsed.mode ? sharesParsed.mode : 'mixed', note: 'ERC-20 tribute. Transaction value is the DAO proposal offering only. Approve the Tribute Minion before submitting if allowance is insufficient. Shares/loot are human 18-decimal units unless --shares-raw/--loot-raw is used.' });
  } else if (command === 'mint-shares') {
    const dao = requireDao();
    const title = arg('title', 'Mint voting shares');
    const description = arg('description', '');
    const link = arg('link', '');
    const recipients = listArg('to');
    const parsedAmounts = baalTokenListArg('amount');
    const amounts = parsedAmounts.values;
    if (!recipients.length) throw new Error('Missing --to 0xMEMBER[,0xMEMBER...]');
    if (!amounts.length) throw new Error('Missing --amount 1[,...] for human share units, or --amount-raw 1000000000000000000[,...] for raw base units');
    if (amounts.length !== recipients.length) throw new Error('--to and --amount must have the same number of comma-separated values');
    const action = encodeFunctionData({ abi: BAAL_ABI, functionName: 'mintShares', args: [recipients, amounts] });
    out = withSummary(await proposalTx({ dao, title, description, link, proposalType: 'MINT_SHARES', expiration: Number(arg('expiration', 0)), baalGas: arg('baal-gas') == null ? undefined : BigInt(arg('baal-gas')), actions: [{ to: dao, value: 0, data: action, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'MINT_SHARES', submissionTarget: 'BAAL', dao, recipients, amounts: amounts.map(String), amountInputs: parsedAmounts.inputs, amountUnitMode: parsedAmounts.mode, note: 'Direct Baal mintShares proposal. --amount uses human 18-decimal share units; use --amount-raw only for exact base units.' });
  } else if (command === 'gov-settings') {
    const dao = requireDao();
    const p = jsonFile(arg('params'));
    const inner = encodeValues(['uint32', 'uint32', 'uint256', 'uint256', 'uint256', 'uint256'], [p.votingPeriodInSeconds, p.gracePeriodInSeconds, BigInt(p.newOffering), rawPercent('quorum', p.quorum), BigInt(p.sponsorThreshold), rawPercent('minRetention', p.minRetention)]);
    const action = encodeFunctionData({ abi: BAAL_ABI, functionName: 'setGovernanceConfig', args: [inner] });
    out = withSummary(await proposalTx({ dao, title: p.title, description: p.description || '', link: p.link || '', proposalType: 'UPDATE_GOV_SETTINGS', expiration: p.expiration || 0, baalGas: arg('baal-gas') == null && p.baalGas == null ? undefined : BigInt(arg('baal-gas', p.baalGas)), value: p.value == null ? undefined : BigInt(p.value), actions: [{ to: dao, value: 0, data: action, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'UPDATE_GOV_SETTINGS', submissionTarget: 'BAAL', dao });
  } else if (command === 'token-settings') {
    const dao = requireDao();
    const title = arg('title', 'Update token settings');
    const description = arg('description', '');
    const action = encodeFunctionData({ abi: BAAL_ABI, functionName: 'setAdminConfig', args: [boolArg('pause-shares'), boolArg('pause-loot')] });
    out = withSummary(await proposalTx({ dao, title, description, link: arg('link', ''), proposalType: 'TOKEN_SETTINGS', expiration: Number(arg('expiration', 0)), baalGas: arg('baal-gas') == null ? undefined : BigInt(arg('baal-gas')), actions: [{ to: dao, value: 0, data: action, operation: 0 }] }), { action: 'submitProposal', proposalKind: 'TOKEN_SETTINGS', submissionTarget: 'BAAL', dao });
  } else if (['sponsor', 'vote', 'process', 'cancel'].includes(command)) {
    const dao = requireDao();
    const id = Number(arg('proposal'));
    const functionName = command === 'sponsor' ? 'sponsorProposal' : command === 'vote' ? 'submitVote' : command === 'process' ? 'processProposal' : 'cancelProposal';
    const args = command === 'vote' ? [id, boolArg('approved')] : command === 'process' ? [id, arg('proposal-data')] : [id];
    let gas;
    if (command === 'process' && (has('send') || has('preflight')) && !has('skip-preflight')) {
      const lifecycle = await lifecycleForProposal(dao, id);
      if (!lifecycle.lifecycle.processableNow) {
        throw new Error(`Proposal ${id} is not processable now: ${lifecycle.lifecycle.status}`);
      }
      if (String(lifecycle.chain?.namedStatus?.processed) === 'true') {
        throw new Error(`Proposal ${id} is already processed.`);
      }
      const indexedData = lifecycle.proposal?.proposalData || (await graphProposal(dao, id)).proposal?.proposalData;
      if (indexedData && arg('proposal-data') && indexedData.toLowerCase() !== arg('proposal-data').toLowerCase()) {
        throw new Error(`Proposal ${id} proposalData does not match indexed proposalData.`);
      }
    }
    if (command === 'process') gas = (await processGasLimit(dao, id)).toString();
    out = withSummary(tx(dao, encodeFunctionData({ abi: BAAL_ABI, functionName, args }), 0n, gas ? { gas } : {}), { action: functionName, proposalKind: 'LIFECYCLE_ACTION', submissionTarget: 'BAAL', dao, proposalId: id, note: command === 'process' ? 'processProposal uses an explicit transaction gas limit. If the proposal stored a low nonzero baalGas, the inner action may still fail because that limit was set at submission time.' : undefined });
  } else if (command === 'summon') {
    const p = jsonFile(arg('params'));
    const mint = encodeValues(['address[]', 'uint256[]', 'uint256[]'], [p.memberAddresses, p.memberShares.map(BigInt), p.memberLoot.map(BigInt)]);
    const tokens = encodeValues(['string', 'string', 'string', 'string', 'bool', 'bool'], [p.tokenName, p.tokenSymbol, p.lootTokenName, p.lootTokenSymbol, !!p.votingTransferable, !!p.nvTransferable]);
    const gov = encodeValues(['uint32', 'uint32', 'uint256', 'uint256', 'uint256', 'uint256'], [p.votingPeriodInSeconds, p.gracePeriodInSeconds, BigInt(p.newOffering), rawPercent('quorum', p.quorum), BigInt(p.sponsorThreshold), rawPercent('minRetention', p.minRetention)]);
    const govTx = encodeFunctionData({ abi: BAAL_ABI, functionName: 'setGovernanceConfig', args: [gov] });
    const shamanTx = encodeFunctionData({ abi: BAAL_ABI, functionName: 'setShamans', args: [p.shamanAddresses || [], (p.shamanPermissions || []).map(BigInt)] });
    const metadataPost = encodeFunctionData({ abi: POSTER_ABI, functionName: 'post', args: [JSON.stringify(summonProfile(p)), POSTER_TAG_SUMMONER] });
    const metadataTx = encodeFunctionData({ abi: BAAL_ABI, functionName: 'executeAsBaal', args: [POSTER, 0n, metadataPost] });
    const salt = p.saltNonce || BigInt(`0x${crypto.randomBytes(16).toString('hex')}`);
    out = withSummary(tx(SUMMONER, encodeFunctionData({ abi: SUMMONER_ABI, functionName: 'summonBaalFromReferrer', args: [p.safeAddress || ZERO, ZERO, BigInt(salt), mint, tokens, [govTx, shamanTx, metadataTx]] })), { action: 'summonBaalFromReferrer', proposalKind: 'SUMMON', submissionTarget: 'V3_FACTORY_ADV_TOKEN', daoName: p.daoName });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(stringify(compact(await sendIfRequested(out))));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

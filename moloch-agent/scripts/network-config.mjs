#!/usr/bin/env node
/**
 * Read network configuration from config/networks.json.
 *
 * Usage:
 *   node network-config.mjs                           # full Base (8453) config
 *   node network-config.mjs --chain 8453              # same, explicit chain
 *   node network-config.mjs --key TRIBUTE_MINION      # single contract address
 *   node network-config.mjs --chain 8453 --key POSTER # single address, explicit chain
 *   node network-config.mjs --contracts               # contracts map only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'networks.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--chain' && argv[i + 1]) args.chain = argv[++i];
    else if (argv[i] === '--key' && argv[i + 1]) args.key = argv[++i];
    else if (argv[i] === '--contracts') args.contracts = true;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Usage:
  node network-config.mjs                           full config for default chain (8453)
  node network-config.mjs --chain <chainId>         full config for specified chain
  node network-config.mjs --key <CONTRACT_NAME>     single contract address
  node network-config.mjs --contracts               contracts map only
  node network-config.mjs --chain 8453 --key POSTER single address, explicit chain

Available contract keys (Base 8453):
  V3_FACTORY_ADV_TOKEN  V3_FACTORY_ORIGINAL  BAAL_SINGLETON
  SHARES_SINGLETON      LOOT_SINGLETON       POSTER
  TRIBUTE_MINION        BASE_WETH            VAULT_SUMMONER
  GNOSIS_MULTISEND      GNOSIS_SIGNLIB       ZODIAC_FACTORY
`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const networks = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const chainId = args.chain || '8453';
const network = networks[chainId];

if (!network) {
  console.error(`Unknown chain: ${chainId}. Available: ${Object.keys(networks).join(', ')}`);
  process.exit(1);
}

if (args.key) {
  const address = network.contracts[args.key];
  if (!address) {
    console.error(`Unknown key: ${args.key}. Available: ${Object.keys(network.contracts).join(', ')}`);
    process.exit(1);
  }
  console.log(address);
} else if (args.contracts) {
  console.log(JSON.stringify(network.contracts, null, 2));
} else {
  console.log(JSON.stringify(network, null, 2));
}

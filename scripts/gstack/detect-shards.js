#!/usr/bin/env node

import os from 'os'

const cpus = os.cpus().length
const shards = Math.max(1, Math.min(cpus, 8))

console.log(`Detected ${cpus} CPUs, using ${shards} shards`)
console.log(`SHARD_TOTAL=${shards}`)

const result = { total: shards };
export default result;
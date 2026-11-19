// src/utils/subnetMath.js
// Core subnetting helpers for SubnetMaster.

/* ----------------------------- helpers -------------------------------- */

function randomInt(min, max) {
  // inclusive on both ends
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// A random host address from one of the RFC 1918 private ranges.
function randomPrivateIp() {
  const range = randomInt(0, 2)
  if (range === 0) {
    // 192.168.0.0/16
    return `192.168.${randomInt(0, 255)}.${randomInt(1, 254)}`
  }
  if (range === 1) {
    // 10.0.0.0/8
    return `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`
  }
  // 172.16.0.0/12
  return `172.${randomInt(16, 31)}.${randomInt(0, 255)}.${randomInt(1, 254)}`
}

// Parse "a.b.c.d" into a 32-bit unsigned integer using bitwise ops.
function ipToInt(ip) {
  const parts = String(ip).split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    throw new Error(`Invalid IP address: ${ip}`)
  }
  // >>> 0 forces the result into an unsigned 32-bit integer.
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3] >>> 0
}

// Convert a 32-bit unsigned integer back to dotted-decimal.
function intToIp(int) {
  return [(int >>> 24) & 0xff, (int >>> 16) & 0xff, (int >>> 8) & 0xff, int & 0xff].join('.')
}

// Build the subnet mask as a 32-bit unsigned integer from a CIDR.
function cidrToMask(cidr) {
  if (cidr <= 0) return 0
  if (cidr >= 32) return 0xffffffff
  // Shift left, then >>> 0 to keep the value unsigned.
  return (0xffffffff << (32 - cidr)) >>> 0
}

/* --------------------------- public API ------------------------------ */

/**
 * Returns a random practice question: a private IP address and a CIDR.
 * @returns {{ ip: string, cidr: number }}
 */
export function generateQuestion() {
  const ip = randomPrivateIp()
  // /8 through /30 keeps block sizes clean (256, 128, 64, 32, 16, 8, 4, 2)
  // and avoids special-purpose /31 and /32 host routes.
  const cidr = randomInt(8, 30)
  return { ip, cidr }
}

/**
 * Calculate the network address for an IP and CIDR using bitwise operators.
 * @param {string} ip - dotted-decimal IP, e.g. "192.168.1.50"
 * @param {number} cidr - CIDR prefix length, e.g. 27
 * @returns {string} dotted-decimal network address, e.g. "192.168.1.32"
 */
export function calculateNetworkAddress(ip, cidr) {
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR: ${cidr}`)
  }
  const ipInt = ipToInt(ip)
  const mask = cidrToMask(cidr)
  const networkInt = (ipInt & mask) >>> 0
  return intToIp(networkInt)
}

/**
 * Produce a full, human-readable breakdown of the subnet math for a question.
 * Used to render the step-by-step explanation when a user gets it wrong.
 * @param {string} ip
 * @param {number} cidr
 */
export function getSubnetBreakdown(ip, cidr) {
  const octets = String(ip).split('.').map(Number)
  const mask = cidrToMask(cidr)
  const maskOctets = [
    (mask >>> 24) & 0xff,
    (mask >>> 16) & 0xff,
    (mask >>> 8) & 0xff,
    mask & 0xff,
  ]
  const subnetMask = maskOctets.join('.')

  // The "interesting" octet is where the subnet boundary lies. For prefixes
  // that are a multiple of 8, the boundary is the octet immediately after the
  // network portion (block size 256 -> that octet zeros out).
  let interestingIndex = Math.floor(cidr / 8)
  if (interestingIndex > 3) interestingIndex = 3 // guard for /32

  const networkBitsInOctet = cidr - interestingIndex * 8
  const hostBitsInOctet = 8 - networkBitsInOctet
  const blockSize = Math.pow(2, hostBitsInOctet)
  const maskOctetValue = maskOctets[interestingIndex]

  const networkAddress = calculateNetworkAddress(ip, cidr)
  const multiplier = Math.floor(octets[interestingIndex] / blockSize)
  const networkOctetValue = multiplier * blockSize

  const steps = [
    {
      title: 'Subnet mask',
      detail: `/${cidr} = ${cidr} network bits, which is ${subnetMask} in dotted decimal.`,
    },
    {
      title: 'Identify the interesting octet',
      detail: `The subnet boundary falls in octet ${interestingIndex + 1} (value ${octets[interestingIndex]}).`,
    },
    {
      title: 'Block size (magic number)',
      detail: `256 − ${maskOctetValue} = ${blockSize}  (2^${hostBitsInOctet} host bits in this octet).`,
    },
    {
      title: `Network value for octet ${interestingIndex + 1}`,
      detail: `floor(${octets[interestingIndex]} ÷ ${blockSize}) = ${multiplier}, then ${multiplier} × ${blockSize} = ${networkOctetValue}.`,
    },
    {
      title: 'Build the network address',
      detail: `Keep octets before the boundary, apply the network value, zero the rest → ${networkAddress}.`,
    },
  ]

  return {
    ip,
    cidr,
    subnetMask,
    interestingIndex,
    blockSize,
    networkAddress,
    steps,
  }
}

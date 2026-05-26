/**
 * server/services/merkle.ts
 * ─────────────────────────────────────────────────────
 * Minimal binary Merkle tree using SHA-256.
 *
 * Leaves are arbitrary hex strings (pre-hashed leaf data).
 * Pairs are sorted so the tree is deterministic regardless of insertion order.
 *
 * Usage:
 *   const root = buildMerkleRoot(leafHashes);
 *   const proof = getMerkleProof(leafHashes, targetLeaf);
 *   const ok = verifyMerkleProof(targetLeaf, proof, root);
 */

import crypto from 'crypto';

function sha256(a: string, b: string): string {
  // Sort pair so tree is order-independent
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return crypto.createHash('sha256').update(lo + hi).digest('hex');
}

/**
 * Build Merkle root from an array of leaf hashes.
 * Returns the root hex string, or empty string if no leaves.
 */
export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return '';
  if (leaves.length === 1) return leaves[0];

  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(sha256(level[i], level[i + 1]));
      } else {
        // Odd leaf: promote as-is
        next.push(level[i]);
      }
    }
    level = next;
  }
  return level[0];
}

/**
 * Compute the leaf hash for a single session record.
 * Input fields must be stable (same order, same precision).
 */
export function computeLeafHash(
  sessionId: string,
  seq: number,
  inputTokens: number,
  outputTokens: number,
  costGkc: number,
  createdAt: string,
): string {
  const data = `${sessionId}|${seq}|${inputTokens}|${outputTokens}|${costGkc.toFixed(6)}|${createdAt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export interface MerkleProofStep {
  sibling: string;
  position: 'left' | 'right';
}

/**
 * Generate an inclusion proof for a specific leaf.
 * Returns null if the leaf is not found.
 */
export function getMerkleProof(leaves: string[], target: string): MerkleProofStep[] | null {
  const idx = leaves.indexOf(target);
  if (idx === -1) return null;

  const proof: MerkleProofStep[] = [];
  let level = [...leaves];
  let targetIdx = idx;

  while (level.length > 1) {
    const siblingIdx = targetIdx % 2 === 0 ? targetIdx + 1 : targetIdx - 1;
    if (siblingIdx < level.length) {
      proof.push({
        sibling: level[siblingIdx],
        position: targetIdx % 2 === 0 ? 'right' : 'left',
      });
    }
    // Move to parent level
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) next.push(sha256(level[i], level[i + 1]));
      else next.push(level[i]);
    }
    level = next;
    targetIdx = Math.floor(targetIdx / 2);
  }

  return proof;
}

/**
 * Verify a leaf's inclusion proof against a known root.
 */
export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofStep[],
  root: string,
): boolean {
  let current = leaf;
  for (const step of proof) {
    current = step.position === 'right'
      ? sha256(current, step.sibling)
      : sha256(step.sibling, current);
  }
  return current === root;
}

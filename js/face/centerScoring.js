// Candidate scoring for auto-framing.
//
// Replaces the old blind cascade (face → smartcrop → geometric 0,0).
// Every available signal becomes a candidate; the highest score wins.
//
//   score = wFace * faceConf + wSal * saliencyScore - wEdge * edgePenalty
//
// Weights (tuned simply, documented why):
//   wFace = 1.0  — a real TinyFaceDetector hit is the strongest signal for
//                  circular pins (faces are what users usually care about).
//   wSal  = 0.5  — smartcrop is useful for non-faces but noisier than a
//                  trained detector, so it contributes less.
//   wEdge = 0.8  — punish centers that sit near the image border: after we
//                  place that point at the pin center, little margin means
//                  the cut circle (and especially the fold/bleed ring
//                  outside the safe zone) is more likely to clamp or show
//                  empty. Strong enough to overturn a weak saliency hit
//                  near a corner, not strong enough to overturn a solid face.
//
// Multi-face policy: use the GROUP bounding-box center (union of all face
// boxes). Keeps the whole group in frame instead of locking onto the
// largest single face and cropping siblings into the fold ring. Confidence
// for that candidate is max(face.score) — the detector's best face in the
// group is a better proxy than averaging a weak second detection down.

import { PIN_SIZES } from '../constants.js';

export const SCORE_WEIGHTS = {
  wFace: 1.0,
  wSal: 0.5,
  wEdge: 0.8,
};

/**
 * Distance-to-edge penalty in [0, 1].
 * marginFrac = min distance (in image fraction) from the candidate center
 * to any image edge. 0.5 = dead center; 0 = on the border.
 *
 * When pin geometry is known, scale the "comfortable" margin by the
 * safe/cut ratio so pins with a thicker fold ring (smaller safe/cut)
 * penalize edge-hugging centers more.
 */
export function edgePenalty(xFrac, yFrac, pinId = 'frank') {
  const marginFrac = Math.min(xFrac, 1 - xFrac, yFrac, 1 - yFrac);
  const pin = PIN_SIZES.find((p) => p.id === pinId) || PIN_SIZES[0];
  const safeRatio = pin.cutMm > 0 ? pin.safeZoneMm / pin.cutMm : 1;
  // Comfortable margin ≈ half-image * safeRatio (center of a cover crop
  // that still keeps the safe zone filled). Closer than that → penalty.
  const comfortable = 0.5 * Math.max(0.35, Math.min(1, safeRatio));
  const raw = 1 - marginFrac / comfortable;
  return Math.max(0, Math.min(1, raw));
}

function scoreCandidate(c, pinId) {
  const { wFace, wSal, wEdge } = SCORE_WEIGHTS;
  const faceConf = c.source === 'face' ? c.conf || 0 : 0;
  const saliencyScore = c.source === 'smartcrop' ? c.conf || 0 : 0;
  const ep = edgePenalty(c.xFrac, c.yFrac, pinId);
  const score = wFace * faceConf + wSal * saliencyScore - wEdge * ep;
  return { ...c, edgePenalty: ep, score };
}

/**
 * Build candidates, score them, pick the winner.
 *
 * @param {object} opts
 * @param {{xFrac:number,yFrac:number,conf?:number,faces?:object[]}|null} opts.face
 * @param {{xFrac:number,yFrac:number,conf?:number}|null} opts.saliency
 * @param {string} [opts.pinId]
 * @returns {{ winner, alternatives, faces }}
 */
export function pickBestCenter({ face = null, saliency = null, pinId = 'frank' } = {}) {
  const raw = [];

  if (face && Number.isFinite(face.xFrac) && Number.isFinite(face.yFrac)) {
    raw.push({
      source: 'face',
      xFrac: face.xFrac,
      yFrac: face.yFrac,
      conf: face.conf ?? 0,
      label: 'face',
    });
  }

  if (saliency && Number.isFinite(saliency.xFrac) && Number.isFinite(saliency.yFrac)) {
    raw.push({
      source: 'smartcrop',
      xFrac: saliency.xFrac,
      yFrac: saliency.yFrac,
      conf: saliency.conf ?? 0,
      label: 'smartcrop',
    });
  }

  // Always available fallback — geometric image center → offset 0,0.
  raw.push({
    source: 'geometric',
    xFrac: 0.5,
    yFrac: 0.5,
    conf: 0,
    label: 'geometric',
  });

  const alternatives = raw.map((c) => scoreCandidate(c, pinId));
  alternatives.sort((a, b) => b.score - a.score);
  const winner = alternatives[0];

  return {
    winner,
    alternatives,
    faces: face?.faces || [],
  };
}

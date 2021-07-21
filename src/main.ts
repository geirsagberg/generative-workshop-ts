/// <reference types="p5/global" />
/// <reference path="../node_modules/@types/p5/lib/addons/p5.sound.d.ts" />

declare namespace p5 {
  class AudioIn {}
}

import PALETTES from './palettes.json'

let COLORS, FILL, BG

/* Enable to make a canvas suitable for A2 paper */
const PRINT_MODE = false

/* Get a random palette or choose a specific one from palettes.json */
const RANDOM_PALETTE = false
const PALETTE_NAME = 'stronk'

const LAYER_COUNT = 10

/* The average radius of the full shape */
const MEAN_RADIUS = size(600)

/* Enable strokes on the border of each layer, specify weight if enabled */
const HAS_STROKE = true
const STROKE_WEIGHT = size(1)

/* Layers are light to dark (from the center), enable to reverse it */
const INVERTED_GRADIENT = true

/* Instead of gradient from light to dark, go from the fill color to dark */
const CAP_LIGHTNESS = true

/* The degree to which noise affects the layers */
/* Low values are blobby, high values are spikey */
const NOISE_MULTIPLIER = 0.3

/* The speed at which the layers */
const NOISE_SPEED = 0.015

/* Mirror the layers on either axis */
const SYMMETRICAL_X = false
const SYMMETRICAL_Y = false

/* Background is determined by the gradient, but these flags may override it */
/* If both flags are true, palette background will be used */
const USE_FILL_AS_BACKGROUND = false
const USE_PALETTE_BACKGROUND = true

/* The amount of points that make up each layer, lower means "pointier" */
/* For example 3 points mean triangular layers, 4 means squares */
/* Higher might not be noticable, but will make for smoother borders */
const POINT_COUNT = 200

/* Mild rotation, negative speed rotates counter-clockwise */
const ROTATION_SPEED = 0.02

/*

  CONFIG END

*/

// Helper function to scale sizes with print mode
function size(original) {
  return PRINT_MODE ? (original * 4960) / 1000 : original
}

let mic

function setup() {
  const cnv = PRINT_MODE ? createCanvas(4960, 7016) : createCanvas(1000, 1000)
  cnv.mouseClicked(clickOnSave)
  pixelDensity(1)

  /* Get colors from the palettes */
  const PALETTE_KEYS = Object.keys(PALETTES)
  const RANDOM_PALETTE_NAME =
    PALETTE_KEYS[(PALETTE_KEYS.length * Math.random()) << 0]
  const PALETTE = !RANDOM_PALETTE
    ? PALETTES[PALETTE_NAME]
    : PALETTES[RANDOM_PALETTE_NAME]
  if (RANDOM_PALETTE) {
    console.log('Palette name: ', RANDOM_PALETTE_NAME)
  }

  colorMode(HSL)
  COLORS = PALETTE['colors'].map((col) => color(col))
  BG = color(PALETTE.bg)

  /* Sketch-specific setup */
  strokeWeight(STROKE_WEIGHT)
  FILL = random(COLORS)
  HAS_STROKE ? stroke(FILL) : noStroke()

  mic = new p5.AudioIn()
  mic.start()
}

function draw() {
  /* Move coordinate system to center of canvas for easier trigonometry */

  const x = (noise(frameCount / 1000) * 1000) % width
  const y = (noise(0, frameCount / 1000) * 1000) % height

  translate(x, y)

  /* Home-made helper function to select background based on config */
  drawBackground()

  const meanRadius =
    MEAN_RADIUS * noise(frameCount / 100) * 5 * (mic.getLevel() + 0.5)

  /* Because layers are drawn in sequence, draw large layers on bottom first */
  for (let i = LAYER_COUNT; i > 0; i--) {
    drawLayer((meanRadius / LAYER_COUNT) * i, i)
  }
}

function drawBackground() {
  if (INVERTED_GRADIENT) {
    CAP_LIGHTNESS ? background('#ffffff05') : background(255)
  } else if (USE_FILL_AS_BACKGROUND) {
    background(FILL)
  } else if (USE_PALETTE_BACKGROUND) {
    background(BG)
  } else {
    background(0)
  }
}

function drawLayer(r, i) {
  /* A number from 0 to 1, where the middle layer would have 0.5 */
  const layerColorFactor = INVERTED_GRADIENT
    ? i / LAYER_COUNT
    : 1 - i / LAYER_COUNT

  const animatedFill = color(
    (hue(FILL) + frameCount) % 360,
    saturation(FILL),
    lightness(FILL)
  )

  /* Adjust saturation and lightness based on the layer factor */
  const fillColor = color(
    hue(animatedFill),
    layerColorFactor * saturation(animatedFill),
    layerColorFactor * (CAP_LIGHTNESS ? lightness(animatedFill) : 100)
  )
  HAS_STROKE ? stroke(animatedFill) : noStroke()
  fill(fillColor)

  const animatedNoiseMultiplier = NOISE_MULTIPLIER

  /* Iterate through a full circle of angles to make a layer */
  beginShape()
  for (let a = 0; a < TWO_PI; a += TWO_PI / POINT_COUNT) {
    /* Maybe overcomplicated way of getting x and y coordinate in noise field */
    const xOff = SYMMETRICAL_Y
      ? cos(a)
      : map(i * cos(a) + 1, -1, 1, 1, 1 + animatedNoiseMultiplier)
    const yOff = SYMMETRICAL_X
      ? sin(a)
      : map(i * sin(a) + 1, -1, 1, 1, 1 + animatedNoiseMultiplier)

    /* Get noise based on x, y, and the "time" */
    const noised = noise(xOff, yOff, frameCount * NOISE_SPEED)

    /* Compute the final x and y and set a vertex there for the shape */
    const x = noised * r * cos(a + frameCount * ROTATION_SPEED)
    const y = noised * r * sin(a + frameCount * ROTATION_SPEED)
    vertex(x, y)
  }
  endShape(CLOSE)
}

function clickOnSave() {
  saveCanvas()
}

window['draw'] = draw
window['setup'] = setup
